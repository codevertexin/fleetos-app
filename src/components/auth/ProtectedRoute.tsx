import { Navigate, useLocation } from 'react-router-dom';
import {
  isOperationalDashboardAccess,
  matchesExpectedAccessState,
  readAccessRedirect,
} from '@/lib/access-routing';
import {
  COMPANY_ADMIN,
  isCompanyAdminPath,
  isOperationalAreaPath,
  OPERATIONAL_HOME,
} from '@/lib/fleetos-routes';
import type { FleetosAccessState } from '@/types/fleetos-access';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantProvider';

function AuthLoadingFallback({ label = 'Checking session…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00B39A] border-t-transparent" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Operational dashboard shell — `access_state === active` only (P0.3A). */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    isAccessResolving,
    operationalAccess,
    accessRedirectPath,
  } = useAuth();
  const { canAccessOperationalShell, isOperationalTenantsLoading } = useTenant();

  if (isLoading || isAccessResolving) {
    return <AuthLoadingFallback label="Resolving workspace access…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isOperationalDashboardAccess(operationalAccess?.accessState)) {
    const target =
      accessRedirectPath ?? readAccessRedirect(operationalAccess ?? undefined);
    return <Navigate to={target} replace />;
  }

  if (!canAccessOperationalShell) {
    if (isOperationalTenantsLoading) {
      return <AuthLoadingFallback label="Loading workspace…" />;
    }
    return <Navigate to={accessRedirectPath ?? COMPANY_ADMIN.root} replace />;
  }

  return children;
}

interface AccessGateRouteProps {
  children: React.ReactNode;
  /** When set, user must be in one of these access states to view the route. */
  expectedAccessState?: FleetosAccessState | FleetosAccessState[];
}

/**
 * Authenticated non-operational routes (preview, setup, onboarding, access gates).
 */
export function AccessGateRoute({ children, expectedAccessState }: AccessGateRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    isAccessResolving,
    operationalAccess,
    accessRedirectPath,
  } = useAuth();
  const location = useLocation();

  if (isLoading || isAccessResolving) {
    return <AuthLoadingFallback label="Resolving workspace access…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const target = accessRedirectPath ?? readAccessRedirect(operationalAccess ?? undefined);

  if (
    expectedAccessState &&
    !matchesExpectedAccessState(operationalAccess?.accessState, expectedAccessState)
  ) {
    return <Navigate to={target} replace />;
  }

  if (
    !expectedAccessState &&
    isOperationalDashboardAccess(operationalAccess?.accessState) &&
    !isOperationalAreaPath(location.pathname) &&
    !isCompanyAdminPath(location.pathname)
  ) {
    return <Navigate to={OPERATIONAL_HOME} replace />;
  }

  return children;
}

/** @deprecated Use `AccessGateRoute` — kept for existing imports during migration. */
export function AuthenticatedGateRoute({
  children,
  expectedAccessState,
}: AccessGateRouteProps) {
  return (
    <AccessGateRoute expectedAccessState={expectedAccessState}>{children}</AccessGateRoute>
  );
}
