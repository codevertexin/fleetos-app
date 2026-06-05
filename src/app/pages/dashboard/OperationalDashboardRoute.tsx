import { Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/contexts/AuthProvider';
import {
  isOperationalDashboardAccess,
  readAccessRedirect,
} from '@/lib/access-routing';
import Dashboard from '@/app/pages/admin/Dashboard';
import OperationalDashboardLocked from './OperationalDashboardLocked';

function AuthLoadingFallback({ label = 'Checking session…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00B39A] border-t-transparent" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface OperationalDashboardRouteProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

/** Canonical `/dashboard` — operational shell or billing-locked state (no redirect to `/admin`). */
export default function OperationalDashboardRoute({
  darkMode,
  setDarkMode,
}: OperationalDashboardRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    isAccessResolving,
    operationalAccess,
    accessRedirectPath,
  } = useAuth();

  if (isLoading || isAccessResolving) {
    return <AuthLoadingFallback label="Resolving workspace access…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const accessState = operationalAccess?.accessState;

  if (accessState === 'active_unsubscribed') {
    return (
      <AdminLayout darkMode={darkMode} setDarkMode={setDarkMode}>
        <OperationalDashboardLocked />
      </AdminLayout>
    );
  }

  if (!isOperationalDashboardAccess(accessState)) {
    const target =
      accessRedirectPath ?? readAccessRedirect(operationalAccess ?? undefined);
    return <Navigate to={target} replace />;
  }

  return (
    <ProtectedRoute>
      <AdminLayout darkMode={darkMode} setDarkMode={setDarkMode}>
        <Dashboard />
      </AdminLayout>
    </ProtectedRoute>
  );
}
