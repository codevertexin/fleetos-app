-- =============================================================================
-- FleetOS Phase 2A.2 — tenant_members foundation (additive only)
-- =============================================================================
-- @see docs/architecture/FLEETOS_PHASE2A_MEMBERSHIP_PLAN.md (step 2A.2)
--
-- Creates canonical operational membership table alongside legacy tenant_users.
--
-- Does NOT:
--   - alter tenant_users, Edge Functions, Phase 7 RLS (fleetos_p7_*), or SQL helpers
--   - create triggers, tenant_invites, tenant_customers, or sync from tenant_users
--
-- RLS: enabled with no permissive policies → deny-by-default for authenticated/anon.
--       service_role (Edge, migrations) bypasses RLS as usual in Supabase.
--
-- Rollback (manual, if needed before data depends on this table):
--   DROP TABLE IF EXISTS public.tenant_members CASCADE;
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  codevertex_user_id uuid NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  role text NOT NULL,
  legacy_role text,
  status text NOT NULL DEFAULT 'active',
  permissions jsonb,
  invited_by_member_id uuid REFERENCES public.tenant_members(id) ON DELETE SET NULL,
  invite_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  CONSTRAINT tenant_members_role_check CHECK (
    role IN (
      'owner',
      'admin',
      'manager',
      'dispatcher',
      'driver',
      'mechanic',
      'viewer'
    )
  ),
  CONSTRAINT tenant_members_status_check CHECK (
    status IN (
      'invited',
      'pending',
      'active',
      'suspended',
      'removed'
    )
  )
);

COMMENT ON TABLE public.tenant_members IS
  'Canonical tenant operational membership (Phase 2A). Legacy writes remain on tenant_users until compat sync (2A.5+) and Edge switch (2B).';

COMMENT ON COLUMN public.tenant_members.role IS
  'Canonical RBAC role (owner, admin, manager, dispatcher, driver, mechanic, viewer).';

COMMENT ON COLUMN public.tenant_members.legacy_role IS
  'Optional audit copy of pre-canonical role (e.g. tenant_admin) during transition.';

COMMENT ON COLUMN public.tenant_members.status IS
  'Membership lifecycle: invited, pending, active, suspended, removed.';

COMMENT ON COLUMN public.tenant_members.invite_id IS
  'Reserved for tenant_invites FK (Phase 2A.4+). No FK until invites table exists.';

COMMENT ON COLUMN public.tenant_members.is_active IS
  'Compat mirror flag; prefer status. May be dropped in Phase 2C.';

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS tenant_members_tenant_cv_user_active_uidx
  ON public.tenant_members (tenant_id, codevertex_user_id)
  WHERE status <> 'removed';

CREATE INDEX IF NOT EXISTS tenant_members_tenant_id_idx
  ON public.tenant_members (tenant_id);

CREATE INDEX IF NOT EXISTS tenant_members_codevertex_user_id_idx
  ON public.tenant_members (codevertex_user_id);

CREATE INDEX IF NOT EXISTS tenant_members_profile_id_idx
  ON public.tenant_members (profile_id)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tenant_members_status_idx
  ON public.tenant_members (tenant_id, status);

-- ---------------------------------------------------------------------------
-- 3. RLS — deny-by-default (no permissive policies in 2A.2)
-- ---------------------------------------------------------------------------
-- updated_at column is present; callers/service_role must set it on UPDATE until
-- a dedicated trigger is added in a later phase (no triggers in 2A.2).
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Explicit revoke: default Supabase grants must not allow anon/authenticated
-- access before future fleetos_p* policies are added.
REVOKE ALL ON TABLE public.tenant_members FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenant_members TO service_role;

COMMIT;
