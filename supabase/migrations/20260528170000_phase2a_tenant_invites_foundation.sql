-- =============================================================================
-- FleetOS Phase 2A.4 — tenant_invites foundation (additive only)
-- =============================================================================
-- @see docs/architecture/FLEETOS_PHASE2A_MEMBERSHIP_PLAN.md (step 2A.4)
-- @see docs/architecture/FLEETOS_MEMBERSHIP_LIFECYCLE.md
-- @see docs/architecture/FLEETOS_AUTH_IMPLEMENTATION_PLAN.md
--
-- Internal operational member invites only (not customers).
-- No email delivery, accept flow, Edge, or runtime wiring in this migration.
--
-- Does NOT alter tenant_users, tenant_members (schema), helpers, fleetos_p7_*,
-- or existing RLS policies on other tables.
--
-- Rollback (manual):
--   DROP TABLE IF EXISTS public.tenant_invites CASCADE;
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  intended_role text NOT NULL,
  invite_token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  invited_by_member_id uuid REFERENCES public.tenant_members(id) ON DELETE SET NULL,
  accepted_by_member_id uuid REFERENCES public.tenant_members(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_invites_email_not_blank CHECK (
    length(trim(email)) > 0
  ),
  CONSTRAINT tenant_invites_intended_role_check CHECK (
    intended_role IN (
      'owner',
      'admin',
      'manager',
      'dispatcher',
      'driver',
      'mechanic',
      'viewer'
    )
  ),
  CONSTRAINT tenant_invites_status_check CHECK (
    status IN (
      'pending',
      'accepted',
      'expired',
      'cancelled',
      'revoked'
    )
  ),
  CONSTRAINT tenant_invites_token_hash_not_blank CHECK (
    length(trim(invite_token_hash)) > 0
  ),
  CONSTRAINT tenant_invites_accepted_fields_check CHECK (
  (
    status = 'accepted'
    AND accepted_at IS NOT NULL
  )
  OR (status <> 'accepted')
  )
);

COMMENT ON TABLE public.tenant_invites IS
  'Pending and historical invites for internal tenant members (Phase 2A). Customer invites out of scope.';

COMMENT ON COLUMN public.tenant_invites.email IS
  'Invitee email (normalize to lower case in application layer before insert).';

COMMENT ON COLUMN public.tenant_invites.invite_token_hash IS
  'Hash of invite token only — never store raw token in the database.';

COMMENT ON COLUMN public.tenant_invites.intended_role IS
  'Canonical role assigned on accept (owner, admin, manager, dispatcher, driver, mechanic, viewer).';

COMMENT ON COLUMN public.tenant_invites.status IS
  'Lifecycle: pending, accepted, expired, cancelled, revoked.';

COMMENT ON COLUMN public.tenant_invites.invited_by_member_id IS
  'tenant_members.id of the inviter (nullable if system-generated).';

COMMENT ON COLUMN public.tenant_invites.accepted_by_member_id IS
  'tenant_members.id created or activated when invite is accepted (future runtime).';

COMMENT ON COLUMN public.tenant_invites.metadata IS
  'Optional audit/context (e.g. source, locale). No PII beyond email.';

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS tenant_invites_tenant_id_idx
  ON public.tenant_invites (tenant_id);

CREATE INDEX IF NOT EXISTS tenant_invites_tenant_email_idx
  ON public.tenant_invites (tenant_id, lower(trim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS tenant_invites_tenant_email_pending_uidx
  ON public.tenant_invites (tenant_id, lower(trim(email)))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS tenant_invites_token_hash_pending_idx
  ON public.tenant_invites (invite_token_hash)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS tenant_invites_status_idx
  ON public.tenant_invites (tenant_id, status);

CREATE INDEX IF NOT EXISTS tenant_invites_expires_at_idx
  ON public.tenant_invites (expires_at)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 3. RLS — deny-by-default (no permissive policies in 2A.4)
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.tenant_invites FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenant_invites TO service_role;

COMMIT;
