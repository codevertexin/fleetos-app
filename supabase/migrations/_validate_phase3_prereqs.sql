-- =============================================================================
-- Phase 3 pre-migration introspection (read-only — run before applying migration)
-- Run in Supabase SQL Editor when project is unpaused. Do NOT apply to production
-- until results are reviewed.
-- =============================================================================

-- profiles column layout (confirm user_id vs id = auth.uid)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- companies.created_at presence (used for backfill ordering)
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'companies'
  AND column_name IN ('id', 'name', 'created_at', 'tenant_id')
ORDER BY ordinal_position;

-- Existing FleetOS profile resolution helpers
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('my_profile_id', 'my_company_id', 'handle_new_user')
ORDER BY p.proname;

-- FK from profiles to auth.users (if any)
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'profiles';
