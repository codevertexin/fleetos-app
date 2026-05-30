import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isValidUuid } from '@/lib/auth-core-jwt';
import { redirectToAuthCoreLogin } from '@/lib/auth-redirect';
import { getLogoutUrl } from '@/lib/platformLinks';
import { hasActiveFleetosMembership } from '@/lib/membership-gate';
import type { OperationalIdentitySyncMeta } from '@/lib/services/fleetos-identity-sync.service';
import * as authService from '@/lib/services/auth.service';
import { isDevMockSession, isStoredSessionValidForAccess } from '@/lib/session-guards';
import {
  clearFleetosClientState,
  readAuthSession,
  writeAuthSession,
} from '@/lib/session-storage';
import type { AuthSession, FleetosMembershipStatus, FleetosRole, SessionUser } from '@/types/session';

interface AuthContextValue {
  user: SessionUser | null;
  codevertexUserId: string | null;
  roles: FleetosRole[];
  fleetosMembershipStatus: FleetosMembershipStatus | null;
  hasActiveFleetosAccess: boolean;
  isAuthenticated: boolean;
  /** True when session is a DEV mock token (never in production). */
  isDevMockSession: boolean;
  isLoading: boolean;
  /** Phase 6 — short-lived `codevertex_edge_jwt` for Edge calls (never send user-controlled IDs). */
  codevertexEdgeJwt: string | null;
  codevertexEdgeJwtExpiresAt: string | null;
  login: () => void;
  logout: () => Promise<void>;
  completeSsoLogin: (
    result: authService.SsoConsumeResult,
    operational?: OperationalIdentitySyncMeta | null,
  ) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeStoredSession(raw: AuthSession): AuthSession {
  return {
    ...raw,
    fleetosMembershipStatus: raw.fleetosMembershipStatus ?? 'missing',
  };
}

function mapSsoToSession(
  result: authService.SsoConsumeResult,
  operational?: OperationalIdentitySyncMeta | null,
): AuthSession {
  const fleetosMembership = authService.findFleetosMembership(result.memberships);
  const fleetosMembershipStatus = result.fleetosMembershipStatus;
  const primaryRole =
    fleetosMembership?.role ?? result.roles[0] ?? result.memberships[0]?.role ?? 'viewer';

  const tenantFromMembership = fleetosMembership?.tenant_id;
  const primaryOperationalTenant =
    operational?.operationalPrimaryTenantId && isValidUuid(operational.operationalPrimaryTenantId)
      ? operational.operationalPrimaryTenantId
      : tenantFromMembership && isValidUuid(tenantFromMembership)
        ? tenantFromMembership
        : 't1';

  return {
    codevertexUserId: result.profile.id,
    token: result.token,
    expiresAt: result.expiresAt,
    roles: result.roles,
    fleetosMembershipStatus,
    codevertexEdgeJwt: result.codevertexEdgeJwt,
    codevertexEdgeJwtExpiresAt: result.codevertexEdgeJwtExpiresAt,
    operationalPrimaryTenantId: operational?.operationalPrimaryTenantId ?? null,
    operationalProfileId: operational?.operationalProfileId ?? null,
    user: {
      id: `local-${result.profile.id}`,
      codevertexUserId: result.profile.id,
      name: result.profile.display_name,
      email: result.profile.email,
      role: primaryRole,
      companyId: primaryOperationalTenant,
    },
  };
}

function loadInitialSession(): AuthSession | null {
  const stored = readAuthSession();
  if (!stored) return null;
  const normalized = normalizeStoredSession(stored);
  if (!isStoredSessionValidForAccess(normalized)) {
    clearFleetosClientState();
    return null;
  }
  return normalized;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(loadInitialSession);

  const completeSsoLogin = useCallback(
    (result: authService.SsoConsumeResult, operational?: OperationalIdentitySyncMeta | null) => {
      const next = mapSsoToSession(result, operational ?? null);
      writeAuthSession(next);
      setSession(next);
    },
    [],
  );

  const login = useCallback(() => {
    redirectToAuthCoreLogin({
      pathname: window.location.pathname,
      search: window.location.search,
      state: null,
    });
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    queryClient.clear();
    clearFleetosClientState();
    setSession(null);
    const logoutUrl = getLogoutUrl();
    if (import.meta.env.DEV) {
      console.info('[fleetos:auth] logout → Auth Core', logoutUrl);
    }
    window.location.replace(logoutUrl);
  }, [queryClient]);

  const fleetosMembershipStatus = session?.fleetosMembershipStatus ?? null;
  const hasActiveFleetosAccess = fleetosMembershipStatus
    ? hasActiveFleetosMembership(fleetosMembershipStatus)
    : false;
  const sessionIsValid = session ? isStoredSessionValidForAccess(session) : false;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: sessionIsValid ? (session?.user ?? null) : null,
      codevertexUserId: sessionIsValid ? (session?.codevertexUserId ?? null) : null,
      roles: sessionIsValid ? (session?.roles ?? []) : [],
      fleetosMembershipStatus: sessionIsValid ? fleetosMembershipStatus : null,
      hasActiveFleetosAccess: sessionIsValid ? hasActiveFleetosAccess : false,
      isAuthenticated: sessionIsValid && Boolean(session?.user),
      isDevMockSession: session ? isDevMockSession(session) : false,
      isLoading: false,
      codevertexEdgeJwt: sessionIsValid ? (session?.codevertexEdgeJwt?.trim() ?? null) : null,
      codevertexEdgeJwtExpiresAt: sessionIsValid
        ? (session?.codevertexEdgeJwtExpiresAt?.trim() ?? null)
        : null,
      login,
      logout,
      completeSsoLogin,
    }),
    [
      session,
      sessionIsValid,
      fleetosMembershipStatus,
      hasActiveFleetosAccess,
      login,
      logout,
      completeSsoLogin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
