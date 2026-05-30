import type { AuthSession } from '@/types/session';

/** DEV-only mock tokens from auth.service stubs — must not grant access in production. */
export function isDevMockAuthToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return token.startsWith('mock-sso-token-') || token === 'mock-jwt-token';
}

export function isDevMockSession(session: AuthSession): boolean {
  return isDevMockAuthToken(session.token);
}

/**
 * Whether a persisted session may be restored for app access.
 * Production rejects DEV mock tokens; DEV allows mocks for local SSO testing.
 */
export function isStoredSessionValidForAccess(session: AuthSession | null): boolean {
  if (!session?.user?.codevertexUserId || !session.token?.trim()) {
    return false;
  }
  if (import.meta.env.PROD && isDevMockSession(session)) {
    return false;
  }
  return true;
}
