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
  /** Optional — default `{VITE_SUPABASE_URL}/functions/v1/fleetos-sync-identity` */
  readonly VITE_FLEETOS_SYNC_IDENTITY_URL?: string;
  /** Optional — default `{VITE_SUPABASE_URL}/functions/v1/fleetos-list-tenants` */
  readonly VITE_FLEETOS_LIST_TENANTS_URL?: string;
  /** Optional — default `{VITE_SUPABASE_URL}/functions/v1/fleetos-get-my-access` */
  readonly VITE_FLEETOS_GET_MY_ACCESS_URL?: string;
  /** Optional — default `{VITE_SUPABASE_URL}/functions/v1/fleetos-submit-company` */
  readonly VITE_FLEETOS_SUBMIT_COMPANY_URL?: string;
  /** P1.2C — enable /internal/admin/* platform reviewer UI */
  readonly VITE_ENABLE_PLATFORM_ADMIN_UI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
