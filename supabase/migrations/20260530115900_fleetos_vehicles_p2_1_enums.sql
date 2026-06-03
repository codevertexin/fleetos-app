-- =============================================================================
-- FleetOS P2.1 — extend legacy vehicle enums (run BEFORE 20260530120000)
-- =============================================================================
-- PostgreSQL 55P04: new enum labels cannot be used in the same transaction
-- that created them. This file must commit alone (separate migration / query).
--
-- SQL Editor: run this script first, wait for success, then run the foundation file.
-- =============================================================================

DO $$
BEGIN
  IF to_regtype('public.vehicle_ownership') IS NOT NULL THEN
    ALTER TYPE public.vehicle_ownership ADD VALUE IF NOT EXISTS 'company_owned';
    ALTER TYPE public.vehicle_ownership ADD VALUE IF NOT EXISTS 'individual_owner';
    ALTER TYPE public.vehicle_ownership ADD VALUE IF NOT EXISTS 'external_company';
    ALTER TYPE public.vehicle_ownership ADD VALUE IF NOT EXISTS 'leasing_partner';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regtype('public.vehicle_status') IS NOT NULL THEN
    ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'active';
    ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'inactive';
    ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'maintenance';
    ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'available';
    ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'rented';
  END IF;
END;
$$;
