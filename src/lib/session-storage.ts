import type { AuthSession } from '@/types/session';

export const AUTH_SESSION_KEY = 'fleetos-session';
export const TENANT_ID_KEY = 'fleetos-tenant-id';
const FLEETOS_TOKEN_KEY = 'fleetos-token';

/** Legacy / ecosystem keys that must not survive logout. */
const LEGACY_LOCAL_STORAGE_KEYS = [
  'codevertex-session',
  'codevertex-token',
  'cv-auth-session',
  'cv-session',
] as const;

const SSO_STORAGE_PREFIXES = ['fleetos-sso-consumed:', 'fleetos-sso-processing:'] as const;

export function readAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    const session: AuthSession = {
      ...parsed,
      fleetosMembershipStatus: parsed.fleetosMembershipStatus ?? 'missing',
    };
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      clearFleetosClientState();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(FLEETOS_TOKEN_KEY, session.token);
}

/** @deprecated Use clearFleetosClientState */
export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(FLEETOS_TOKEN_KEY);
}

/** Clears SSO consume guards from sessionStorage. */
export function clearSsoSessionStorage(): void {
  if (typeof sessionStorage === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key) continue;
    if (SSO_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix))) {
      keys.push(key);
    }
  }
  keys.forEach(key => sessionStorage.removeItem(key));
}

/**
 * Full FleetOS client sign-out — auth session, tenant selection, SSO guards, legacy CodeVertex keys.
 */
export function clearFleetosClientState(): void {
  clearAuthSession();
  try {
    localStorage.removeItem(TENANT_ID_KEY);
    for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore quota / private mode
  }
  clearSsoSessionStorage();
}

/** @deprecated Alias for clearFleetosClientState */
export const clearCodeVertexSession = clearFleetosClientState;
