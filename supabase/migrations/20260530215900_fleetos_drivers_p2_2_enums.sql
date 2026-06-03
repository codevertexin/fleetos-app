-- =============================================================================
-- FleetOS P2.2 — extend legacy driver enums (run BEFORE 20260530220000)
-- =============================================================================
-- PostgreSQL 55P04: new enum labels cannot be used in the same transaction
-- that created them. Run this file first, then the foundation migration.
-- =============================================================================

DO $$
BEGIN
  IF to_regtype('public.driver_status') IS NOT NULL THEN
    ALTER TYPE public.driver_status ADD VALUE IF NOT EXISTS 'active';
    ALTER TYPE public.driver_status ADD VALUE IF NOT EXISTS 'inactive';
    ALTER TYPE public.driver_status ADD VALUE IF NOT EXISTS 'on_trip';
    ALTER TYPE public.driver_status ADD VALUE IF NOT EXISTS 'available';
    ALTER TYPE public.driver_status ADD VALUE IF NOT EXISTS 'off_duty';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regtype('public.driver_availability') IS NOT NULL THEN
    ALTER TYPE public.driver_availability ADD VALUE IF NOT EXISTS 'available';
    ALTER TYPE public.driver_availability ADD VALUE IF NOT EXISTS 'busy';
    ALTER TYPE public.driver_availability ADD VALUE IF NOT EXISTS 'off';
  END IF;
END;
$$;
