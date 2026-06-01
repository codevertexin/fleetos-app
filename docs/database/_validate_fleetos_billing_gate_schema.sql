-- =============================================================================
-- FleetOS P0.2b-1 — billing gate schema validation
-- =============================================================================
-- Prerequisites:
--   - 20260524140000_phase3_tenant_layer.sql
--   - 20260529130000_fleetos_company_onboarding_p0_schema.sql
--   - 20260529140000_fleetos_billing_gate_p0_2b_1_schema.sql
--
-- Run in Supabase SQL Editor on FleetOS operational project.
-- =============================================================================

-- 1) billing_plan_code exists (nullable text)
SELECT
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name = 'billing_plan_code'
      AND data_type = 'text'
      AND is_nullable = 'YES'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS billing_plan_code_ok
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenants'
  AND column_name = 'billing_plan_code';

-- 2) subscription_status column (NOT NULL, default none)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN column_name = 'subscription_status'
      AND data_type = 'text'
      AND is_nullable = 'NO'
      AND column_default IS NOT NULL
      AND column_default LIKE '%none%'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS subscription_status_column_ok
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenants'
  AND column_name = 'subscription_status';

-- 3) tenants_subscription_status_check includes all allowed values
WITH def AS (
  SELECT pg_get_constraintdef(c.oid) AS constraint_def
  FROM pg_constraint c
  JOIN pg_class rel ON rel.oid = c.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'tenants'
    AND c.conname = 'tenants_subscription_status_check'
),
expected AS (
  SELECT unnest(
    ARRAY['none', 'trialing', 'active', 'past_due', 'canceled']::text[]
  ) AS status_value
)
SELECT
  e.status_value AS expected_subscription_status,
  d.constraint_def,
  CASE
    WHEN d.constraint_def IS NULL THEN 'FAIL'
    WHEN position(e.status_value IN d.constraint_def) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS in_check_constraint
FROM expected e
CROSS JOIN def d
ORDER BY e.status_value;

-- 4) Rejects invalid subscription_status
DO $$
BEGIN
  BEGIN
    INSERT INTO public.tenants (name, slug, status, subscription_status)
    VALUES (
      '__validate_invalid_sub__',
      '__validate_invalid_sub_slug__',
      'pending_review',
      'invalid_status'
    );
    RAISE EXCEPTION 'VALIDATION FAIL: tenants_subscription_status_check did not reject invalid status';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: tenants_subscription_status_check rejects invalid status';
  END;
END $$;

-- 5) Accepts active subscription_status (rollback test row)
DO $$
DECLARE
  v_slug text := '__validate_sub_active_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
BEGIN
  BEGIN
    INSERT INTO public.tenants (name, slug, status, subscription_status, billing_plan_code)
    VALUES (
      '__validate_sub_active__',
      v_slug,
      'active',
      'active',
      'fleetos_pro'
    );
    RAISE NOTICE 'PASS: active subscription_status insert accepted (rolling back)';
    RAISE EXCEPTION 'ROLLBACK_VALIDATE_SUB_ACTIVE';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'ROLLBACK_VALIDATE_SUB_ACTIVE' THEN
        RAISE NOTICE 'PASS: active subscription_status insert accepted';
      ELSE
        RAISE;
      END IF;
  END;
END $$;

-- 6) Default none on insert without explicit subscription_status
DO $$
DECLARE
  v_slug text := '__validate_sub_default_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  v_sub text;
BEGIN
  INSERT INTO public.tenants (name, slug, status)
  VALUES ('__validate_sub_default__', v_slug, 'pending_review')
  RETURNING subscription_status INTO v_sub;

  IF v_sub = 'none' THEN
    RAISE NOTICE 'PASS: default subscription_status is none';
  ELSE
    RAISE EXCEPTION 'VALIDATION FAIL: expected default none, got %', v_sub;
  END IF;

  DELETE FROM public.tenants WHERE slug = v_slug;
END $$;

-- 7) tenants_subscription_status_idx exists
SELECT
  indexname,
  CASE WHEN indexname = 'tenants_subscription_status_idx' THEN 'PASS' ELSE 'FAIL' END AS subscription_status_index_ok
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tenants'
  AND indexname = 'tenants_subscription_status_idx';

-- 8) Snapshot: approval status vs billing gate (informational)
SELECT
  status AS tenant_approval_status,
  subscription_status,
  COUNT(*) FILTER (WHERE billing_plan_code IS NOT NULL) AS with_plan_code,
  COUNT(*) AS row_count
FROM public.tenants
GROUP BY status, subscription_status
ORDER BY status, subscription_status;

-- =============================================================================
-- Optional post-apply data alignment (manual QA only — NOT run automatically)
-- =============================================================================
-- If legacy rows have billing_plan_code set but subscription_status = none,
-- Edge P0.2b contract still treats plan_code as active until Billing Core sync.
-- Optional one-time align (review before running in production):
--
-- UPDATE public.tenants
-- SET subscription_status = 'active', updated_at = now()
-- WHERE billing_plan_code IS NOT NULL
--   AND subscription_status = 'none'
--   AND status = 'active';
--
-- =============================================================================
-- Manual rollback
-- =============================================================================
-- DROP INDEX IF EXISTS public.tenants_subscription_status_idx;
-- ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_subscription_status_check;
-- ALTER TABLE public.tenants DROP COLUMN IF EXISTS subscription_status;
-- =============================================================================
