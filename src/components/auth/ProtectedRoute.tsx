import { Navigate, useLocation } from 'react-router-dom';
import { membershipGatePath } from '@/lib/membership-gate';
import { useAuth } from '@/contexts/AuthProvider';

function AuthLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00B39A] border-t-transparent" />
      <span className="sr-only">Checking session…</span>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasActiveFleetosAccess, fleetosMembershipStatus } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasActiveFleetosAccess && fleetosMembershipStatus) {
    const gatePath = membershipGatePath(fleetosMembershipStatus);
    if (gatePath) {
      return <Navigate to={gatePath} replace />;
    }
  }

  return children;
}

/** Requires identity session but not active FleetOS membership (gate screens). */
export function AuthenticatedGateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasActiveFleetosAccess } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (hasActiveFleetosAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
