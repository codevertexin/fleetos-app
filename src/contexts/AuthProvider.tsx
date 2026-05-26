import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getLoginUrl } from '@/lib/platformLinks';
import * as authService from '@/lib/services/auth.service';
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from '@/lib/session-storage';
import type { AuthSession, FleetosRole, SessionUser } from '@/types/session';

interface AuthContextValue {
  user: SessionUser | null;
  codevertexUserId: string | null;
  roles: FleetosRole[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  completeSsoLogin: (result: authService.SsoConsumeResult) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapSsoToSession(result: authService.SsoConsumeResult): AuthSession {
  const primaryRole = result.roles[0] ?? result.memberships[0]?.role ?? 'viewer';
  const membership = result.memberships.find(m => m.app_code === 'FLEETOS') ?? result.memberships[0];

  return {
    codevertexUserId: result.profile.id,
    token: result.token,
    expiresAt: result.expiresAt,
    roles: result.roles,
    user: {
      id: `local-${result.profile.id}`,
      codevertexUserId: result.profile.id,
      name: result.profile.display_name,
      email: result.profile.email,
      role: primaryRole,
      companyId: membership?.tenant_id ?? 't1',
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());

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
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      codevertexUserId: session?.codevertexUserId ?? null,
      roles: session?.roles ?? [],
      isAuthenticated: Boolean(session?.user),
      isLoading: false,
      login,
      logout,
      completeSsoLogin,
    }),
    [session, login, logout, completeSsoLogin],
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
