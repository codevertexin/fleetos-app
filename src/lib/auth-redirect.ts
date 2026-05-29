import type { Location } from 'react-router-dom';
import {
  assertFleetosAuthEntryUrl,
  buildAuthCoreEntryUrl,
  getForgotPasswordUrl,
  getLoginUrl,
  getRegisterUrl,
  logFleetosAuthRedirect,
  type AuthCoreEntryKind,
} from '@/lib/platformLinks';

const AUTH_ROUTE_PREFIXES = ['/login', '/register', '/forgot-password', '/sso'];

/** Post-SSO destination inside FleetOS (path or absolute URL). */
export function resolveAuthFinalDestination(
  location: Pick<Location, 'pathname' | 'search' | 'state'>,
  fallback = '/dashboard',
): string {
  const fromState = location.state as { from?: string } | null;
  const from = fromState?.from;
  if (typeof from === 'string' && from.startsWith('/') && !isAuthRoute(from)) {
    return from;
  }

  const path = `${location.pathname}${location.search}`;
  if (path && path !== '/' && !isAuthRoute(location.pathname)) {
    return path;
  }

  return fallback;
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTE_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectToAuthCoreEntry(
  kind: AuthCoreEntryKind,
  buildUrl: (finalDestination: string) => string,
  location: Pick<Location, 'pathname' | 'search' | 'state'>,
): void {
  const finalDestination = resolveAuthFinalDestination(location);
  const url = buildUrl(finalDestination);
  assertFleetosAuthEntryUrl(url, kind);
  logFleetosAuthRedirect(kind, url);
  window.location.replace(url);
}

export function redirectToAuthCoreLogin(
  location: Pick<Location, 'pathname' | 'search' | 'state'>,
): void {
  redirectToAuthCoreEntry('login', getLoginUrl, location);
}

export function redirectToAuthCoreRegister(
  location: Pick<Location, 'pathname' | 'search' | 'state'>,
): void {
  redirectToAuthCoreEntry('register', getRegisterUrl, location);
}

export function redirectToAuthCoreForgotPassword(): void {
  const url = getForgotPasswordUrl('/login');
  assertFleetosAuthEntryUrl(url, 'forgot-password');
  logFleetosAuthRedirect('forgot-password', url);
  window.location.replace(url);
}

/** @internal — exposed for unit tests */
export function previewAuthCoreLoginUrl(
  location: Pick<Location, 'pathname' | 'search' | 'state'>,
): string {
  return buildAuthCoreEntryUrl('login', resolveAuthFinalDestination(location));
}
