-- =============================================================================
-- FleetOS Phase 5b — Security-hardened revision (NO anon identity RPCs)
-- =============================================================================
-- The original Phase 5b design exposed SECURITY DEFINER RPCs to `anon`,
-- allowing arbitrary writes to `tenant_users` without server-side proof of
-- Auth Core membership. That design was REJECTED (see
-- docs/integration/FLEETOS_PHASE5B_SECURITY_REVIEW.md).
--
-- Operational identity sync and tenant listing are implemented (or will be)
-- via Supabase Edge Functions using service_role ONLY inside the function,
-- after Auth Core token/assertion verification — see
-- supabase/functions/fleetos-sync-identity and fleetos-list-tenants.
--
-- This migration is SAFE to apply: it only drops obsolete unsafe functions
-- if they exist (e.g. from a prior local apply). It does NOT create new
-- anon-callable write paths.
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.fleetos_sync_operational_identity_after_sso(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.fleetos_list_operational_tenants(uuid);

COMMIT;
