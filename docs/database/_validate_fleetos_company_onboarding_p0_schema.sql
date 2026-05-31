-- =============================================================================
-- FleetOS Company Onboarding P0.1 — schema validation
-- =============================================================================
-- Prerequisites:
--   - 20260529130000_fleetos_company_onboarding_p0_schema.sql applied
--
-- Run in Supabase SQL Editor on FleetOS operational project.
-- =============================================================================

-- 1) tenants.metadata column exists (jsonb, NOT NULL, default {})
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  CASE
    WHEN column_name = 'metadata'
      AND data_type = 'jsonb'
      AND is_nullable = 'NO'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS metadata_column_ok
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenants'
  AND column_name = 'metadata';

-- 2) tenants_status_check definition includes all P0.1 lifecycle values
WITH def AS (
  SELECT pg_get_constraintdef(c.oid) AS constraint_def
  FROM pg_constraint c
  JOIN pg_class rel ON rel.oid = c.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'tenants'
    AND c.conname = 'tenants_status_check'
),
expected AS (
  SELECT unnest(
    ARRAY[
      'pending_review',
      'active',
      'inactive',
      'suspended',
      'revoked',
      'archived'
    ]::text[]
  ) AS status_value
)
SELECT
  e.status_value AS expected_status,
  d.constraint_def,
  CASE
    WHEN d.constraint_def IS NULL THEN 'FAIL'
    WHEN position(e.status_value IN d.constraint_def) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS in_check_constraint
FROM expected e
CROSS JOIN def d
ORDER BY e.status_value;

-- 3) Constraint rejects invalid status (dry run in subtransaction)
DO $$
BEGIN
  BEGIN
    INSERT INTO public.tenants (name, slug, status)
    VALUES ('__validate_invalid_status__', '__validate_invalid_slug__', 'not_a_valid_status');
    RAISE EXCEPTION 'VALIDATION FAIL: tenants_status_check did not reject invalid status';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: tenants_status_check rejects invalid status';
  END;
END $$;

-- 4) Constraint accepts pending_review (dry run in subtransaction)
DO $$
DECLARE
  v_slug text := '__validate_pending_review_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
BEGIN
  BEGIN
    INSERT INTO public.tenants (name, slug, status, metadata)
    VALUES (
      '__validate_pending_review__',
      v_slug,
      'pending_review',
      '{"onboarding":{"legal_name":"Test","tax_id":"000000000","country_code":"PT"}}'::jsonb
    );
    RAISE NOTICE 'PASS: pending_review insert accepted (rolling back)';
    RAISE EXCEPTION 'ROLLBACK_VALIDATE_PENDING_REVIEW';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'ROLLBACK_VALIDATE_PENDING_REVIEW' THEN
        RAISE NOTICE 'PASS: pending_review insert accepted';
      ELSE
        RAISE;
      END IF;
  END;
END $$;

-- 5) tenants_status_idx exists (optional performance index from P0.1)
SELECT
  indexname,
  CASE WHEN indexname = 'tenants_status_idx' THEN 'PASS' ELSE 'CHECK' END AS status_index_ok
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tenants'
  AND indexname = 'tenants_status_idx';

-- 6) Status distribution snapshot (informational)
SELECT status, COUNT(*) AS row_count
FROM public.tenants
GROUP BY status
ORDER BY status;
