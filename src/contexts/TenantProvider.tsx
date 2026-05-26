import {
  createContext,
  useCallback,
  useContext,
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
  {
    id: 't2',
    slug: 'lisbon-mobility',
    name: 'Lisbon Mobility Lda',
    branding: {
      accentColor: '#22C7D8',
      logoUrl: '/logo.png',
      companyName: 'Lisbon Mobility Lda',
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

function resolveTenantId(overrideId: string | null, companyId?: string): string | null {
  if (overrideId && MOCK_TENANTS.some(t => t.id === overrideId)) {
    return overrideId;
  }
  const stored = readStoredTenantId();
  if (stored && MOCK_TENANTS.some(t => t.id === stored)) {
    return stored;
  }
  if (companyId && MOCK_TENANTS.some(t => t.id === companyId)) {
    return companyId;
  }
  return MOCK_TENANTS[0]?.id ?? null;
}

interface TenantContextValue {
  currentTenant: FleetosTenant | null;
  availableTenants: FleetosTenant[];
  tenantSlug: string | null;
  tenantBranding: TenantBranding | null;
  switchTenant: (tenantId: string) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [tenantOverrideId, setTenantOverrideId] = useState<string | null>(null);

  const availableTenants = useMemo(() => {
    if (!isAuthenticated) return [];
    return MOCK_TENANTS;
  }, [isAuthenticated]);

  const currentTenantId = useMemo(() => {
    if (!isAuthenticated) return null;
    return resolveTenantId(tenantOverrideId, user?.companyId);
  }, [isAuthenticated, tenantOverrideId, user?.companyId]);

  const currentTenant = useMemo(
    () => availableTenants.find(t => t.id === currentTenantId) ?? availableTenants[0] ?? null,
    [availableTenants, currentTenantId],
  );

  const switchTenant = useCallback((tenantId: string) => {
    if (!MOCK_TENANTS.some(t => t.id === tenantId)) return;
    setTenantOverrideId(tenantId);
    try {
      localStorage.setItem(TENANT_ID_KEY, tenantId);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<TenantContextValue>(
    () => ({
      currentTenant,
      availableTenants,
      tenantSlug: currentTenant?.slug ?? null,
      tenantBranding: currentTenant?.branding ?? null,
      switchTenant,
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
