-- =============================================================================
-- FleetOS P2.2 — Drivers foundation (schema + tenant RLS writes)
-- =============================================================================
-- Prerequisites:
--   - 20260530215900_fleetos_drivers_p2_2_enums.sql applied first (55P04 fix)
--   - tenants, tenant_members, Phase 7 SELECT on drivers (optional).
-- Does NOT implement assignments, bookings, or driver portal auth.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT,
  full_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active',
  availability text,
  license_expires_at date,
  tvde_cert_expires_at date,
  tax_id text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS availability text,
  ADD COLUMN IF NOT EXISTS license_expires_at date,
  ADD COLUMN IF NOT EXISTS tvde_cert_expires_at date,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS is_active boolean,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Legacy name column → full_name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.drivers RENAME COLUMN name TO full_name;
  END IF;
END;
$$;

UPDATE public.drivers SET full_name = '' WHERE full_name IS NULL;
UPDATE public.drivers SET is_active = true WHERE is_active IS NULL;
UPDATE public.drivers SET created_at = now() WHERE created_at IS NULL;
UPDATE public.drivers SET updated_at = now() WHERE updated_at IS NULL;

-- status — real enum (typtype=e) or text
DO $$
DECLARE
  v_status_udt text;
  v_status_default text;
  v_status_is_enum boolean;
BEGIN
  SELECT c.udt_name
  INTO v_status_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'drivers'
    AND c.column_name = 'status';

  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = v_status_udt
      AND t.typtype = 'e'
  )
  INTO v_status_is_enum;

  IF v_status_is_enum THEN
    SELECT e.enumlabel
    INTO v_status_default
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = v_status_udt
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
      WHERE t.typname = v_status_udt
      ORDER BY e.enumsortorder
      LIMIT 1;
    END IF;

    EXECUTE format(
      'UPDATE public.drivers SET status = %L::public.%I WHERE status IS NULL',
      v_status_default,
      v_status_udt
    );
  ELSE
    UPDATE public.drivers SET status = 'active' WHERE status IS NULL;
  END IF;
END;
$$;

ALTER TABLE public.drivers
  ALTER COLUMN full_name SET DEFAULT '',
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
DECLARE
  v_status_udt text;
  v_status_is_enum boolean;
BEGIN
  SELECT c.udt_name INTO v_status_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'drivers' AND c.column_name = 'status';

  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = v_status_udt
      AND t.typtype = 'e'
  )
  INTO v_status_is_enum;

  IF v_status_is_enum THEN
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.drivers ALTER COLUMN status SET DEFAULT %L::public.%I',
        'active',
        v_status_udt
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'P2.2: could not set % default — %', v_status_udt, SQLERRM;
    END;
  ELSE
    ALTER TABLE public.drivers ALTER COLUMN status SET DEFAULT 'active';
  END IF;
END;
$$;

COMMENT ON TABLE public.drivers IS
  'FleetOS tenant drivers (P2.2). Operational writes via Edge + optional authenticated RLS.';

COMMENT ON COLUMN public.drivers.tenant_id IS 'Owning FleetOS tenant workspace.';
COMMENT ON COLUMN public.drivers.is_active IS 'False when soft-deactivated (P2.2 deactivate endpoint).';
COMMENT ON COLUMN public.drivers.full_name IS 'Driver display name for fleet setup.';

-- Constraints (text columns only — skip CHECK when column uses a real enum type)
DO $$
DECLARE
  v_status_udt text;
  v_avail_udt text;
  v_status_is_enum boolean;
  v_avail_is_enum boolean;
BEGIN
  SELECT c.udt_name INTO v_status_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'drivers' AND c.column_name = 'status';

  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = v_status_udt AND t.typtype = 'e'
  ) INTO v_status_is_enum;

  IF NOT v_status_is_enum THEN
    ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_status_check;
    ALTER TABLE public.drivers
      ADD CONSTRAINT drivers_status_check
      CHECK (
        status::text IN ('active', 'inactive', 'on_trip', 'available', 'off_duty')
      );
  END IF;

  SELECT c.udt_name INTO v_avail_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'drivers' AND c.column_name = 'availability';

  IF v_avail_udt IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = v_avail_udt AND t.typtype = 'e'
    ) INTO v_avail_is_enum;

    IF NOT v_avail_is_enum THEN
      ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_availability_check;
      ALTER TABLE public.drivers
        ADD CONSTRAINT drivers_availability_check
        CHECK (
          availability IS NULL
          OR availability::text IN ('available', 'busy', 'off')
        );
    END IF;
  END IF;
END;
$$;

DROP INDEX IF EXISTS drivers_tenant_email_active_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS drivers_tenant_email_active_uidx
  ON public.drivers (tenant_id, lower(email))
  WHERE is_active = true AND tenant_id IS NOT NULL AND email IS NOT NULL AND email <> '';

CREATE INDEX IF NOT EXISTS drivers_tenant_id_idx
  ON public.drivers (tenant_id);

CREATE INDEX IF NOT EXISTS drivers_tenant_status_idx
  ON public.drivers (tenant_id, status)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS drivers_tenant_active_idx
  ON public.drivers (tenant_id, is_active);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fleetos_p22_drivers_insert ON public.drivers;
CREATE POLICY fleetos_p22_drivers_insert
  ON public.drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.is_tenant_admin(tenant_id)
  );

DROP POLICY IF EXISTS fleetos_p22_drivers_update ON public.drivers;
CREATE POLICY fleetos_p22_drivers_update
  ON public.drivers
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

GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated;

COMMIT;
