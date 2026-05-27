-- =============================================================================
-- FleetOS — Auth Core app registry seed (OPTIONAL)
-- =============================================================================
-- Run ONLY on the CodeVertex Auth Core Supabase project (auth.codevertex.cc backend).
-- Do NOT run on FleetOS operational Supabase (kjiwzqysjassakvrojun).
--
-- BEFORE RUNNING:
-- 1. Confirm the registry table name and columns in Auth Core (likely public.apps).
-- 2. Adjust the INSERT below if your schema uses different column names.
-- 3. Some deployments store branding in apps.metadata (jsonb) only — merge accordingly.
-- =============================================================================

-- Expected table (per CODEVERTEX_AUTH_IMPLEMENTATION_STANDARD.md): public.apps
-- Alternative names seen in other CodeVertex projects: public.ecosystem_apps
-- If neither exists, stop and introspect:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name ILIKE '%app%';

DO $$
BEGIN
  IF to_regclass('public.apps') IS NULL THEN
    RAISE NOTICE 'Skip FleetOS seed: public.apps not found. Verify Auth Core schema table name.';
    RETURN;
  END IF;

  INSERT INTO public.apps (
    app_code,
    ecosystem_code,
    display_name,
    base_url,
    sso_callback_url,
    status,
    metadata
  )
  VALUES (
    'FLEETOS',
    'codevertex',
    'FleetOS',
    'https://fleetos.codevertex.cc',
    'https://fleetos.codevertex.cc/sso/callback',
    'active',
    jsonb_build_object(
      'brand_name', 'FleetOS',
      'tagline', 'Fleet management operating system',
      'category', 'business',
      'profile_mode', 'business',
      'requires_profile', true,
      'primary_color', '#00B39A',
      'secondary_color', '#0D2535',
      'accent_color', '#00B39A',
      'logo_url', 'https://fleetos.codevertex.cc/logo.png',
      'favicon_url', 'https://fleetos.codevertex.cc/favicon.ico',
      'return_url', 'https://fleetos.codevertex.cc',
      'allowed_return_urls', jsonb_build_array(
        'http://localhost:5173/sso/callback',
        'http://localhost:5174/sso/callback',
        'http://localhost:4200/sso/callback',
        'https://fleetos.codevertex.cc/sso/callback'
      ),
      'auth_footer', 'Protected account access by CodeVertex'
    )
  )
  ON CONFLICT (app_code) DO UPDATE SET
    ecosystem_code = EXCLUDED.ecosystem_code,
    display_name = EXCLUDED.display_name,
    base_url = EXCLUDED.base_url,
    sso_callback_url = EXCLUDED.sso_callback_url,
    status = EXCLUDED.status,
    metadata = COALESCE(public.apps.metadata, '{}'::jsonb) || EXCLUDED.metadata;
END $$;

-- If your schema uses separate columns instead of metadata, add a second block here
-- after confirming column names, for example:
--   requires_profile, profile_mode, category, primary_color, secondary_color, logo_url

-- Verification (read-only)
-- SELECT app_code, ecosystem_code, status, metadata FROM public.apps WHERE app_code = 'FLEETOS';
