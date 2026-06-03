-- =============================================================================
-- FleetOS P2.2 — extend legacy driver_status enum (run BEFORE 20260530220000)
-- =============================================================================
-- PostgreSQL 55P04: new enum labels cannot be used in the same transaction
-- that created them. Run this file first, then the foundation migration.
--
-- NOTE: public.driver_availability is a legacy TABLE (operational slots), NOT an enum.
-- Postgres also registers a composite type with the same name (typtype = 'c').
-- to_regtype('public.driver_availability') is non-null but ALTER TYPE fails with 42809.
-- P2.2 setup field drivers.availability is text + CHECK (foundation migration).
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'driver_status'
      AND t.typtype = 'e'
  ) THEN
    ALTER TYPE public.driver_status ADD VALUE IF NOT EXISTS 'active';
    ALTER TYPE public.driver_status ADD VALUE IF NOT EXISTS 'inactive';
    ALTER TYPE public.driver_status ADD VALUE IF NOT EXISTS 'on_trip';
    ALTER TYPE public.driver_status ADD VALUE IF NOT EXISTS 'available';
    ALTER TYPE public.driver_status ADD VALUE IF NOT EXISTS 'off_duty';
  ELSE
    RAISE NOTICE 'P2.2 enums: public.driver_status is not an enum — status handled as text in foundation.';
  END IF;
END;
$$;

-- Validation (run after apply — expect enum labels OR notice-only skip):
-- SELECT t.typname, t.typtype, e.enumlabel
-- FROM pg_type t
-- LEFT JOIN pg_enum e ON e.enumtypid = t.oid
-- WHERE t.typnamespace = 'public'::regnamespace
--   AND t.typname IN ('driver_status', 'driver_availability')
-- ORDER BY t.typname, e.enumsortorder;
