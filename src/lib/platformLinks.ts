/**
 * CodeVertex Core platform URLs — single source of truth.
 * @see docs/integration/FLEETOS_CORE_INTEGRATION_IMPLEMENTATION.md
 */

export const APP_CODE = import.meta.env.VITE_APP_CODE || 'FLEETOS';
export const ECOSYSTEM_CODE = import.meta.env.VITE_ECOSYSTEM_CODE || 'codevertex';

export const APP_BASE_URL =
  import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5173';

export const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_BASE_URL || 'https://auth.codevertex.cc';

export const BILLING_BASE_URL =
  import.meta.env.VITE_BILLING_BASE_URL || 'https://billing.codevertex.cc';

export const HELP_BASE_URL =
  import.meta.env.VITE_HELP_BASE_URL || 'https://help.codevertex.cc';

export const LEGAL_BASE_URL =
  import.meta.env.VITE_LEGAL_BASE_URL || 'https://legal.codevertex.cc';

export type LegalPage =
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'security'
  | 'gdpr'
  | 'data-request'
  | 'delete-request'
  | 'dpa'
  | 'subprocessors'
  | 'contact';

export type FleetosHelpScreen =
  | 'dashboard'
  | 'vehicles'
  | 'drivers'
  | 'bookings'
  | 'finance'
  | 'reports'
  | 'settings'
  | 'operations'
  | 'driver_home'
  | 'customer_booking';

export function getSsoCallbackUrl(): string {
  return `${APP_BASE_URL.replace(/\/$/, '')}/sso/callback`;
}

export function getAppLoginUrl(): string {
  return `${APP_BASE_URL.replace(/\/$/, '')}/login`;
}

function resolveSsoReturnUrl(returnUrl?: string): string {
  if (returnUrl) return returnUrl;
  return getSsoCallbackUrl();
}

function resolveLogoutReturnUrl(returnUrl?: string): string {
  if (returnUrl) return returnUrl;
  return getAppLoginUrl();
}

export function getLoginUrl(returnUrl?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: resolveSsoReturnUrl(returnUrl),
  });
  return `${AUTH_BASE_URL}/auth/login?${params.toString()}`;
}

export function getRegisterUrl(returnUrl?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: resolveSsoReturnUrl(returnUrl),
  });
  return `${AUTH_BASE_URL}/auth/register?${params.toString()}`;
}

export function getForgotPasswordUrl(returnUrl?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: resolveSsoReturnUrl(returnUrl),
  });
  return `${AUTH_BASE_URL}/auth/forgot-password?${params.toString()}`;
}

export function getResetPasswordUrl() {
  const params = new URLSearchParams({ app: APP_CODE });
  return `${AUTH_BASE_URL}/auth/reset-password?${params.toString()}`;
}

export function getAccountUrl() {
  const params = new URLSearchParams({ app: APP_CODE });
  return `${AUTH_BASE_URL}/account/profile?${params.toString()}`;
}

export function getSecurityUrl() {
  const params = new URLSearchParams({ app: APP_CODE });
  return `${AUTH_BASE_URL}/account/security?${params.toString()}`;
}

/** Auth Core logout — call after clearing local FleetOS session. */
export function getLogoutUrl(returnUrl?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: resolveLogoutReturnUrl(returnUrl),
  });
  return `${AUTH_BASE_URL}/logout?${params.toString()}`;
}

export function getBillingUrl() {
  return `${BILLING_BASE_URL}?app=${APP_CODE}`;
}

export function getHelpUrl(screen?: string, locale = 'pt-PT') {
  const params = new URLSearchParams({
    app: APP_CODE,
    locale,
  });
  if (screen) {
    params.set('screen', screen);
  }
  return `${HELP_BASE_URL}/help/${APP_CODE}?${params.toString()}`;
}

export function getLegalUrl(page: LegalPage = 'privacy') {
  return `${LEGAL_BASE_URL}/${page}?app=${APP_CODE}`;
}

/** Maps admin/mobile routes to contextual HELP screen codes. */
export function getHelpScreenFromPath(pathname: string): FleetosHelpScreen {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return 'dashboard';
  if (pathname.startsWith('/vehicles')) return 'vehicles';
  if (pathname.startsWith('/drivers')) return 'drivers';
  if (pathname.startsWith('/bookings')) return 'bookings';
  if (pathname.startsWith('/finance') || pathname === '/expenses' || pathname === '/incomes' || pathname === '/payouts') {
    return 'finance';
  }
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/operations')) return 'operations';
  if (pathname === '/driver' || pathname.startsWith('/driver/')) return 'driver_home';
  if (pathname.startsWith('/book/')) return 'customer_booking';
  return 'dashboard';
}

export function openExternalUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
