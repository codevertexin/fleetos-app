import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { TENANT_ID_KEY } from '@/lib/session-storage';
import {
  fetchOperationalTenantsFromEdge,
  isCodevertexEdgeJwtValid,
  isListTenantsConfigured,
} from '@/lib/services/fleetos-identity-sync.service';
import type { FleetosTenant, TenantBranding } from '@/types/session';
import { shouldFetchOperationalTenants } from '@/lib/access-routing';
import { useAuth } from './AuthProvider';

/** DEV-only fallback when Edge tenant list is not configured. */
const MOCK_TENANTS: FleetosTenant[] = [
  {
    id: 't1',
    slug: 'demo-company',
    name: 'FleetOS Demo Company',
    branding: {
      accentColor: '#00B39A',
      logoUrl: '/logo.png',
      companyName: 'FleetOS Demo Company',
    },
  },
];

function readStoredTenantId(): string | null {
  try {
    return localStorage.getItem(TENANT_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Resolves current tenant id.
 *
 * TODO(Phase 6+): when `availableTenants.length > 1`, add an explicit tenant selector UI.
 * Until then, if localStorage / hints do not match, we temporarily pin `tenants[0]` so the
 * shell can render; this is not a long-term multi-tenant UX.
 */
function resolveTenantId(
  overrideId: string | null,
  tenants: FleetosTenant[],
  companyIdHint?: string | null,
): string | null {
  if (tenants.length === 0) return null;

  if (overrideId && tenants.some(t => t.id === overrideId)) {
    return overrideId;
  }
  const stored = readStoredTenantId();
  if (stored && tenants.some(t => t.id === stored)) {
    return stored;
  }
  if (companyIdHint && tenants.some(t => t.id === companyIdHint)) {
    return companyIdHint;
  }
  if (tenants.length === 1) {
    return tenants[0]!.id;
  }
  return tenants[0]!.id;
}

interface TenantContextValue {
  currentTenant: FleetosTenant | null;
  availableTenants: FleetosTenant[];
  tenantSlug: string | null;
  tenantBranding: TenantBranding | null;
  switchTenant: (tenantId: string) => void;
  /** True while `fleetos-list-tenants` Edge request is in flight. */
  isOperationalTenantsLoading: boolean;
  /** False when Edge list is required but user has zero operational tenants. */
  canAccessOperationalShell: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    accessState,
    user,
    isDevMockSession,
    codevertexEdgeJwt,
    codevertexEdgeJwtExpiresAt,
  } = useAuth();
  const operationalShellActive = shouldFetchOperationalTenants(accessState);
  const [tenantOverrideId, setTenantOverrideId] = useState<string | null>(null);

  const listTenantsConfigured = isListTenantsConfigured();
  const edgeJwtValid = isCodevertexEdgeJwtValid(
    codevertexEdgeJwt,
    codevertexEdgeJwtExpiresAt,
  );

  const edgeListEnabled =
    isAuthenticated &&
    operationalShellActive &&
    listTenantsConfigured &&
    edgeJwtValid;

  const edgeJwtForQuery = codevertexEdgeJwt?.trim() ?? '';

  const operationalTenantsQuery = useQuery({
    queryKey: ['fleetos-operational-tenants', edgeJwtForQuery, codevertexEdgeJwtExpiresAt ?? ''],
    enabled: edgeListEnabled && Boolean(edgeJwtForQuery),
    queryFn: () =>
      fetchOperationalTenantsFromEdge(edgeJwtForQuery, codevertexEdgeJwtExpiresAt),
    staleTime: 60_000,
    retry: false,
  });

  const allowDevMockTenants =
    import.meta.env.DEV &&
    isAuthenticated &&
    operationalShellActive &&
    (!listTenantsConfigured || isDevMockSession);

  const availableTenants = useMemo(() => {
    if (!isAuthenticated || !operationalShellActive) return [];
    if (edgeListEnabled) {
      return operationalTenantsQuery.data ?? [];
    }
    if (allowDevMockTenants) {
      return MOCK_TENANTS;
    }
    return [];
  }, [
    allowDevMockTenants,
    edgeListEnabled,
    operationalShellActive,
    isAuthenticated,
    operationalTenantsQuery.data,
  ]);

  const canAccessOperationalShell = useMemo(() => {
    if (!isAuthenticated || !operationalShellActive) {
      return true;
    }
    if (!edgeListEnabled) {
      return allowDevMockTenants;
    }
    if (operationalTenantsQuery.isLoading) {
      return true;
    }
    return availableTenants.length > 0;
  }, [
    allowDevMockTenants,
    availableTenants.length,
    edgeListEnabled,
    operationalShellActive,
    isAuthenticated,
    operationalTenantsQuery.isLoading,
  ]);

  const effectiveTenantOverrideId = isAuthenticated ? tenantOverrideId : null;

  const currentTenantId = useMemo(() => {
    if (!isAuthenticated || !operationalShellActive) return null;
    return resolveTenantId(effectiveTenantOverrideId, availableTenants, user?.companyId);
  }, [isAuthenticated, operationalShellActive, effectiveTenantOverrideId, availableTenants, user?.companyId]);

  const currentTenant = useMemo(
    () => availableTenants.find(t => t.id === currentTenantId) ?? null,
    [availableTenants, currentTenantId],
  );

  useEffect(() => {
    if (!currentTenantId || !availableTenants.some(t => t.id === currentTenantId)) {
      return;
    }
    try {
      localStorage.setItem(TENANT_ID_KEY, currentTenantId);
    } catch {
      // ignore
    }
  }, [currentTenantId, availableTenants, isAuthenticated]);

  const switchTenant = useCallback(
    (tenantId: string) => {
      if (!availableTenants.some(t => t.id === tenantId)) return;
      setTenantOverrideId(tenantId);
      try {
        localStorage.setItem(TENANT_ID_KEY, tenantId);
      } catch {
        // ignore
      }
    },
    [availableTenants],
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      currentTenant,
      availableTenants,
      tenantSlug: currentTenant?.slug ?? null,
      tenantBranding: currentTenant?.branding ?? null,
      switchTenant,
      isOperationalTenantsLoading: edgeListEnabled && operationalTenantsQuery.isLoading,
      canAccessOperationalShell,
    }),
    [
      currentTenant,
      availableTenants,
      switchTenant,
      edgeListEnabled,
      operationalTenantsQuery.isLoading,
      canAccessOperationalShell,
    ],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return ctx;
}
