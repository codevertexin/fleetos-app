-- =============================================================================
-- FleetOS Phase 3 — Tenant layer (non-destructive)
-- =============================================================================
-- Adds multi-tenant tables, nullable tenant_id columns, backfill, indexes,
-- and helper functions. Does NOT drop tables/functions/triggers or rewrite RLS.
--
-- Prerequisite: existing FleetOS Supabase schema (validated remotely 2026-05-26)
-- Rule: one existing company → one initial tenant
-- Backfill paths match real FKs: drivers via company_users; assignments via driver/vehicle
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tenant core tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  custom_domain text,
  logo_url text,
  primary_color text,
  secondary_color text,
  locale text NOT NULL DEFAULT 'pt-PT',
  currency text NOT NULL DEFAULT 'EUR',
  timezone text NOT NULL DEFAULT 'Europe/Lisbon',
  billing_plan_code text,
  legacy_company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenants_slug_unique UNIQUE (slug),
  CONSTRAINT tenants_status_check CHECK (status IN ('active', 'inactive', 'suspended'))
);

COMMENT ON TABLE public.tenants IS 'FleetOS customer workspace (tenant != company != owner).';
COMMENT ON COLUMN public.tenants.legacy_company_id IS 'Optional link to source company row used during Phase 3 backfill.';

CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_domains_domain_unique UNIQUE (domain)
);

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  booking_enabled boolean NOT NULL DEFAULT true,
  driver_portal_enabled boolean NOT NULL DEFAULT true,
  customer_portal_enabled boolean NOT NULL DEFAULT true,
  public_booking_slug text,
  default_booking_duration_minutes integer NOT NULL DEFAULT 60,
  min_notice_minutes integer NOT NULL DEFAULT 120,
  allow_external_owners boolean NOT NULL DEFAULT true,
  allow_external_companies boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  codevertex_user_id uuid NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_users_tenant_codevertex_unique UNIQUE (tenant_id, codevertex_user_id),
  CONSTRAINT tenant_users_role_check CHECK (
    role IN (
      'tenant_admin',
      'fleet_manager',
      'operations',
      'dispatcher',
      'finance',
      'driver',
      'owner',
      'viewer'
    )
  )
);

-- ---------------------------------------------------------------------------
-- 2. Nullable tenant_id on operational tables (Phase 3 scope)
-- ---------------------------------------------------------------------------

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.owners
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.incomes
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.driver_payouts
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.rental_contracts
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.driver_contracts
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 3. CodeVertex identity on profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS codevertex_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_codevertex_user_id_unique_idx
  ON public.profiles (codevertex_user_id)
  WHERE codevertex_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Backfill — one company → one tenant
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fleetos_slugify(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(trim(coalesce(p_input, 'tenant')), '[^a-zA-Z0-9]+', '-', 'g'),
      '(^-+|-+$)',
      '',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.fleetos_create_tenant_for_company(p_company_id uuid, p_company_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  new_tenant_id uuid;
  base_slug text;
  final_slug text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id = p_company_id AND c.tenant_id IS NOT NULL
  ) THEN
    RETURN;
  END IF;

  base_slug := public.fleetos_slugify(p_company_name);
  IF base_slug = '' THEN
    base_slug := 'tenant';
  END IF;
  final_slug := base_slug || '-' || left(p_company_id::text, 8);

  INSERT INTO public.tenants (
    name,
    slug,
    status,
    legacy_company_id,
    created_at,
    updated_at
  )
  VALUES (
    p_company_name,
    final_slug,
    'active',
    p_company_id,
    now(),
    now()
  )
  RETURNING id INTO new_tenant_id;

  UPDATE public.companies
  SET tenant_id = new_tenant_id
  WHERE id = p_company_id;

  INSERT INTO public.tenant_settings (tenant_id)
  VALUES (new_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;
END $$;

DO $$
DECLARE
  company_row RECORD;
BEGIN
  IF to_regclass('public.companies') IS NULL THEN
    RAISE NOTICE 'public.companies not found — skipping tenant backfill';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'created_at'
  ) THEN
    FOR company_row IN
      SELECT c.id, c.name
      FROM public.companies c
      WHERE c.tenant_id IS NULL
      ORDER BY c.created_at NULLS LAST, c.id
    LOOP
      PERFORM public.fleetos_create_tenant_for_company(company_row.id, company_row.name);
    END LOOP;
  ELSE
    FOR company_row IN
      SELECT c.id, c.name
      FROM public.companies c
      WHERE c.tenant_id IS NULL
      ORDER BY c.id
    LOOP
      PERFORM public.fleetos_create_tenant_for_company(company_row.id, company_row.name);
    END LOOP;
  END IF;
END $$;

-- Direct company_id backfill helper
CREATE OR REPLACE FUNCTION public.fleetos_backfill_tenant_from_company(p_table regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_table text := p_table::text;
  v_schema text := split_part(v_table, '.', 1);
  v_rel text := split_part(v_table, '.', 2);
  v_sql text;
BEGIN
  IF v_rel = '' THEN
    v_rel := v_schema;
    v_schema := 'public';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = v_schema
      AND table_name = v_rel
      AND column_name = 'company_id'
  ) THEN
    RAISE NOTICE 'Skip % — no company_id column', p_table;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = v_schema
      AND table_name = v_rel
      AND column_name = 'tenant_id'
  ) THEN
    RAISE NOTICE 'Skip % — no tenant_id column', p_table;
    RETURN;
  END IF;

  v_sql := format(
    'UPDATE %I.%I target
     SET tenant_id = c.tenant_id
     FROM public.companies c
     WHERE target.company_id = c.id
       AND c.tenant_id IS NOT NULL
       AND target.tenant_id IS NULL',
    v_schema,
    v_rel
  );

  EXECUTE v_sql;
END $$;

-- Direct company_id → companies.tenant_id (tables that expose company_id)
SELECT public.fleetos_backfill_tenant_from_company('public.companies'::regclass);
SELECT public.fleetos_backfill_tenant_from_company('public.vehicles'::regclass);
SELECT public.fleetos_backfill_tenant_from_company('public.owners'::regclass);
SELECT public.fleetos_backfill_tenant_from_company('public.booking_requests'::regclass);
SELECT public.fleetos_backfill_tenant_from_company('public.assignments'::regclass);
SELECT public.fleetos_backfill_tenant_from_company('public.documents'::regclass);
SELECT public.fleetos_backfill_tenant_from_company('public.expenses'::regclass);
SELECT public.fleetos_backfill_tenant_from_company('public.incomes'::regclass);
SELECT public.fleetos_backfill_tenant_from_company('public.payouts'::regclass);
SELECT public.fleetos_backfill_tenant_from_company('public.rental_contracts'::regclass);

-- drivers: company_user_id → company_users → companies (no drivers.company_id in real schema)
DO $$
BEGIN
  IF to_regclass('public.drivers') IS NULL
     OR to_regclass('public.company_users') IS NULL
     OR to_regclass('public.companies') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'tenant_id'
  )
  OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'company_user_id'
  ) THEN
    RETURN;
  END IF;

  UPDATE public.drivers d
  SET tenant_id = c.tenant_id
  FROM public.company_users cu
  JOIN public.companies c ON c.id = cu.company_id
  WHERE d.company_user_id = cu.id
    AND d.tenant_id IS NULL
    AND c.tenant_id IS NOT NULL;
END $$;

-- assignments: driver_id → drivers.tenant_id
DO $$
BEGIN
  IF to_regclass('public.assignments') IS NULL OR to_regclass('public.drivers') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'tenant_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'driver_id'
  ) THEN
    UPDATE public.assignments a
    SET tenant_id = d.tenant_id
    FROM public.drivers d
    WHERE a.driver_id = d.id
      AND a.tenant_id IS NULL
      AND d.tenant_id IS NOT NULL;
  END IF;
END $$;

-- assignments: vehicle_id → vehicles.tenant_id
DO $$
BEGIN
  IF to_regclass('public.assignments') IS NULL OR to_regclass('public.vehicles') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'tenant_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'vehicle_id'
  ) THEN
    UPDATE public.assignments a
    SET tenant_id = v.tenant_id
    FROM public.vehicles v
    WHERE a.vehicle_id = v.id
      AND a.tenant_id IS NULL
      AND v.tenant_id IS NOT NULL;
  END IF;
END $$;

-- driver_payouts: driver_id → drivers.tenant_id
DO $$
BEGIN
  IF to_regclass('public.driver_payouts') IS NULL OR to_regclass('public.drivers') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'driver_payouts' AND column_name = 'tenant_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'driver_payouts' AND column_name = 'driver_id'
  ) THEN
    UPDATE public.driver_payouts dp
    SET tenant_id = d.tenant_id
    FROM public.drivers d
    WHERE dp.driver_id = d.id
      AND dp.tenant_id IS NULL
      AND d.tenant_id IS NOT NULL;
  END IF;
END $$;

-- driver_contracts: driver_id → drivers.tenant_id
DO $$
BEGIN
  IF to_regclass('public.driver_contracts') IS NULL OR to_regclass('public.drivers') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'driver_contracts' AND column_name = 'tenant_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'driver_contracts' AND column_name = 'driver_id'
  ) THEN
    UPDATE public.driver_contracts dc
    SET tenant_id = d.tenant_id
    FROM public.drivers d
    WHERE dc.driver_id = d.id
      AND dc.tenant_id IS NULL
      AND d.tenant_id IS NOT NULL;
  END IF;
END $$;

-- rental_contracts: vehicle_id → vehicles.tenant_id (rows still null after company_id pass)
DO $$
BEGIN
  IF to_regclass('public.rental_contracts') IS NULL OR to_regclass('public.vehicles') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_contracts' AND column_name = 'tenant_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_contracts' AND column_name = 'vehicle_id'
  ) THEN
    UPDATE public.rental_contracts rc
    SET tenant_id = v.tenant_id
    FROM public.vehicles v
    WHERE rc.vehicle_id = v.id
      AND rc.tenant_id IS NULL
      AND v.tenant_id IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS tenants_status_idx ON public.tenants (status);
CREATE INDEX IF NOT EXISTS tenants_legacy_company_id_idx ON public.tenants (legacy_company_id);

CREATE INDEX IF NOT EXISTS tenant_domains_tenant_id_idx ON public.tenant_domains (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_domains_is_primary_idx ON public.tenant_domains (tenant_id, is_primary);

CREATE INDEX IF NOT EXISTS tenant_users_tenant_id_idx ON public.tenant_users (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_users_codevertex_user_id_idx ON public.tenant_users (codevertex_user_id);
CREATE INDEX IF NOT EXISTS tenant_users_profile_id_idx ON public.tenant_users (profile_id);
CREATE INDEX IF NOT EXISTS tenant_users_active_idx ON public.tenant_users (tenant_id, is_active);

CREATE INDEX IF NOT EXISTS companies_tenant_id_idx ON public.companies (tenant_id);
CREATE INDEX IF NOT EXISTS vehicles_tenant_id_idx ON public.vehicles (tenant_id);
CREATE INDEX IF NOT EXISTS drivers_tenant_id_idx ON public.drivers (tenant_id);
CREATE INDEX IF NOT EXISTS owners_tenant_id_idx ON public.owners (tenant_id);
CREATE INDEX IF NOT EXISTS booking_requests_tenant_id_idx ON public.booking_requests (tenant_id);
CREATE INDEX IF NOT EXISTS assignments_tenant_id_idx ON public.assignments (tenant_id);
CREATE INDEX IF NOT EXISTS documents_tenant_id_idx ON public.documents (tenant_id);
CREATE INDEX IF NOT EXISTS expenses_tenant_id_idx ON public.expenses (tenant_id);
CREATE INDEX IF NOT EXISTS incomes_tenant_id_idx ON public.incomes (tenant_id);
CREATE INDEX IF NOT EXISTS payouts_tenant_id_idx ON public.payouts (tenant_id);
CREATE INDEX IF NOT EXISTS driver_payouts_tenant_id_idx ON public.driver_payouts (tenant_id);
CREATE INDEX IF NOT EXISTS rental_contracts_tenant_id_idx ON public.rental_contracts (tenant_id);
CREATE INDEX IF NOT EXISTS driver_contracts_tenant_id_idx ON public.driver_contracts (tenant_id);

-- Optional composite indexes when company_id exists (guarded)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'vehicles', 'drivers', 'owners', 'booking_requests', 'assignments',
    'documents', 'expenses', 'incomes', 'payouts', 'driver_payouts',
    'rental_contracts', 'driver_contracts'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'company_id'
    ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id, company_id)',
        tbl || '_tenant_company_idx',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Tenant helper functions (RLS rewrite deferred to Phase 4)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_codevertex_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cv_id uuid;
  v_has_user_id boolean;
  v_has_my_profile_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'user_id'
  )
  INTO v_has_user_id;

  SELECT to_regprocedure('public.my_profile_id()') IS NOT NULL
  INTO v_has_my_profile_id;

  -- Preferred: profiles.user_id references auth.users(id)
  IF v_has_user_id THEN
    SELECT p.codevertex_user_id
    INTO v_cv_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid();
    RETURN v_cv_id;
  END IF;

  -- FleetOS existing helper: profiles.id is the profile PK, not auth.uid()
  IF v_has_my_profile_id THEN
    SELECT p.codevertex_user_id
    INTO v_cv_id
    FROM public.profiles p
    WHERE p.id = public.my_profile_id();
    RETURN v_cv_id;
  END IF;

  -- Fallback: Supabase starter pattern where profiles.id = auth.users.id
  SELECT p.codevertex_user_id
  INTO v_cv_id
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN v_cv_id;
END;
$$;

COMMENT ON FUNCTION public.current_codevertex_user_id() IS
  'Resolves codevertex_user_id via profiles.user_id, my_profile_id(), or profiles.id = auth.uid().';

CREATE OR REPLACE FUNCTION public.my_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tu.tenant_id
  FROM public.tenant_users tu
  WHERE tu.codevertex_user_id = public.current_codevertex_user_id()
    AND tu.is_active = true
$$;

COMMENT ON FUNCTION public.my_tenant_ids() IS
  'Tenant ids the current CodeVertex user may access.';

CREATE OR REPLACE FUNCTION public.is_tenant_user(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
      AND tu.codevertex_user_id = public.current_codevertex_user_id()
      AND tu.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
      AND tu.codevertex_user_id = public.current_codevertex_user_id()
      AND tu.is_active = true
      AND tu.role IN ('tenant_admin', 'fleet_manager')
  )
$$;

-- ---------------------------------------------------------------------------
-- 7. Grants for helper functions (RLS policies deferred to Phase 4)
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.current_codevertex_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_tenant_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_tenant_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid) TO authenticated, service_role;

COMMIT;
