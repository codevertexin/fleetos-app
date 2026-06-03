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
  /** P2.1 — optional vehicle Edge URL overrides */
  readonly VITE_FLEETOS_LIST_VEHICLES_URL?: string;
  readonly VITE_FLEETOS_CREATE_VEHICLE_URL?: string;
  readonly VITE_FLEETOS_UPDATE_VEHICLE_URL?: string;
  readonly VITE_FLEETOS_DEACTIVATE_VEHICLE_URL?: string;
  /** P2.1 — use mock-data.ts vehicles instead of Edge (dev only) */
  readonly VITE_FLEETOS_USE_VEHICLE_MOCK?: string;
  /** P2.2 — optional driver Edge URL overrides */
  readonly VITE_FLEETOS_LIST_DRIVERS_URL?: string;
  readonly VITE_FLEETOS_CREATE_DRIVER_URL?: string;
  readonly VITE_FLEETOS_UPDATE_DRIVER_URL?: string;
  readonly VITE_FLEETOS_DEACTIVATE_DRIVER_URL?: string;
  /** P2.2 — use mock-data.ts drivers instead of Edge (dev only) */
  readonly VITE_FLEETOS_USE_DRIVER_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
