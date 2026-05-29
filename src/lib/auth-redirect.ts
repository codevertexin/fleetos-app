import type { Location } from 'react-router-dom';
import {
  getForgotPasswordUrl,
  getLoginUrl,
  getRegisterUrl,
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

export function redirectToAuthCoreLogin(location: Pick<Location, 'pathname' | 'search' | 'state'>): void {
  window.location.replace(getLoginUrl(resolveAuthFinalDestination(location)));
}

export function redirectToAuthCoreRegister(
  location: Pick<Location, 'pathname' | 'search' | 'state'>,
): void {
  window.location.replace(getRegisterUrl(resolveAuthFinalDestination(location)));
}

export function redirectToAuthCoreForgotPassword(): void {
  window.location.replace(getForgotPasswordUrl('/login'));
}
