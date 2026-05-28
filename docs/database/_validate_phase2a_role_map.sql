-- =============================================================================
-- FleetOS Phase 2A.3 — fleetos_role_map validation (Supabase SQL Editor)
-- =============================================================================
-- Prerequisites: 20260528160000_phase2a_role_map_foundation.sql applied
-- =============================================================================

-- 1) Table exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'fleetos_role_map'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS fleetos_role_map_table;

-- 2) Columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fleetos_role_map'
ORDER BY ordinal_position;

-- 3) CHECK constraints
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'fleetos_role_map'
  AND con.contype = 'c'
ORDER BY con.conname;

-- 4) Indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'fleetos_role_map'
ORDER BY indexname;

-- 5) RLS not enabled (2A.3 — reference table)
SELECT
  c.relrowsecurity AS rls_enabled,
  CASE WHEN c.relrowsecurity = false THEN 'PASS' ELSE 'WARN' END AS expected_no_rls
FROM pg_class c
JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
WHERE nsp.nspname = 'public'
  AND c.relname = 'fleetos_role_map';

-- 6) Expected seed rows (8 legacy mappings)
SELECT legacy_role, canonical_role, notes
FROM public.fleetos_role_map
ORDER BY legacy_role;

SELECT
  COUNT(*) AS row_count,
  CASE WHEN COUNT(*) = 8 THEN 'PASS' ELSE 'FAIL' END AS seed_count
FROM public.fleetos_role_map;

-- 7) Expected mappings
SELECT
  legacy_role,
  canonical_role,
  CASE
    WHEN legacy_role = 'tenant_admin' AND canonical_role = 'admin' THEN 'PASS'
    WHEN legacy_role = 'fleet_manager' AND canonical_role = 'manager' THEN 'PASS'
    WHEN legacy_role = 'operations' AND canonical_role = 'manager' THEN 'PASS'
    WHEN legacy_role = 'dispatcher' AND canonical_role = 'dispatcher' THEN 'PASS'
    WHEN legacy_role = 'finance' AND canonical_role = 'manager' THEN 'PASS'
    WHEN legacy_role = 'driver' AND canonical_role = 'driver' THEN 'PASS'
    WHEN legacy_role = 'owner' AND canonical_role = 'owner' THEN 'PASS'
    WHEN legacy_role = 'viewer' AND canonical_role = 'viewer' THEN 'PASS'
    ELSE 'FAIL'
  END AS mapping_ok
FROM public.fleetos_role_map
ORDER BY legacy_role;

-- 8) finance transitional note documented
SELECT
  CASE
    WHEN notes ILIKE '%TRANSITIONAL%' THEN 'PASS'
    ELSE 'FAIL'
  END AS finance_transitional_note
FROM public.fleetos_role_map
WHERE legacy_role = 'finance';

-- 9) mechanic has no legacy mapping row
SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.fleetos_role_map WHERE legacy_role = 'mechanic'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS mechanic_not_in_legacy_map;

-- 10) customer not in map (tenant_customers out of scope)
SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM public.fleetos_role_map
      WHERE legacy_role = 'customer' OR canonical_role = 'customer'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS customer_out_of_scope;

-- 11) tenant_users / tenant_members tables untouched (still exist)
SELECT
  'tenant_users' AS rel,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_users'
  ) AS exists
UNION ALL
SELECT
  'tenant_members',
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_members'
  );

-- 12) Legacy CHECK on tenant_users unchanged
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'tenant_users'
  AND con.conname = 'tenant_users_role_check';

-- 13) Helpers unchanged (still reference tenant_users only)
SELECT p.proname,
  CASE WHEN pg_get_functiondef(p.oid) ILIKE '%tenant_users%' THEN 'PASS' ELSE 'WARN' END AS uses_tenant_users,
  CASE WHEN pg_get_functiondef(p.oid) ILIKE '%fleetos_role_map%' THEN 'FAIL' ELSE 'PASS' END AS no_role_map_in_helpers
FROM pg_proc p
JOIN pg_namespace nsp ON nsp.oid = p.pronamespace
WHERE nsp.nspname = 'public'
  AND p.proname IN ('my_tenant_ids', 'is_tenant_user', 'is_tenant_admin', 'current_codevertex_user_id')
ORDER BY p.proname;
