/**
 * CodeVertex Core platform URLs — single source of truth.
 * @see docs/architecture/FLEETOS_CODEVERTEX_COMPLIANCE.md
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

export type HelpSourceSurface = 'external_app_help' | 'in_app_help';

export interface HelpUrlOptions {
  moduleCode?: string;
  screenCode?: FleetosHelpScreen | string;
  locale?: string;
  returnTo?: string;
  sourceSurface?: HelpSourceSurface;
}

const DEFAULT_HELP_MODULE = 'fleetos';
const DEFAULT_HELP_LOCALE = 'pt-PT';
const DEFAULT_HELP_SOURCE: HelpSourceSurface = 'external_app_help';

/** Current browser URL, or app base when not in browser. */
export function getCurrentAppUrl(): string {
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }
  return APP_BASE_URL.replace(/\/$/, '') + '/';
}

export function getSsoCallbackUrl(): string {
  return `${APP_BASE_URL.replace(/\/$/, '')}/sso/callback`;
}

export function getAppLoginUrl(): string {
  return `${APP_BASE_URL.replace(/\/$/, '')}/login`;
}

/**
 * Resolves a FleetOS in-app destination for Auth Core `return_to`.
 * Accepts absolute URL or path (e.g. `/dashboard`).
 */
export function resolveFleetosReturnTo(pathOrUrl?: string): string {
  if (pathOrUrl) {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const base = APP_BASE_URL.replace(/\/$/, '');
    return `${base}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
  }
  return getCurrentAppUrl();
}

/**
 * Auth Core login — `return_url` is always SSO callback; `return_to` is post-login destination in FleetOS.
 */
export function getLoginUrl(finalDestination?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: getSsoCallbackUrl(),
    return_to: resolveFleetosReturnTo(finalDestination),
  });
  return `${AUTH_BASE_URL}/auth/login?${params.toString()}`;
}

/** Auth Core register — same `return_url` / `return_to` contract as login. */
export function getRegisterUrl(finalDestination?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: getSsoCallbackUrl(),
    return_to: resolveFleetosReturnTo(finalDestination),
  });
  return `${AUTH_BASE_URL}/auth/register?${params.toString()}`;
}

export function getForgotPasswordUrl(finalDestination?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: getSsoCallbackUrl(),
    return_to: resolveFleetosReturnTo(finalDestination ?? getAppLoginUrl()),
  });
  return `${AUTH_BASE_URL}/auth/forgot-password?${params.toString()}`;
}

export function getResetPasswordUrl(finalDestination?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: getSsoCallbackUrl(),
    return_to: resolveFleetosReturnTo(finalDestination ?? getAppLoginUrl()),
  });
  return `${AUTH_BASE_URL}/auth/reset-password?${params.toString()}`;
}

/** Auth Core profile (standalone layout). */
export function getAccountUrl(returnTo?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_to: resolveFleetosReturnTo(returnTo),
    layout: 'standalone',
  });
  return `${AUTH_BASE_URL}/account/profile?${params.toString()}`;
}

/** Auth Core security (standalone layout). */
export function getSecurityUrl(returnTo?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_to: resolveFleetosReturnTo(returnTo),
    layout: 'standalone',
  });
  return `${AUTH_BASE_URL}/account/security?${params.toString()}`;
}

/** Auth Core logout — call after clearing local FleetOS session. */
export function getLogoutUrl(returnUrl?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: returnUrl ?? getAppLoginUrl(),
  });
  return `${AUTH_BASE_URL}/logout?${params.toString()}`;
}

export function getBillingUrl(returnTo?: string) {
  const params = new URLSearchParams({ app: APP_CODE });
  if (returnTo) {
    params.set('return_to', resolveFleetosReturnTo(returnTo));
  }
  const qs = params.toString();
  return `${BILLING_BASE_URL.replace(/\/$/, '')}${qs ? `?${qs}` : ''}`;
}

function helpModuleForScreen(screen?: string): string {
  if (!screen) return DEFAULT_HELP_MODULE;
  if (screen === 'driver_home') return 'fleetos_driver';
  if (screen === 'customer_booking') return 'fleetos_customer';
  if (screen === 'operations') return 'fleetos_operations';
  return DEFAULT_HELP_MODULE;
}

/**
 * Help Core — standard query format.
 * https://help.codevertex.cc/help?app_code=FLEETOS&locale=...&module_code=...&screen_code=...&source_surface=...&return_to=...
 */
export function getHelpUrl(
  optionsOrScreen?: HelpUrlOptions | FleetosHelpScreen | string,
  legacyLocale = DEFAULT_HELP_LOCALE,
): string {
  let options: HelpUrlOptions;
  if (typeof optionsOrScreen === 'string') {
    options = { screenCode: optionsOrScreen, locale: legacyLocale };
  } else if (optionsOrScreen) {
    options = optionsOrScreen;
  } else {
    options = {};
  }

  const screenCode = options.screenCode ?? 'dashboard';
  const params = new URLSearchParams({
    app_code: APP_CODE,
    locale: options.locale ?? DEFAULT_HELP_LOCALE,
    module_code: options.moduleCode ?? helpModuleForScreen(String(screenCode)),
    screen_code: String(screenCode),
    source_surface: options.sourceSurface ?? DEFAULT_HELP_SOURCE,
    return_to: resolveFleetosReturnTo(options.returnTo),
  });

  return `${HELP_BASE_URL.replace(/\/$/, '')}/help?${params.toString()}`;
}

export function getLegalUrl(page: LegalPage = 'privacy') {
  const params = new URLSearchParams({ app: APP_CODE });
  return `${LEGAL_BASE_URL.replace(/\/$/, '')}/${page}?${params.toString()}`;
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
