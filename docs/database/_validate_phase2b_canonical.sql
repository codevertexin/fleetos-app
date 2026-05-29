-- =============================================================================
-- FleetOS Phase 2B — Canonical membership cut validation
-- =============================================================================
-- Prerequisites:
--   - 20260528200000_phase2b_membership_canonical.sql applied
--   - 2A.2 tenant_members, 2A.3 fleetos_role_map (recommended)
--
-- Run in Supabase SQL Editor on FleetOS project (e.g. kjiwzqysjassakvrojun).
-- Edge B.4 not validated here — manual SSO smoke after Edge deploy.
-- =============================================================================

-- 1) tenant_users must not exist
SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'tenant_users'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS tenant_users_dropped;

-- 2) tenant_members exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'tenant_members'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS tenant_members_exists;

-- 3) RLS enabled on tenant_members
SELECT
  c.relname,
  c.relrowsecurity AS rls_enabled,
  CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL' END AS status
FROM pg_class c
JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
WHERE nsp.nspname = 'public'
  AND c.relname = 'tenant_members';

-- 4) Phase 2B own-select policy on tenant_members
SELECT
  policyname,
  cmd,
  roles,
  CASE
    WHEN policyname = 'fleetos_p7_authenticated_select_own_tenant_members'
      AND cmd = 'SELECT'
    THEN 'PASS'
    ELSE 'CHECK'
  END AS policy_ok
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenant_members'
ORDER BY policyname;

SELECT
  COUNT(*) AS tenant_members_policy_count,
  CASE
    WHEN COUNT(*) FILTER (
      WHERE policyname = 'fleetos_p7_authenticated_select_own_tenant_members'
    ) = 1
    THEN 'PASS'
    ELSE 'FAIL'
  END AS own_select_policy
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenant_members';

-- 5) No policies on dropped tenant_users
SELECT
  COUNT(*) AS tenant_users_policies,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS no_tenant_users_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenant_users';

-- 6) Helpers reference tenant_members (not tenant_users)
SELECT
  p.proname AS function_name,
  CASE
    WHEN pg_get_functiondef(p.oid) ILIKE '%tenant_members%' THEN 'PASS'
    ELSE 'FAIL'
  END AS uses_tenant_members,
  CASE
    WHEN pg_get_functiondef(p.oid) ILIKE '%tenant_users%' THEN 'FAIL'
    ELSE 'PASS'
  END AS no_tenant_users_in_body
FROM pg_proc p
JOIN pg_namespace nsp ON nsp.oid = p.pronamespace
WHERE nsp.nspname = 'public'
  AND p.proname IN (
    'my_tenant_ids',
    'is_tenant_user',
    'is_tenant_admin'
  )
ORDER BY p.proname;

-- 7) is_tenant_admin uses canonical owner/admin (not legacy roles)
SELECT
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%''owner''%'
      AND pg_get_functiondef(p.oid) LIKE '%''admin''%'
      AND pg_get_functiondef(p.oid) NOT ILIKE '%tenant_admin%'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS is_tenant_admin_canonical
FROM pg_proc p
JOIN pg_namespace nsp ON nsp.oid = p.prnamespace
WHERE nsp.nspname = 'public'
  AND p.proname = 'is_tenant_admin';

-- 8) fleetos_role_map seed (reference data for future Edge B.4)
SELECT
  COUNT(*) AS role_map_rows,
  CASE WHEN COUNT(*) = 8 THEN 'PASS' ELSE 'WARN' END AS role_map_seed
FROM public.fleetos_role_map;

-- 9) Phase 7 operational policies unchanged (exclude tenant_members / tenant_users)
SELECT
  COUNT(*) AS fleetos_p7_operational_policies,
  CASE WHEN COUNT(*) >= 12 THEN 'PASS' ELSE 'WARN' END AS operational_policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'fleetos_p7_%'
  AND tablename NOT IN ('tenant_members', 'tenant_users');

-- 10) List all fleetos_p7 policies (audit)
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'fleetos_p7_%'
ORDER BY tablename, policyname;

-- 11) Optional invite_id FK on tenant_members
SELECT
  con.conname,
  pg_get_constraintdef(con.oid) AS definition,
  CASE WHEN con.conname = 'tenant_members_invite_id_fkey' THEN 'PASS' ELSE 'INFO' END AS status
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'tenant_members'
  AND con.contype = 'f'
  AND con.conname = 'tenant_members_invite_id_fkey';

-- 12) Membership row counts (informational)
SELECT 'tenant_members' AS rel, COUNT(*) AS n FROM public.tenant_members
UNION ALL
SELECT 'tenant_invites', COUNT(*) FROM public.tenant_invites
UNION ALL
SELECT 'tenants', COUNT(*) FROM public.tenants;

-- 13) current_codevertex_user_id unchanged (still exists)
SELECT
  CASE
    WHEN to_regprocedure('public.current_codevertex_user_id()') IS NOT NULL THEN 'PASS'
    ELSE 'FAIL'
  END AS current_codevertex_user_id_exists;

-- =============================================================================
-- 14) Post Edge B.4 deploy — manual checks (not SQL-automated)
-- =============================================================================
-- After deploying fleetos-sync-identity + fleetos-list-tenants:
--   1) SSO login with active FLEETOS membership
--   2) Confirm row in tenant_members: status=active, role=canonical, legacy_role set if JWT legacy
--   3) SELECT role, legacy_role, status FROM tenant_members ORDER BY updated_at DESC LIMIT 5;
--   4) TenantProvider lists tenant(s) without Edge 500 / missing relation tenant_users
-- Edge source must not reference public.tenant_users (grep deployed bundle).
