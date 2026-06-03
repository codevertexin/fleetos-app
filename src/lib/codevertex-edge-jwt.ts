/**
 * `codevertex_edge_jwt` lifetime checks before FleetOS Edge calls.
 */

import { parseJwtPayload } from '@/lib/auth-core-jwt';
import { redirectToAuthCoreLogin } from '@/lib/auth-redirect';
import { clearFleetosClientState } from '@/lib/session-storage';
import { isDevMockAuthToken } from '@/lib/session-guards';

/** Reject tokens expiring within this window (seconds). */
export const EDGE_JWT_EXPIRY_SKEW_SEC = 60;

export const EDGE_SESSION_EXPIRED_MESSAGE = 'Session expired. Please sign in again.';

export class CodevertexEdgeJwtExpiredError extends Error {
  readonly code = 'session_expired';

  constructor(message = EDGE_SESSION_EXPIRED_MESSAGE) {
    super(message);
    this.name = 'CodevertexEdgeJwtExpiredError';
  }
}

let sessionExpiryRedirectStarted = false;

const AUTH_ENTRY_PREFIXES = ['/login', '/register', '/forgot-password', '/sso'] as const;

function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function getCodevertexEdgeJwtExpUnix(jwt: string): number | null {
  const payload = parseJwtPayload(jwt.trim());
  if (!payload) return null;
  const exp = payload.exp;
  if (typeof exp === 'number' && Number.isFinite(exp)) return Math.floor(exp);
  if (typeof exp === 'string' && /^\d+$/.test(exp.trim())) {
    return parseInt(exp.trim(), 10);
  }
  return null;
}

function expiresAtIsoToUnix(expiresAt: string): number | null {
  const ms = Date.parse(expiresAt.trim());
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

/**
 * True when the Edge JWT is present and `exp` (or `expiresAt`) is at least 60s in the future.
 */
export function isCodevertexEdgeJwtValid(
  jwt: string | null | undefined,
  expiresAt?: string | null | undefined,
): boolean {
  const token = jwt?.trim();
  if (!token) return false;

  if (import.meta.env.DEV && isDevMockAuthToken(token)) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  const threshold = now + EDGE_JWT_EXPIRY_SKEW_SEC;

  const expUnix = getCodevertexEdgeJwtExpUnix(token);
  if (expUnix != null) {
    return expUnix >= threshold;
  }

  if (expiresAt?.trim()) {
    const isoExp = expiresAtIsoToUnix(expiresAt);
    if (isoExp != null) {
      return isoExp >= threshold;
    }
  }

  return false;
}

export function assertCodevertexEdgeJwtValid(
  jwt: string | null | undefined,
  expiresAt?: string | null | undefined,
): string {
  const token = jwt?.trim();
  if (!token || !isCodevertexEdgeJwtValid(token, expiresAt)) {
    throw new CodevertexEdgeJwtExpiredError();
  }
  return token;
}

/** Clears FleetOS client state and starts a fresh Auth Core SSO round-trip. */
export function handleCodevertexEdgeSessionExpired(): never {
  if (typeof window !== 'undefined' && !sessionExpiryRedirectStarted) {
    sessionExpiryRedirectStarted = true;
    clearFleetosClientState();
    const { pathname, search } = window.location;
    if (!isAuthEntryPath(pathname)) {
      redirectToAuthCoreLogin({
        pathname,
        search,
        state: null,
      });
    }
  }
  throw new CodevertexEdgeJwtExpiredError();
}

export function isEdgeJwtUnauthorizedResponse(
  status: number,
  code?: string,
  message?: string,
): boolean {
  if (status !== 401) return false;
  const hay = `${code ?? ''} ${message ?? ''}`.toLowerCase();
  return (
    hay.includes('exp') ||
    hay.includes('jwt') ||
    hay.includes('token') ||
    hay.includes('unauthorized') ||
    hay.includes('session')
  );
}

/** @internal — reset guard for unit tests */
export function resetCodevertexEdgeSessionExpiryGuardForTests(): void {
  sessionExpiryRedirectStarted = false;
}
