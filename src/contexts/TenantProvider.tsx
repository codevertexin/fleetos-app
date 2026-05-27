import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { TENANT_ID_KEY } from '@/lib/session-storage';
import type { FleetosTenant, TenantBranding } from '@/types/session';
import { useAuth } from './AuthProvider';

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
 * Resolves current tenant id. With multiple tenants, never picks `tenants[0]`
 * silently — returns null until override, localStorage, or session hint matches.
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
  return null;
}

interface TenantContextValue {
  currentTenant: FleetosTenant | null;
  availableTenants: FleetosTenant[];
  tenantSlug: string | null;
  tenantBranding: TenantBranding | null;
  switchTenant: (tenantId: string) => void;
  /** True when a secure Edge-backed tenant list is loading (reserved; always false until fleetos-list-tenants ships). */
  isOperationalTenantsLoading: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasActiveFleetosAccess, user } = useAuth();
  const [tenantOverrideId, setTenantOverrideId] = useState<string | null>(null);

  const availableTenants = useMemo(() => {
    if (!isAuthenticated || !hasActiveFleetosAccess) return [];
    // Real tenant resolution waits for Edge `fleetos-list-tenants` + verified Auth Core identity.
    return MOCK_TENANTS;
  }, [isAuthenticated, hasActiveFleetosAccess]);

  const currentTenantId = useMemo(() => {
    if (!isAuthenticated || !hasActiveFleetosAccess) return null;
    return resolveTenantId(tenantOverrideId, availableTenants, user?.companyId);
  }, [isAuthenticated, hasActiveFleetosAccess, tenantOverrideId, availableTenants, user?.companyId]);

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
  }, [currentTenantId, availableTenants]);

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
      isOperationalTenantsLoading: false,
    }),
    [currentTenant, availableTenants, switchTenant],
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
