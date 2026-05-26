/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_CODE: string;
  readonly VITE_ECOSYSTEM_CODE: string;
  readonly VITE_APP_BASE_URL: string;
  readonly VITE_AUTH_BASE_URL: string;
  readonly VITE_BILLING_BASE_URL: string;
  readonly VITE_HELP_BASE_URL: string;
  readonly VITE_LEGAL_BASE_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
