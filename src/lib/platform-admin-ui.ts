/** Platform internal admin UI (P1.2C) — gated by build-time env. */
export function isPlatformAdminUiEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_PLATFORM_ADMIN_UI === 'true';
}
