-- =============================================================================
-- FleetOS Phase 7 — Tenant-aware RLS foundation (DRAFT — review before apply)
-- =============================================================================
-- Adds tenant-scoped RLS policies ALONGSIDE existing company-scoped policies.
-- Does NOT drop or replace legacy policies.
-- Does NOT set tenant_id NOT NULL.
-- Does NOT grant broad write access to authenticated.
-- New policies target role authenticated only (no new anon policies).
--
-- Prerequisites (Phase 3): public.current_codevertex_user_id(),
-- public.my_tenant_ids(), public.is_tenant_admin(uuid), tenant_users populated
-- after Edge sync for real users.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tenant core tables — enable RLS + policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- tenants: members may read tenant rows for workspaces they belong to
DROP POLICY IF EXISTS fleetos_p7_authenticated_select_tenants ON public.tenants;
CREATE POLICY fleetos_p7_authenticated_select_tenants
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.my_tenant_ids())
  );

-- tenant_settings: read for any active membership; update for tenant_admin / fleet_manager
DROP POLICY IF EXISTS fleetos_p7_authenticated_select_tenant_settings ON public.tenant_settings;
CREATE POLICY fleetos_p7_authenticated_select_tenant_settings
  ON public.tenant_settings
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_update_tenant_settings ON public.tenant_settings;
CREATE POLICY fleetos_p7_authenticated_update_tenant_settings
  ON public.tenant_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

-- tenant_domains: read-only for members (no authenticated writes in Phase 7)
DROP POLICY IF EXISTS fleetos_p7_authenticated_select_tenant_domains ON public.tenant_domains;
CREATE POLICY fleetos_p7_authenticated_select_tenant_domains
  ON public.tenant_domains
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT public.my_tenant_ids())
  );

-- tenant_users: each user reads their own membership rows only
DROP POLICY IF EXISTS fleetos_p7_authenticated_select_own_tenant_users ON public.tenant_users;
CREATE POLICY fleetos_p7_authenticated_select_own_tenant_users
  ON public.tenant_users
  FOR SELECT
  TO authenticated
  USING (
    codevertex_user_id = public.current_codevertex_user_id()
    AND is_active = true
  );

-- ---------------------------------------------------------------------------
-- 2. Operational tables — additive SELECT via tenant_id (read foundation only)
--    Rows with tenant_id NULL remain governed only by existing company policies.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_companies ON public.companies;
CREATE POLICY fleetos_p7_authenticated_select_companies
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_vehicles ON public.vehicles;
CREATE POLICY fleetos_p7_authenticated_select_vehicles
  ON public.vehicles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_drivers ON public.drivers;
CREATE POLICY fleetos_p7_authenticated_select_drivers
  ON public.drivers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_owners ON public.owners;
CREATE POLICY fleetos_p7_authenticated_select_owners
  ON public.owners
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_booking_requests ON public.booking_requests;
CREATE POLICY fleetos_p7_authenticated_select_booking_requests
  ON public.booking_requests
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_assignments ON public.assignments;
CREATE POLICY fleetos_p7_authenticated_select_assignments
  ON public.assignments
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_documents ON public.documents;
CREATE POLICY fleetos_p7_authenticated_select_documents
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_expenses ON public.expenses;
CREATE POLICY fleetos_p7_authenticated_select_expenses
  ON public.expenses
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_incomes ON public.incomes;
CREATE POLICY fleetos_p7_authenticated_select_incomes
  ON public.incomes
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_payouts ON public.payouts;
CREATE POLICY fleetos_p7_authenticated_select_payouts
  ON public.payouts
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_rental_contracts ON public.rental_contracts;
CREATE POLICY fleetos_p7_authenticated_select_rental_contracts
  ON public.rental_contracts
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_driver_contracts ON public.driver_contracts;
CREATE POLICY fleetos_p7_authenticated_select_driver_contracts
  ON public.driver_contracts
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

COMMIT;
