import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import type { FleetosRole } from '@/types/session';

interface RoleGuardProps {
  allowedRoles: FleetosRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children when the session has at least one allowed FleetOS role.
 * Stub for Phase 2 — wire on sensitive routes in later phases.
 */
export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { roles, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return fallback;
  }

  const allowed = roles.some(role => allowedRoles.includes(role));
  if (!allowed) {
    return fallback;
  }

  return children;
}
