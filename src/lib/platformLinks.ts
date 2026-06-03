/**
 * CodeVertex Core platform URLs — single source of truth.
 * @see docs/architecture/FLEETOS_CODEVERTEX_COMPLIANCE.md
 */

export const APP_CODE = import.meta.env.VITE_APP_CODE || 'FLEETOS';
export const ECOSYSTEM_CODE = import.meta.env.VITE_ECOSYSTEM_CODE || 'codevertex';

export const APP_BASE_URL =
  import.meta.env.VITE_APP_BASE_URL || 'http://localhost:4200';

export const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_BASE_URL || 'https://auth.codevertex.cc';

export const BILLING_BASE_URL =
  import.meta.env.VITE_BILLING_BASE_URL || 'https://billing.codevertex.cc';

export const HELP_BASE_URL =
  import.meta.env.VITE_HELP_BASE_URL || 'https://help.codevertex.cc';

export const LEGAL_BASE_URL =
  import.meta.env.VITE_LEGAL_BASE_URL || 'https://legal.codevertex.cc';

/** Auth Core entry paths — never use /account/* for login/register/forgot. */
export const AUTH_CORE_LOGIN_PATH = '/auth/login';
export const AUTH_CORE_REGISTER_PATH = '/auth/register';
export const AUTH_CORE_FORGOT_PASSWORD_PATH = '/auth/forgot-password';
export const AUTH_CORE_RESET_PASSWORD_PATH = '/auth/reset-password';

export type AuthCoreEntryKind = 'login' | 'register' | 'forgot-password' | 'reset-password';

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

export interface PlatformLinksConfig {
  appCode: string;
  appBaseUrl: string;
  authBaseUrl: string;
}

const DEFAULT_HELP_MODULE = 'fleetos';
const DEFAULT_HELP_LOCALE = 'pt-PT';
const DEFAULT_HELP_SOURCE: HelpSourceSurface = 'external_app_help';
/** SSO post-login; `/dashboard` remains a legacy alias → `/operations/dashboard`. */
const DEFAULT_AUTH_POST_LOGIN_PATH = '/operations/dashboard';

export function getPlatformLinksConfig(): PlatformLinksConfig {
  return {
    appCode: APP_CODE,
    appBaseUrl: APP_BASE_URL,
    authBaseUrl: AUTH_BASE_URL,
  };
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Current browser URL, or app base when not in browser. */
export function getCurrentAppUrl(): string {
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }
  return `${trimTrailingSlash(APP_BASE_URL)}/`;
}

export function getSsoCallbackUrl(config: PlatformLinksConfig = getPlatformLinksConfig()): string {
  return `${trimTrailingSlash(config.appBaseUrl)}/sso/callback`;
}

export function getAppLoginUrl(config: PlatformLinksConfig = getPlatformLinksConfig()): string {
  return `${trimTrailingSlash(config.appBaseUrl)}/login`;
}

/** Post–Auth Core logout landing — must not auto-trigger SSO (see Login `signed_out=1`). */
export function getAppLogoutReturnUrl(config: PlatformLinksConfig = getPlatformLinksConfig()): string {
  const url = new URL(getAppLoginUrl(config));
  url.searchParams.set('signed_out', '1');
  return url.toString();
}

/**
 * Post-SSO / post-auth destination inside FleetOS (`return_to` on login/register/forgot).
 * Never falls back to the current browser URL (avoids `/login` confusing Auth Core).
 */
export function resolveAuthPostLoginReturnTo(
  pathOrUrl?: string,
  fallbackPath = DEFAULT_AUTH_POST_LOGIN_PATH,
  config: PlatformLinksConfig = getPlatformLinksConfig(),
): string {
  if (pathOrUrl) {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const base = trimTrailingSlash(config.appBaseUrl);
    return `${base}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
  }
  const base = trimTrailingSlash(config.appBaseUrl);
  return `${base}${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`;
}

/**
 * Return target for standalone account screens (profile/security).
 * Defaults to the current FleetOS page when omitted.
 */
export function resolveAccountReturnTo(
  returnTo?: string,
  config: PlatformLinksConfig = getPlatformLinksConfig(),
): string {
  if (returnTo) {
    if (returnTo.startsWith('http://') || returnTo.startsWith('https://')) {
      return returnTo;
    }
    const base = trimTrailingSlash(config.appBaseUrl);
    return `${base}${returnTo.startsWith('/') ? returnTo : `/${returnTo}`}`;
  }
  return getCurrentAppUrl();
}

/**
 * @deprecated Use resolveAuthPostLoginReturnTo or resolveAccountReturnTo explicitly.
 */
export function resolveFleetosReturnTo(pathOrUrl?: string): string {
  return resolveAuthPostLoginReturnTo(pathOrUrl);
}

function authCoreEntryPath(kind: AuthCoreEntryKind): string {
  switch (kind) {
    case 'login':
      return AUTH_CORE_LOGIN_PATH;
    case 'register':
      return AUTH_CORE_REGISTER_PATH;
    case 'forgot-password':
      return AUTH_CORE_FORGOT_PASSWORD_PATH;
    case 'reset-password':
      return AUTH_CORE_RESET_PASSWORD_PATH;
  }
}

/** Builds Auth Core sign-in/register/forgot URLs (never /account/*). */
export function buildAuthCoreEntryUrl(
  kind: AuthCoreEntryKind,
  finalDestination?: string,
  config: PlatformLinksConfig = getPlatformLinksConfig(),
): string {
  const params = new URLSearchParams({
    app: config.appCode,
    return_url: getSsoCallbackUrl(config),
    return_to: resolveAuthPostLoginReturnTo(finalDestination, DEFAULT_AUTH_POST_LOGIN_PATH, config),
  });
  return `${trimTrailingSlash(config.authBaseUrl)}${authCoreEntryPath(kind)}?${params.toString()}`;
}

/**
 * Auth Core login — `return_url` is always SSO callback; `return_to` is post-login destination in FleetOS.
 */
export function getLoginUrl(finalDestination?: string): string {
  return buildAuthCoreEntryUrl('login', finalDestination);
}

/** Auth Core register — same `return_url` / `return_to` contract as login. */
export function getRegisterUrl(finalDestination?: string): string {
  return buildAuthCoreEntryUrl('register', finalDestination);
}

export function getForgotPasswordUrl(finalDestination?: string): string {
  return buildAuthCoreEntryUrl(
    'forgot-password',
    finalDestination ?? '/login',
  );
}

export function getResetPasswordUrl(finalDestination?: string): string {
  return buildAuthCoreEntryUrl(
    'reset-password',
    finalDestination ?? '/login',
  );
}

/** Auth Core profile (standalone layout) — settings only, not sign-in. */
export function getAccountUrl(returnTo?: string): string {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_to: resolveAccountReturnTo(returnTo),
    layout: 'standalone',
  });
  return `${trimTrailingSlash(AUTH_BASE_URL)}/account/profile?${params.toString()}`;
}

/** Auth Core security (standalone layout) — settings only, not sign-in. */
export function getSecurityUrl(returnTo?: string): string {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_to: resolveAccountReturnTo(returnTo),
    layout: 'standalone',
  });
  return `${trimTrailingSlash(AUTH_BASE_URL)}/account/security?${params.toString()}`;
}

/** Ensures auth entry redirects never target /account/profile or /account/security. */
export function assertFleetosAuthEntryUrl(url: string, kind: AuthCoreEntryKind): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`[fleetos:auth] Invalid auth redirect URL: ${url}`);
  }

  const expectedPath = authCoreEntryPath(kind);
  if (!parsed.pathname.endsWith(expectedPath)) {
    throw new Error(
      `[fleetos:auth] Expected Auth Core path "${expectedPath}", got "${parsed.pathname}" (${url})`,
    );
  }

  if (parsed.pathname.includes('/account/')) {
    throw new Error(`[fleetos:auth] Auth entry must not use /account/* (${url})`);
  }

  const returnUrl = parsed.searchParams.get('return_url');
  if (!returnUrl?.includes('/sso/callback')) {
    throw new Error(`[fleetos:auth] return_url must be FleetOS SSO callback (${url})`);
  }

  if (!parsed.searchParams.get('return_to')) {
    throw new Error(`[fleetos:auth] return_to is required (${url})`);
  }
}

/** DEV-only log before navigating to Auth Core sign-in flows. */
export function logFleetosAuthRedirect(kind: AuthCoreEntryKind, url: string): void {
  if (!import.meta.env.DEV) return;
  console.info(`[fleetos:auth] redirect → ${kind}`, url);
}

/** Auth Core logout — call after clearing local FleetOS session. Never use account/profile. */
export function getLogoutUrl(returnUrl?: string) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: returnUrl ?? getAppLogoutReturnUrl(),
  });
  return `${trimTrailingSlash(AUTH_BASE_URL)}/logout?${params.toString()}`;
}

export function getBillingUrl(returnTo?: string) {
  const params = new URLSearchParams({ app: APP_CODE });
  if (returnTo) {
    params.set('return_to', resolveAccountReturnTo(returnTo));
  }
  const qs = params.toString();
  return `${trimTrailingSlash(BILLING_BASE_URL)}${qs ? `?${qs}` : ''}`;
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
    return_to: resolveAccountReturnTo(options.returnTo),
  });

  return `${trimTrailingSlash(HELP_BASE_URL)}/help?${params.toString()}`;
}

export function getLegalUrl(page: LegalPage = 'privacy') {
  const params = new URLSearchParams({ app: APP_CODE });
  return `${trimTrailingSlash(LEGAL_BASE_URL)}/${page}?${params.toString()}`;
}

/** Maps admin/mobile routes to contextual HELP screen codes. */
export function getHelpScreenFromPath(pathname: string): FleetosHelpScreen {
  if (
    pathname.startsWith('/admin/vehicles') ||
    pathname.startsWith('/app/vehicles')
  ) {
    return 'vehicles';
  }
  if (
    pathname === '/operations/dashboard' ||
    pathname.startsWith('/dashboard')
  ) {
    return 'dashboard';
  }
  if (pathname.startsWith('/operations/bookings') || pathname.startsWith('/bookings')) {
    return 'bookings';
  }
  if (pathname.startsWith('/vehicles')) return 'vehicles';
  if (pathname.startsWith('/drivers') || pathname.startsWith('/admin/drivers')) return 'drivers';
  if (
    pathname.startsWith('/operations/finance') ||
    pathname.startsWith('/finance') ||
    pathname === '/expenses' ||
    pathname === '/incomes' ||
    pathname === '/payouts'
  ) {
    return 'finance';
  }
  if (pathname.startsWith('/operations/reports') || pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/settings') || pathname.startsWith('/admin/settings')) return 'settings';
  if (pathname.startsWith('/operations/dispatch') || pathname === '/operations') return 'operations';
  if (pathname === '/driver' || pathname.startsWith('/driver/')) return 'driver_home';
  if (pathname.startsWith('/book/')) return 'customer_booking';
  return 'dashboard';
}

export function openExternalUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
