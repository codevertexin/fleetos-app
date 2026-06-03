-- =============================================================================
-- FleetOS P2.1 — Vehicles foundation (schema + tenant RLS writes)
-- =============================================================================
-- Prerequisites:
--   - 20260530115900_fleetos_vehicles_p2_1_enums.sql applied first (55P04 fix)
--   - tenants, tenant_members, Phase 7 SELECT on vehicles (optional).
-- Does NOT implement bookings, dispatch, or maintenance modules.
--
-- SQL Editor: run enums migration first, then this file (two separate runs).
--
-- Rollback (manual):
--   DROP POLICY IF EXISTS fleetos_p21_vehicles_insert ON public.vehicles;
--   DROP POLICY IF EXISTS fleetos_p21_vehicles_update ON public.vehicles;
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Table — create if missing (greenfield); extend legacy installs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT,
  plate text NOT NULL,
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  year integer,
  status text NOT NULL DEFAULT 'active',
  odometer_km integer NOT NULL DEFAULT 0,
  vin text,
  color text,
  fuel text,
  ownership_type text NOT NULL DEFAULT 'company_owned',
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plate text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS odometer_km integer,
  ADD COLUMN IF NOT EXISTS vin text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS fuel text,
  ADD COLUMN IF NOT EXISTS ownership_type text,
  ADD COLUMN IF NOT EXISTS is_active boolean,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Backfill NOT NULL defaults where legacy rows allow
UPDATE public.vehicles SET brand = '' WHERE brand IS NULL;
UPDATE public.vehicles SET model = '' WHERE model IS NULL;
UPDATE public.vehicles SET odometer_km = 0 WHERE odometer_km IS NULL;
UPDATE public.vehicles SET is_active = true WHERE is_active IS NULL;
UPDATE public.vehicles SET created_at = now() WHERE created_at IS NULL;
UPDATE public.vehicles SET updated_at = now() WHERE updated_at IS NULL;

-- status — text or vehicle_status enum
DO $$
DECLARE
  v_status_udt text;
  v_status_default text;
BEGIN
  SELECT c.udt_name
  INTO v_status_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'vehicles'
    AND c.column_name = 'status';

  IF v_status_udt = 'vehicle_status' THEN
    SELECT e.enumlabel
    INTO v_status_default
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'vehicle_status'
      AND e.enumlabel = ANY (ARRAY['active', 'available', 'inactive'])
    ORDER BY CASE e.enumlabel
      WHEN 'active' THEN 1
      WHEN 'available' THEN 2
      ELSE 99
    END
    LIMIT 1;

    IF v_status_default IS NULL THEN
      SELECT e.enumlabel
      INTO v_status_default
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'vehicle_status'
      ORDER BY e.enumsortorder
      LIMIT 1;
    END IF;

    EXECUTE format(
      'UPDATE public.vehicles SET status = %L::public.vehicle_status WHERE status IS NULL',
      v_status_default
    );
  ELSE
    UPDATE public.vehicles SET status = 'active' WHERE status IS NULL;
  END IF;
END;
$$;

-- ownership_type — text or vehicle_ownership enum (22P02 if cast wrong label)
DO $$
DECLARE
  v_own_udt text;
  v_own_default text;
BEGIN
  SELECT c.udt_name
  INTO v_own_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'vehicles'
    AND c.column_name = 'ownership_type';

  IF v_own_udt = 'vehicle_ownership' THEN
    SELECT e.enumlabel
    INTO v_own_default
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'vehicle_ownership'
      AND e.enumlabel = ANY (
        ARRAY['company_owned', 'company', 'fleet', 'internal', 'owned']
      )
    ORDER BY CASE e.enumlabel
      WHEN 'company_owned' THEN 1
      WHEN 'company' THEN 2
      WHEN 'fleet' THEN 3
      WHEN 'internal' THEN 4
      WHEN 'owned' THEN 5
      ELSE 99
    END
    LIMIT 1;

    IF v_own_default IS NULL THEN
      SELECT e.enumlabel
      INTO v_own_default
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'vehicle_ownership'
      ORDER BY e.enumsortorder
      LIMIT 1;
    END IF;

    EXECUTE format(
      'UPDATE public.vehicles SET ownership_type = %L::public.vehicle_ownership WHERE ownership_type IS NULL',
      v_own_default
    );
  ELSE
    UPDATE public.vehicles SET ownership_type = 'company_owned' WHERE ownership_type IS NULL;
  END IF;
END;
$$;

-- Legacy odometer column name (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'odometer'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'odometer_km'
  ) THEN
    ALTER TABLE public.vehicles RENAME COLUMN odometer TO odometer_km;
  END IF;
END;
$$;

ALTER TABLE public.vehicles
  ALTER COLUMN brand SET DEFAULT '',
  ALTER COLUMN model SET DEFAULT '',
  ALTER COLUMN odometer_km SET DEFAULT 0,
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
DECLARE
  v_status_udt text;
  v_own_udt text;
BEGIN
  SELECT c.udt_name INTO v_status_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'vehicles' AND c.column_name = 'status';

  IF v_status_udt = 'vehicle_status' THEN
    BEGIN
      ALTER TABLE public.vehicles
        ALTER COLUMN status SET DEFAULT 'active'::public.vehicle_status;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'P2.1: could not set vehicle_status default to active — %', SQLERRM;
    END;
  ELSE
    ALTER TABLE public.vehicles ALTER COLUMN status SET DEFAULT 'active';
  END IF;

  SELECT c.udt_name INTO v_own_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'vehicles' AND c.column_name = 'ownership_type';

  IF v_own_udt = 'vehicle_ownership' THEN
    BEGIN
      ALTER TABLE public.vehicles
        ALTER COLUMN ownership_type SET DEFAULT 'company_owned'::public.vehicle_ownership;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'P2.1: could not set vehicle_ownership default to company_owned — %', SQLERRM;
    END;
  ELSE
    ALTER TABLE public.vehicles ALTER COLUMN ownership_type SET DEFAULT 'company_owned';
  END IF;
END;
$$;

COMMENT ON TABLE public.vehicles IS
  'FleetOS tenant fleet vehicles (P2.1). Operational writes via Edge + optional authenticated RLS.';

COMMENT ON COLUMN public.vehicles.tenant_id IS 'Owning FleetOS tenant workspace.';
COMMENT ON COLUMN public.vehicles.is_active IS 'False when soft-deactivated (P2.1 deactivate endpoint).';
COMMENT ON COLUMN public.vehicles.odometer_km IS 'Last known odometer reading in kilometres.';

-- ---------------------------------------------------------------------------
-- 2. Constraints
-- ---------------------------------------------------------------------------

-- CHECK only when columns are text (enum types are self-validating)
DO $$
DECLARE
  v_status_udt text;
  v_own_udt text;
BEGIN
  SELECT c.udt_name INTO v_status_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'vehicles' AND c.column_name = 'status';

  IF v_status_udt IS DISTINCT FROM 'vehicle_status' THEN
    ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_status_check
      CHECK (
        status::text IN ('active', 'inactive', 'maintenance', 'available', 'rented')
      );
  END IF;

  SELECT c.udt_name INTO v_own_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'vehicles' AND c.column_name = 'ownership_type';

  IF v_own_udt IS DISTINCT FROM 'vehicle_ownership' THEN
    ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_ownership_type_check;
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_ownership_type_check
      CHECK (
        ownership_type::text IN (
          'company_owned',
          'individual_owner',
          'external_company',
          'leasing_partner'
        )
      );
  END IF;
END;
$$;

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_year_check;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_year_check
  CHECK (year IS NULL OR (year >= 1980 AND year <= 2100));

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_odometer_km_check;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_odometer_km_check
  CHECK (odometer_km >= 0);

-- Unique plate per tenant (active rows only — partial index)
DROP INDEX IF EXISTS vehicles_tenant_plate_active_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_tenant_plate_active_uidx
  ON public.vehicles (tenant_id, lower(plate))
  WHERE is_active = true AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vehicles_tenant_id_idx
  ON public.vehicles (tenant_id);

CREATE INDEX IF NOT EXISTS vehicles_tenant_status_idx
  ON public.vehicles (tenant_id, status)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS vehicles_tenant_active_idx
  ON public.vehicles (tenant_id, is_active);

-- ---------------------------------------------------------------------------
-- 3. RLS — tenant isolation + owner/admin writes
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fleetos_p7_authenticated_select_vehicles ON public.vehicles;
CREATE POLICY fleetos_p7_authenticated_select_vehicles
  ON public.vehicles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS fleetos_p21_vehicles_insert ON public.vehicles;
CREATE POLICY fleetos_p21_vehicles_insert
  ON public.vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.is_tenant_admin(tenant_id)
  );

DROP POLICY IF EXISTS fleetos_p21_vehicles_update ON public.vehicles;
CREATE POLICY fleetos_p21_vehicles_update
  ON public.vehicles
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND public.is_tenant_admin(tenant_id)
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.is_tenant_admin(tenant_id)
  );

GRANT SELECT, INSERT, UPDATE ON public.vehicles TO authenticated;

COMMIT;
