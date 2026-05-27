-- =============================================================================
-- FleetOS Phase 7 — Read-only remote validation (dev Supabase SQL Editor)
-- =============================================================================
-- Does NOT modify schema. Run whole script; inspect result rows.
-- Project ref (from repo): kjiwzqysjassakvrojun
-- =============================================================================

-- --- 1) Helper functions (public, expected signatures) ---
SELECT '1_functions' AS section,
       'current_codevertex_user_id()' AS object,
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname = 'current_codevertex_user_id'
             AND p.pronargs = 0
         ) THEN 'PASS'
         ELSE 'BLOCKER'
       END AS status
UNION ALL
SELECT '1_functions', 'my_tenant_ids()',
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname = 'my_tenant_ids'
             AND p.pronargs = 0
         ) THEN 'PASS'
         ELSE 'BLOCKER'
       END
UNION ALL
SELECT '1_functions', 'is_tenant_user(uuid)',
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname = 'is_tenant_user'
             AND p.pronargs = 1
             AND oidvectortypes(p.proargtypes) = 'uuid'
         ) THEN 'PASS'
         ELSE 'BLOCKER'
       END
UNION ALL
SELECT '1_functions', 'is_tenant_admin(uuid)',
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname = 'is_tenant_admin'
             AND p.pronargs = 1
             AND oidvectortypes(p.proargtypes) = 'uuid'
         ) THEN 'PASS'
         ELSE 'BLOCKER'
       END;

-- --- 2) Tenant tables exist ---
SELECT '2_tenant_tables' AS section,
       v.tablename AS object,
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM pg_tables t
           WHERE t.schemaname = 'public'
             AND t.tablename::text = v.tablename::text
         ) THEN 'PASS'
         ELSE 'BLOCKER'
       END AS status
FROM (
  VALUES
    ('tenants'),
    ('tenant_settings'),
    ('tenant_domains'),
    ('tenant_users')
) AS v(tablename)
ORDER BY v.tablename;

-- --- 3) Operational tables: tenant_id column ---
-- PASS iff a row exists in information_schema.columns for public.<table>.tenant_id.
-- (Avoid LEFT JOIN to information_schema — sql_identifier vs text matching can fail in some clients.)
--
-- DEBUG (optional — run alone to inspect):
-- SELECT table_schema, table_name, column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND column_name = 'tenant_id'
-- ORDER BY table_name;
--
SELECT '3_tenant_id_columns' AS section,
       exp.expected_table AS object,
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM information_schema.columns c
           WHERE c.table_schema = 'public'
             AND c.table_name::text = exp.expected_table
             AND c.column_name = 'tenant_id'
         ) THEN 'PASS'
         ELSE 'BLOCKER'
       END AS status
FROM (
  VALUES
    ('companies'),
    ('vehicles'),
    ('drivers'),
    ('owners'),
    ('booking_requests'),
    ('assignments'),
    ('documents'),
    ('expenses'),
    ('incomes'),
    ('payouts'),
    ('rental_contracts'),
    ('driver_contracts')
) AS exp(expected_table)
ORDER BY exp.expected_table;

-- --- 4) Policy name conflicts (fleetos_p7_ prefix or exact Phase 7 names) ---
SELECT '4_policy_conflicts' AS section,
       pol.schemaname || '.' || pol.tablename || ' → ' || pol.policyname AS object,
       'WARNING: policy already exists (migration uses DROP IF EXISTS + CREATE)' AS status
FROM pg_policies pol
WHERE pol.schemaname = 'public'
  AND (
    pol.policyname LIKE 'fleetos_p7\_%' ESCAPE '\'
    OR pol.policyname IN (
      'fleetos_p7_authenticated_select_tenants',
      'fleetos_p7_authenticated_select_tenant_settings',
      'fleetos_p7_authenticated_update_tenant_settings',
      'fleetos_p7_authenticated_select_tenant_domains',
      'fleetos_p7_authenticated_select_own_tenant_users',
      'fleetos_p7_authenticated_select_companies',
      'fleetos_p7_authenticated_select_vehicles',
      'fleetos_p7_authenticated_select_drivers',
      'fleetos_p7_authenticated_select_owners',
      'fleetos_p7_authenticated_select_booking_requests',
      'fleetos_p7_authenticated_select_assignments',
      'fleetos_p7_authenticated_select_documents',
      'fleetos_p7_authenticated_select_expenses',
      'fleetos_p7_authenticated_select_incomes',
      'fleetos_p7_authenticated_select_payouts',
      'fleetos_p7_authenticated_select_rental_contracts',
      'fleetos_p7_authenticated_select_driver_contracts'
    )
  )
ORDER BY pol.tablename, pol.policyname;

-- If the above returns **zero rows**, there is no naming conflict yet (PASS).

-- --- 5) RLS enabled flag (current state before Phase 7 apply) ---
SELECT '5_rls_status' AS section,
       c.relname AS object,
       CASE
         WHEN c.relname IN ('tenants', 'tenant_settings', 'tenant_domains', 'tenant_users')
           AND c.relrowsecurity = false THEN 'PASS (tenant tables: RLS off as expected pre-Phase7)'
         WHEN c.relname IN ('tenants', 'tenant_settings', 'tenant_domains', 'tenant_users')
           AND c.relrowsecurity = true THEN 'WARNING (tenant tables already RLS on — review)'
         WHEN c.relname NOT IN ('tenants', 'tenant_settings', 'tenant_domains', 'tenant_users')
           AND c.relrowsecurity = true THEN 'PASS (operational: RLS on)'
         WHEN c.relname NOT IN ('tenants', 'tenant_settings', 'tenant_domains', 'tenant_users')
           AND c.relrowsecurity = false THEN 'WARNING (operational: RLS off — unexpected vs Phase3 docs)'
       END AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'tenants', 'tenant_settings', 'tenant_domains', 'tenant_users',
    'companies', 'vehicles', 'drivers', 'owners', 'booking_requests',
    'assignments', 'documents', 'expenses', 'incomes', 'payouts',
    'rental_contracts', 'driver_contracts'
  )
ORDER BY
  CASE WHEN c.relname IN ('tenants', 'tenant_settings', 'tenant_domains', 'tenant_users') THEN 0 ELSE 1 END,
  c.relname;

-- --- 6) Phase 7 fleetos_p7_* policies must not target anon (expect 0 rows before apply) ---
-- Note: legacy anon policies (e.g. public booking) are NOT fleetos_p7_* — see section 8.
SELECT '6_anon_policies_fleetos_p7' AS section,
       pol.tablename || ' → ' || pol.policyname AS object,
       'BLOCKER' AS status
FROM pg_policies pol
WHERE pol.schemaname = 'public'
  AND pol.policyname LIKE 'fleetos_p7\_%' ESCAPE '\'
  AND 'anon'::name = ANY (pol.roles);

-- --- 7) Broad writes on fleetos_p7 policies (post-apply; expect only UPDATE on tenant_settings) ---
SELECT '7_write_policies_fleetos_p7' AS section,
       pol.tablename || ' → ' || pol.policyname || ' (' || pol.cmd::text || ')' AS object,
       CASE
         WHEN pol.cmd = 'UPDATE' AND pol.tablename = 'tenant_settings' THEN 'PASS'
         WHEN pol.cmd = 'SELECT' THEN 'PASS'
         WHEN pol.cmd IN ('INSERT', 'DELETE') THEN 'BLOCKER'
         WHEN pol.cmd = 'UPDATE' AND pol.tablename <> 'tenant_settings' THEN 'BLOCKER'
         ELSE 'WARNING'
       END AS status
FROM pg_policies pol
WHERE pol.schemaname = 'public'
  AND pol.policyname LIKE 'fleetos_p7\_%' ESCAPE '\'
ORDER BY pol.tablename, pol.policyname;

-- --- 8) Legacy public-booking anon policies (inspect qual / with_check; read-only) ---
-- Expected on FleetOS for /book/:companySlug — not created or modified by Phase 7.
SELECT '8_public_booking_policies' AS section,
       pol.tablename || ' → ' || pol.policyname AS object,
       pol.cmd AS command,
       pol.roles::text AS roles,
       pol.qual AS using_expression,
       pol.with_check AS with_check_expression
FROM pg_policies pol
WHERE pol.schemaname = 'public'
  AND pol.policyname IN (
    'companies_public_booking_select',
    'booking_requests_public_insert'
  )
ORDER BY pol.tablename, pol.policyname;

-- Safety heuristics (manual review of section 8 output):
-- companies_public_booking_select: ACCEPT if USING is not bare "true" and scopes to
--   booking-enabled / slug / tenant_settings — not all companies.
-- booking_requests_public_insert: ACCEPT if WITH CHECK ties company_id to allowed company
--   and does not allow arbitrary tenant_id; rely on booking_requests_validate trigger.
