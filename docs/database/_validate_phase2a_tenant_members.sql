-- =============================================================================
-- FleetOS Phase 2A.2 — tenant_members validation (run in Supabase SQL Editor)
-- =============================================================================
-- Prerequisites: 20260528150000_phase2a_tenant_members_foundation.sql applied
-- =============================================================================

-- 1) Table exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'tenant_members'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS tenant_members_table;

-- 2) Expected columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenant_members'
ORDER BY ordinal_position;

-- 3) CHECK constraints (canonical role + status)
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'tenant_members'
  AND con.contype = 'c'
ORDER BY con.conname;

-- 4) Indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tenant_members'
ORDER BY indexname;

-- 5) RLS enabled
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
WHERE nsp.nspname = 'public'
  AND c.relname = 'tenant_members';

-- 6) Deny-by-default: no permissive policies on tenant_members (2A.2)
SELECT
  COUNT(*) AS policy_count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS deny_by_default
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenant_members';

-- 7) No triggers on tenant_members (2A.2 — sync triggers deferred to 2A.5)
SELECT
  COUNT(*) AS trigger_count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS no_triggers_yet
FROM pg_trigger tg
JOIN pg_class rel ON rel.oid = tg.tgrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'tenant_members'
  AND NOT tg.tgisinternal;

-- 8) updated_at column exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tenant_members'
        AND column_name = 'updated_at'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS updated_at_column;

-- 9) Legacy tenant_users unchanged (table still exists; sample constraint intact)
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'tenant_users'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS tenant_users_still_exists;

SELECT
  con.conname,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'tenant_users'
  AND con.conname = 'tenant_users_role_check';

-- 10) Helpers still reference tenant_users (function body contains tenant_users)
SELECT
  p.proname AS function_name,
  CASE
    WHEN pg_get_functiondef(p.oid) ILIKE '%tenant_users%' THEN 'PASS'
    ELSE 'WARN'
  END AS still_uses_tenant_users
FROM pg_proc p
JOIN pg_namespace nsp ON nsp.oid = p.pronamespace
WHERE nsp.nspname = 'public'
  AND p.proname IN (
    'my_tenant_ids',
    'is_tenant_user',
    'is_tenant_admin'
  )
ORDER BY p.proname;

-- 11) Phase 7 policies on tenant_users still present (unchanged)
SELECT
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenant_users'
ORDER BY policyname;

-- 12) Row counts (informational)
SELECT 'tenant_members' AS rel, COUNT(*) AS n FROM public.tenant_members
UNION ALL
SELECT 'tenant_users', COUNT(*) FROM public.tenant_users;

-- 13) Optional insert smoke test (service_role / SQL Editor as superuser only)
-- INSERT INTO public.tenant_members (tenant_id, codevertex_user_id, role, status)
-- SELECT t.id, gen_random_uuid(), 'viewer', 'active'
-- FROM public.tenants t
-- LIMIT 1
-- ON CONFLICT DO NOTHING;
-- DELETE FROM public.tenant_members WHERE status = 'active' AND role = 'viewer';
