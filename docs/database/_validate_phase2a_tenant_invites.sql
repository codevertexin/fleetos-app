-- =============================================================================
-- FleetOS Phase 2A.4 — tenant_invites validation (Supabase SQL Editor)
-- =============================================================================
-- Prerequisites: 20260528170000_phase2a_tenant_invites_foundation.sql applied
-- =============================================================================

-- 1) Table exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'tenant_invites'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS tenant_invites_table;

-- 2) Columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenant_invites'
ORDER BY ordinal_position;

-- 3) CHECK constraints
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'tenant_invites'
  AND con.contype = 'c'
ORDER BY con.conname;

-- 4) Foreign keys
SELECT
  con.conname,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'tenant_invites'
  AND con.contype = 'f'
ORDER BY con.conname;

-- 5) Indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tenant_invites'
ORDER BY indexname;

-- 6) RLS enabled, deny-by-default (no policies)
SELECT
  c.relrowsecurity AS rls_enabled,
  CASE WHEN c.relrowsecurity = true THEN 'PASS' ELSE 'FAIL' END AS rls_on
FROM pg_class c
JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
WHERE nsp.nspname = 'public'
  AND c.relname = 'tenant_invites';

SELECT
  COUNT(*) AS policy_count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS deny_by_default
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenant_invites';

-- 7) No user triggers
SELECT
  COUNT(*) AS trigger_count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS no_triggers
FROM pg_trigger tg
JOIN pg_class rel ON rel.oid = tg.tgrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'tenant_invites'
  AND NOT tg.tgisinternal;

-- 8) intended_role allows canonical set only (no customer)
SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'tenant_invites'
        AND con.conname = 'tenant_invites_intended_role_check'
        AND pg_get_constraintdef(con.oid) LIKE '%customer%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS no_customer_role_in_check;

-- 9) Status model columns present
SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_invites' AND column_name = 'accepted_by_member_id'
  ) THEN 'PASS' ELSE 'FAIL' END AS accepted_by_member_id_col,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_invites' AND column_name = 'metadata'
  ) THEN 'PASS' ELSE 'FAIL' END AS metadata_col,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_invites' AND column_name = 'invite_token_hash'
  ) THEN 'PASS' ELSE 'FAIL' END AS invite_token_hash_col;

-- 10) Row count (informational — expect 0 until runtime)
SELECT COUNT(*) AS tenant_invites_rows FROM public.tenant_invites;

-- 11) Unchanged tables / objects
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
  )
UNION ALL
SELECT
  'fleetos_role_map',
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fleetos_role_map'
  );

-- 12) Phase 7 policies on tenant_users unchanged (count >= 1)
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenant_users'
ORDER BY policyname;

-- 13) Helpers still use tenant_users (not tenant_invites)
SELECT
  p.proname,
  CASE WHEN pg_get_functiondef(p.oid) ILIKE '%tenant_invites%' THEN 'FAIL' ELSE 'PASS' END AS no_invites_in_helpers
FROM pg_proc p
JOIN pg_namespace nsp ON nsp.oid = p.pronamespace
WHERE nsp.nspname = 'public'
  AND p.proname IN ('my_tenant_ids', 'is_tenant_user', 'is_tenant_admin')
ORDER BY p.proname;

-- 14) Optional: insert smoke test (service_role / superuser only)
-- INSERT INTO public.tenant_invites (
--   tenant_id, email, intended_role, invite_token_hash, expires_at
-- )
-- SELECT
--   t.id,
--   'invite-test@example.com',
--   'viewer',
--   encode(sha256('test-token'::bytea), 'hex'),
--   now() + interval '7 days'
-- FROM public.tenants t
-- LIMIT 1;
-- DELETE FROM public.tenant_invites WHERE email = 'invite-test@example.com';
