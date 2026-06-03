import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isValidUuid } from '@/lib/auth-core-jwt';
import { redirectToAuthCoreLogin } from '@/lib/auth-redirect';
import { getAppLogoutReturnUrl, getLogoutUrl } from '@/lib/platformLinks';
import { hasActiveFleetosMembership } from '@/lib/membership-gate';
import type { OperationalIdentitySyncMeta } from '@/lib/services/fleetos-identity-sync.service';
import * as authService from '@/lib/services/auth.service';
import {
  CodevertexEdgeJwtExpiredError,
  handleCodevertexEdgeSessionExpired,
  isCodevertexEdgeJwtValid,
} from '@/lib/codevertex-edge-jwt';
import { isDevMockSession, isStoredSessionValidForAccess } from '@/lib/session-guards';
import {
  clearFleetosClientState,
  readAuthSession,
  writeAuthSession,
} from '@/lib/session-storage';
import { readAccessRedirect } from '@/lib/access-routing';
import {
  fetchMyAccess,
  isGetMyAccessConfigured,
} from '@/lib/services/fleetos-access.service';
import type { FleetosAccessState } from '@/types/fleetos-access';
import type { AuthSession, FleetosMembershipStatus, FleetosRole, SessionUser } from '@/types/session';
import type { FleetosOperationalAccess } from '@/types/fleetos-access';

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
  /** P0.3A — operational router from `fleetos-get-my-access`. */
  accessState: FleetosAccessState | null;
  accessRedirectPath: string | null;
  operationalAccess: FleetosOperationalAccess | null;
  /** True while hydrating `operationalAccess` after session restore. */
  isAccessResolving: boolean;
  completeSsoLogin: (
    result: authService.SsoConsumeResult,
    operational?: OperationalIdentitySyncMeta | null,
    access?: FleetosOperationalAccess | null,
  ) => void;
  /** Update `operationalAccess` after submit-company or access refresh. */
  patchOperationalAccess: (access: FleetosOperationalAccess) => void;
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
  access?: FleetosOperationalAccess | null,
): AuthSession {
  const fleetosMembership = authService.findFleetosMembership(result.memberships);
  const fleetosMembershipStatus = result.fleetosMembershipStatus;
  const primaryRole =
    fleetosMembership?.role ?? result.roles[0] ?? result.memberships[0]?.role ?? 'viewer';

  const tenantFromMembership = fleetosMembership?.tenant_id;
  const tenantFromAccess =
    access?.tenant?.id && isValidUuid(access.tenant.id) ? access.tenant.id : null;

  const primaryOperationalTenant =
    operational?.operationalPrimaryTenantId && isValidUuid(operational.operationalPrimaryTenantId)
      ? operational.operationalPrimaryTenantId
      : tenantFromAccess ??
        (tenantFromMembership && isValidUuid(tenantFromMembership)
          ? tenantFromMembership
          : 't1');

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
    operationalAccess: access ?? null,
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
    (
      result: authService.SsoConsumeResult,
      operational?: OperationalIdentitySyncMeta | null,
      access?: FleetosOperationalAccess | null,
    ) => {
      const next = mapSsoToSession(result, operational ?? null, access ?? null);
      writeAuthSession(next);
      setSession(next);
    },
    [],
  );

  const patchOperationalAccess = useCallback((access: FleetosOperationalAccess) => {
    setSession(prev => {
      if (!prev) return prev;
      const next: AuthSession = {
        ...prev,
        operationalAccess: access,
        user: {
          ...prev.user,
          companyId:
            access.tenant?.id && isValidUuid(access.tenant.id)
              ? access.tenant.id
              : prev.user.companyId,
        },
      };
      writeAuthSession(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!session?.codevertexEdgeJwt?.trim() || session.operationalAccess) {
      return;
    }
    if (
      !isCodevertexEdgeJwtValid(
        session.codevertexEdgeJwt,
        session.codevertexEdgeJwtExpiresAt,
      )
    ) {
      clearFleetosClientState();
      handleCodevertexEdgeSessionExpired();
      return;
    }
    if (!isGetMyAccessConfigured()) {
      return;
    }
    let cancelled = false;
    fetchMyAccess(session.codevertexEdgeJwt, {
      expiresAt: session.codevertexEdgeJwtExpiresAt,
    })
      .then(access => {
        if (cancelled) return;
        setSession(prev => {
          if (!prev) return prev;
          const next: AuthSession = {
            ...prev,
            operationalAccess: access,
            user: {
              ...prev.user,
              companyId:
                access.tenant?.id && isValidUuid(access.tenant.id)
                  ? access.tenant.id
                  : prev.user.companyId,
            },
          };
          writeAuthSession(next);
          return next;
        });
      })
      .catch(e => {
        if (e instanceof CodevertexEdgeJwtExpiredError) {
          clearFleetosClientState();
          handleCodevertexEdgeSessionExpired();
          return;
        }
        if (import.meta.env.DEV) {
          console.warn('[fleetos:auth] get-my-access bootstrap failed', e);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session?.codevertexEdgeJwt, session?.codevertexEdgeJwtExpiresAt, session?.operationalAccess]);

  const login = useCallback(() => {
    redirectToAuthCoreLogin({
      pathname: window.location.pathname,
      search: window.location.search,
      state: null,
    });
  }, []);

  const logout = useCallback(async () => {
    const signedOutLanding = getAppLogoutReturnUrl();
    const logoutUrl = getLogoutUrl(signedOutLanding);
    await authService.logout();
    queryClient.clear();
    clearFleetosClientState();
    // Do not setSession(null) here — ProtectedRoute would Navigate to /login with
    // state.from=/dashboard and Login would SSO back to the dashboard before replace runs.
    if (import.meta.env.DEV) {
      console.info('[fleetos:auth] logout → Auth Core', logoutUrl);
    }
    window.location.replace(logoutUrl);
  }, [queryClient]);

  const sessionIsValid = session ? isStoredSessionValidForAccess(session) : false;
  const fleetosMembershipStatus = session?.fleetosMembershipStatus ?? null;
  const operationalAccess = sessionIsValid ? (session?.operationalAccess ?? null) : null;
  const accessState = operationalAccess?.accessState ?? null;
  const accessRedirectPath = operationalAccess
    ? readAccessRedirect(operationalAccess)
    : null;
  const isAccessResolving =
    sessionIsValid &&
    Boolean(session?.codevertexEdgeJwt?.trim()) &&
    !operationalAccess &&
    isGetMyAccessConfigured();
  const hasActiveFleetosAccess = fleetosMembershipStatus
    ? hasActiveFleetosMembership(fleetosMembershipStatus)
    : false;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: sessionIsValid ? (session?.user ?? null) : null,
      codevertexUserId: sessionIsValid ? (session?.codevertexUserId ?? null) : null,
      roles: sessionIsValid ? (session?.roles ?? []) : [],
      fleetosMembershipStatus: sessionIsValid ? fleetosMembershipStatus : null,
      hasActiveFleetosAccess: sessionIsValid ? hasActiveFleetosAccess : false,
      accessState: sessionIsValid ? accessState : null,
      accessRedirectPath: sessionIsValid ? accessRedirectPath : null,
      operationalAccess: sessionIsValid ? operationalAccess : null,
      isAccessResolving: sessionIsValid ? isAccessResolving : false,
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
      patchOperationalAccess,
    }),
    [
      session,
      sessionIsValid,
      fleetosMembershipStatus,
      hasActiveFleetosAccess,
      accessState,
      accessRedirectPath,
      operationalAccess,
      isAccessResolving,
      login,
      logout,
      completeSsoLogin,
      patchOperationalAccess,
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
