import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getLoginUrl, getLogoutUrl } from '@/lib/platformLinks';
import { hasActiveFleetosMembership } from '@/lib/membership-gate';
import * as authService from '@/lib/services/auth.service';
import {
  clearAuthSession,
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
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  completeSsoLogin: (result: authService.SsoConsumeResult) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeStoredSession(raw: AuthSession): AuthSession {
  return {
    ...raw,
    fleetosMembershipStatus: raw.fleetosMembershipStatus ?? 'active',
  };
}

function mapSsoToSession(result: authService.SsoConsumeResult): AuthSession {
  const fleetosMembership = authService.findFleetosMembership(result.memberships);
  const fleetosMembershipStatus = result.fleetosMembershipStatus;
  const primaryRole =
    fleetosMembership?.role ?? result.roles[0] ?? result.memberships[0]?.role ?? 'viewer';

  return {
    codevertexUserId: result.profile.id,
    token: result.token,
    expiresAt: result.expiresAt,
    roles: result.roles,
    fleetosMembershipStatus,
    user: {
      id: `local-${result.profile.id}`,
      codevertexUserId: result.profile.id,
      name: result.profile.display_name,
      email: result.profile.email,
      role: primaryRole,
      companyId: fleetosMembership?.tenant_id ?? 't1',
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const stored = readAuthSession();
    return stored ? normalizeStoredSession(stored) : null;
  });

  const completeSsoLogin = useCallback((result: authService.SsoConsumeResult) => {
    const next = mapSsoToSession(result);
    writeAuthSession(next);
    localStorage.setItem('fleetos-token', next.token);
    setSession(next);
  }, []);

  const login = useCallback(() => {
    window.location.href = getLoginUrl();
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    clearAuthSession();
    setSession(null);
    window.location.href = getLogoutUrl();
  }, []);

  const fleetosMembershipStatus = session?.fleetosMembershipStatus ?? null;
  const hasActiveFleetosAccess = fleetosMembershipStatus
    ? hasActiveFleetosMembership(fleetosMembershipStatus)
    : false;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      codevertexUserId: session?.codevertexUserId ?? null,
      roles: session?.roles ?? [],
      fleetosMembershipStatus,
      hasActiveFleetosAccess,
      isAuthenticated: Boolean(session?.user),
      isLoading: false,
      login,
      logout,
      completeSsoLogin,
    }),
    [
      session,
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
