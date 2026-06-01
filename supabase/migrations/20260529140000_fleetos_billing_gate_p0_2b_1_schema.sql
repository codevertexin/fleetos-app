-- =============================================================================
-- FleetOS P0.2b-1 — tenant billing gate schema (subscription_status)
-- =============================================================================
-- @see docs/architecture/FLEETOS_COMPANY_ONBOARDING_P0_CONTRACT.md §5.6, §4.4
--
-- Adds:
--   - tenants.subscription_status (billing gate; default none)
--   - tenants_subscription_status_check
--   - tenants_subscription_status_idx
--
-- Confirms:
--   - tenants.billing_plan_code (nullable text) — from Phase 3; ADD IF NOT EXISTS only
--
-- Does NOT:
--   - Edge functions, frontend, Billing Core, webhooks, RLS changes
--
-- Prerequisite: 20260529130000_fleetos_company_onboarding_p0_schema.sql
--
-- Manual rollback (see docs/database/_validate_fleetos_billing_gate_schema.sql):
--   DROP INDEX IF EXISTS public.tenants_subscription_status_idx;
--   ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_subscription_status_check;
--   ALTER TABLE public.tenants DROP COLUMN IF EXISTS subscription_status;
--   (billing_plan_code left in place — existed before this migration)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. billing_plan_code — Phase 3 column; ensure present on older forks
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS billing_plan_code text;

COMMENT ON COLUMN public.tenants.billing_plan_code IS
  'FleetOS plan code (e.g. fleetos_pro). P0 gate: non-null may imply active subscription until Billing Core sync (see contract).';

-- ---------------------------------------------------------------------------
-- 2. subscription_status — billing gate lifecycle
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none';

COMMENT ON COLUMN public.tenants.subscription_status IS
  'Billing gate: none (approved but not subscribed), trialing, active, past_due, canceled. Distinct from tenants.status (approval).';

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_subscription_status_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_subscription_status_check
  CHECK (
    subscription_status IN (
      'none',       -- no active subscription (default; active_unsubscribed UX)
      'trialing',   -- trial period; operational writes per product policy
      'active',     -- paid/active subscription
      'past_due',   -- payment failed; read-only / blocked writes
      'canceled'    -- ended; blocked writes
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Index for billing gate queries (get-my-access, admin queues)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS tenants_subscription_status_idx
  ON public.tenants (subscription_status);

COMMIT;
