-- =============================================================================
-- FleetOS Phase 2A.3 — fleetos_role_map (legacy → canonical roles)
-- =============================================================================
-- @see docs/architecture/FLEETOS_PHASE2A_MEMBERSHIP_PLAN.md (step 2A.3)
--
-- Reference mapping for Phase 2A.5 sync trigger and backfill scripts.
-- Does NOT alter tenant_users, tenant_members, Edge, RLS policies, or helpers.
--
-- Rollback (manual):
--   DROP TABLE IF EXISTS public.fleetos_role_map CASCADE;
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Reference table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fleetos_role_map (
  legacy_role text PRIMARY KEY,
  canonical_role text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fleetos_role_map_legacy_role_check CHECK (
    legacy_role IN (
      'tenant_admin',
      'fleet_manager',
      'operations',
      'dispatcher',
      'finance',
      'driver',
      'owner',
      'viewer'
    )
  ),
  CONSTRAINT fleetos_role_map_canonical_role_check CHECK (
    canonical_role IN (
      'owner',
      'admin',
      'manager',
      'dispatcher',
      'driver',
      'mechanic',
      'viewer'
    )
  )
);

COMMENT ON TABLE public.fleetos_role_map IS
  'Official legacy (tenant_users.role) → canonical (tenant_members.role) mapping for Phase 2A transition.';

COMMENT ON COLUMN public.fleetos_role_map.notes IS
  'Human-readable rationale; finance→manager is transitional until RBAC split or permissions jsonb.';

COMMENT ON COLUMN public.fleetos_role_map.legacy_role IS
  'Values allowed by tenant_users_role_check (Phase 3). mechanic has no legacy row.';

COMMENT ON COLUMN public.fleetos_role_map.canonical_role IS
  'Values allowed by tenant_members_role_check (Phase 2A.2). customer role is out of scope (tenant_customers).';

-- ---------------------------------------------------------------------------
-- 2. Index (minimal — PK covers legacy_role lookups)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS fleetos_role_map_canonical_role_idx
  ON public.fleetos_role_map (canonical_role);

-- ---------------------------------------------------------------------------
-- 3. Seed — idempotent
-- ---------------------------------------------------------------------------

INSERT INTO public.fleetos_role_map (legacy_role, canonical_role, notes)
VALUES
  (
    'tenant_admin',
    'admin',
    'Legacy tenant_admin → canonical admin.'
  ),
  (
    'fleet_manager',
    'manager',
    'Legacy fleet_manager → canonical manager.'
  ),
  (
    'operations',
    'manager',
    'Legacy operations collapsed to manager (pending finer RBAC split).'
  ),
  (
    'dispatcher',
    'dispatcher',
    'Direct 1:1 mapping.'
  ),
  (
    'finance',
    'manager',
    'TRANSITIONAL: finance → manager until dedicated finance role or permissions jsonb.'
  ),
  (
    'driver',
    'driver',
    'Direct 1:1 mapping.'
  ),
  (
    'owner',
    'owner',
    'Tenant economic owner (distinct from vehicle owner entity).'
  ),
  (
    'viewer',
    'viewer',
    'Direct 1:1 mapping.'
  )
ON CONFLICT (legacy_role) DO UPDATE
SET
  canonical_role = EXCLUDED.canonical_role,
  notes = EXCLUDED.notes;

-- mechanic: no legacy_role in tenant_users CHECK — assign canonical mechanic via invites/admin only (2A.4+).

-- ---------------------------------------------------------------------------
-- 4. Access — reference data; no RLS policies (table not RLS-enabled in 2A.3)
-- ---------------------------------------------------------------------------
-- Intentionally no ENABLE ROW LEVEL SECURITY: read-only reference used by
-- service_role migrations/triggers later. Does not expose tenant-scoped data.
-- No GRANT changes to anon/authenticated (default public schema grants unchanged).

COMMIT;
