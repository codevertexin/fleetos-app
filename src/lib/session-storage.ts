import type { AuthSession } from '@/types/session';

export const AUTH_SESSION_KEY = 'fleetos-session';
export const TENANT_ID_KEY = 'fleetos-tenant-id';
export function readAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    const session: AuthSession = {
      ...parsed,
      fleetosMembershipStatus: parsed.fleetosMembershipStatus ?? 'active',
    };
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      clearAuthSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem('fleetos-token');
}
