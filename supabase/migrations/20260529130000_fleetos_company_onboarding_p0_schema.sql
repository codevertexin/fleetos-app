-- =============================================================================
-- FleetOS Company Onboarding P0.1 — tenants.status + metadata (schema only)
-- =============================================================================
-- @see docs/architecture/FLEETOS_COMPANY_ONBOARDING_P0_CONTRACT.md
--
-- Adds:
--   - tenants.status values for company onboarding lifecycle
--   - tenants.metadata jsonb for onboarding form / review fields (no tenant_applications)
--
-- Does NOT:
--   - Edge Functions, frontend, Auth Core, tenant_invites runtime, RLS changes
--
-- Prerequisite: 20260524140000_phase3_tenant_layer.sql (public.tenants)
--
-- Manual rollback (after reverting any rows using new statuses — see risks):
--   ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
--   ALTER TABLE public.tenants ADD CONSTRAINT tenants_status_check
--     CHECK (status IN ('active', 'inactive', 'suspended'));
--   -- Optional: ALTER TABLE public.tenants DROP COLUMN IF EXISTS metadata;
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Onboarding metadata (legal name, tax_id, submitted_at, etc.)
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenants.metadata IS
  'Flexible tenant attributes. P0 onboarding uses metadata.onboarding (legal_name, tax_id, country_code, submitted_at, review_notes).';

-- ---------------------------------------------------------------------------
-- 2. Tenant lifecycle status (company onboarding + operational gates)
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_status_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_status_check
  CHECK (
    status IN (
      'pending_review',  -- company submitted, awaiting admin approval
      'active',          -- operational workspace
      'inactive',        -- legacy Phase 3 value; prefer archived for new writes
      'suspended',       -- temporary operational lock
      'revoked',         -- permanently disabled
      'archived'         -- historical / inactive retention
    )
  );

COMMENT ON COLUMN public.tenants.status IS
  'Tenant workspace lifecycle: pending_review (onboarding), active, suspended, revoked, archived; inactive retained for legacy rows.';

-- ---------------------------------------------------------------------------
-- 3. Optional index for admin / get-my-access pending queues (P0.2+)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS tenants_status_idx
  ON public.tenants (status);

COMMIT;
