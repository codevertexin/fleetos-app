-- =============================================================================
-- FleetOS Phase 2B — Canonical membership cut (B.1 + B.2 + B.3)
-- =============================================================================
-- @see docs/architecture/FLEETOS_PHASE2B_CANONICAL_CUT_PLAN.md
--
-- B.1  DROP legacy public.tenant_users (when empty)
-- B.2  Point helpers at public.tenant_members (canonical roles + status)
-- B.3  fleetos_p7 SELECT policy on tenant_members; remove tenant_users policy
--
-- Prerequisites (apply before this migration):
--   - 20260524140000_phase3_tenant_layer.sql
--   - 20260528140000_phase7_tenant_rls_foundation.sql
--   - 20260528150000_phase2a_tenant_members_foundation.sql
--   - 20260528160000_phase2a_role_map_foundation.sql (recommended)
--   - 20260528170000_phase2a_tenant_invites_foundation.sql (optional FK)
--
-- Does NOT change Edge Functions, frontend, company-scoped RLS, or tenant_customers.
--
-- CRITICAL: Apply DB migration BEFORE deploying Edge B.4 (still writes tenant_users).
--
-- Rollback (manual, heavy): re-create tenant_users from Phase 3 migration excerpt;
--   revert helpers and policies from git history.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- B.0 — Gate: refuse DROP if tenant_users has operational rows
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_tenant_users_count bigint;
BEGIN
  IF to_regclass('public.tenant_users') IS NULL THEN
    RAISE NOTICE 'Phase 2B: tenant_users already absent — skipping row gate.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_tenant_users_count FROM public.tenant_users;

  IF v_tenant_users_count > 0 THEN
    RAISE EXCEPTION
      'Phase 2B aborted: public.tenant_users has % row(s). Migrate to tenant_members via fleetos_role_map before applying this migration.',
      v_tenant_users_count;
  END IF;

  RAISE NOTICE 'Phase 2B gate: tenant_users count = 0 — proceeding with canonical cut.';
END;
$$;

-- ---------------------------------------------------------------------------
-- B.1 (partial) — Optional FK tenant_members.invite_id → tenant_invites
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.tenant_invites') IS NULL THEN
    RAISE NOTICE 'Phase 2B: tenant_invites not found — skipping invite_id FK.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_members_invite_id_fkey'
      AND conrelid = 'public.tenant_members'::regclass
  ) THEN
    ALTER TABLE public.tenant_members
      ADD CONSTRAINT tenant_members_invite_id_fkey
      FOREIGN KEY (invite_id) REFERENCES public.tenant_invites(id) ON DELETE SET NULL;
    RAISE NOTICE 'Phase 2B: added tenant_members_invite_id_fkey.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- B.2 — Helpers read public.tenant_members (canonical membership)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.my_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.tenant_id
  FROM public.tenant_members tm
  WHERE tm.codevertex_user_id = public.current_codevertex_user_id()
    AND tm.status = 'active'
$$;

COMMENT ON FUNCTION public.my_tenant_ids() IS
  'Tenant ids for active canonical memberships (Phase 2B — tenant_members).';

CREATE OR REPLACE FUNCTION public.is_tenant_user(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.codevertex_user_id = public.current_codevertex_user_id()
      AND tm.status = 'active'
  )
$$;

COMMENT ON FUNCTION public.is_tenant_user(uuid) IS
  'True when the current user has an active membership in the tenant (Phase 2B).';

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.codevertex_user_id = public.current_codevertex_user_id()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  )
$$;

COMMENT ON FUNCTION public.is_tenant_admin(p_tenant_id uuid) IS
  'True for active owner/admin canonical roles (Phase 2B — replaces tenant_admin/fleet_manager).';

-- ---------------------------------------------------------------------------
-- B.3 — RLS: own membership rows on tenant_members
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_own_tenant_members ON public.tenant_members;

CREATE POLICY fleetos_p7_authenticated_select_own_tenant_members
  ON public.tenant_members
  FOR SELECT
  TO authenticated
  USING (
    codevertex_user_id = public.current_codevertex_user_id()
    AND status IN ('active', 'pending')
  );

-- Policy is useless without SELECT grant (2A.2 revoked authenticated access).
GRANT SELECT ON TABLE public.tenant_members TO authenticated;

-- ---------------------------------------------------------------------------
-- B.1 — Remove legacy tenant_users table
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_own_tenant_users ON public.tenant_users;

DROP TABLE IF EXISTS public.tenant_users;

COMMIT;
