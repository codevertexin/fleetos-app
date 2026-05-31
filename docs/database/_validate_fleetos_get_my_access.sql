-- =============================================================================
-- FleetOS P0.2A — fleetos-get-my-access validation (read path / fixtures)
-- =============================================================================
-- Prerequisites:
--   - 20260529130000_fleetos_company_onboarding_p0_schema.sql applied
--   - Edge function fleetos-get-my-access deployed
--
-- This file does NOT deploy the function. Use for SQL Editor checks and
-- optional fixture rows before manual curl smoke (see docs/integration).
-- =============================================================================

-- 1) tenant_members join shape used by Edge (id + tenant metadata)
SELECT
  tm.id AS membership_id,
  tm.codevertex_user_id,
  tm.role,
  tm.status AS member_status,
  tm.created_at AS member_created_at,
  t.id AS tenant_id,
  t.slug,
  t.name,
  t.status AS tenant_status,
  t.metadata,
  t.created_at AS tenant_created_at
FROM public.tenant_members tm
JOIN public.tenants t ON t.id = tm.tenant_id
WHERE tm.status <> 'removed'
ORDER BY tm.updated_at DESC
LIMIT 20;

-- 2) Count users by operational bucket (approximates access_state)
SELECT
  tm.codevertex_user_id,
  COUNT(*) FILTER (
    WHERE t.status = 'active' AND tm.status = 'active'
  ) AS active_pairs,
  COUNT(*) FILTER (
    WHERE t.status = 'pending_review'
      OR tm.status IN ('pending', 'invited')
  ) AS pending_pairs,
  COUNT(*) FILTER (
    WHERE t.status = 'suspended' OR tm.status = 'suspended'
  ) AS suspended_pairs,
  COUNT(*) FILTER (
    WHERE t.status IN ('revoked', 'archived', 'inactive')
  ) AS revoked_tenant_pairs
FROM public.tenant_members tm
JOIN public.tenants t ON t.id = tm.tenant_id
WHERE tm.status <> 'removed'
GROUP BY tm.codevertex_user_id
ORDER BY active_pairs DESC, pending_pairs DESC
LIMIT 50;

-- 3) Users with Auth profile but no operational membership (needs_onboarding candidates)
SELECT p.codevertex_user_id, p.email, p.display_name
FROM public.profiles p
WHERE p.codevertex_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.codevertex_user_id = p.codevertex_user_id
      AND tm.status <> 'removed'
  )
LIMIT 20;

-- 4) Optional: pending_review fixture (ROLLBACK in SQL Editor if used for manual test)
-- BEGIN;
-- INSERT INTO public.tenants (id, name, slug, status, metadata)
-- VALUES (
--   gen_random_uuid(),
--   'Smoke Test Lda',
--   'smoke-test-' || substr(gen_random_uuid()::text, 1, 8),
--   'pending_review',
--   jsonb_build_object(
--     'onboarding',
--     jsonb_build_object('submitted_at', now()::text)
--   )
-- )
-- RETURNING id;
-- COMMIT;
