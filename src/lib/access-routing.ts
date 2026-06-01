import type { FleetosMembershipStatus } from '@/types/session';
import type { FleetosAccessState, FleetosOperationalAccess } from '@/types/fleetos-access';

const ALLOWED_REDIRECTS = new Set([
  '/onboarding/company',
  '/preview',
  '/app',
  '/dashboard',
  '/access-suspended',
  '/access-revoked',
]);

/** Normalize legacy paths to contract redirects. */
export function normalizeAccessRedirectPath(path: string): string {
  const p = path.trim();
  if (p === '/pending-approval' || p.startsWith('/demo')) {
    return '/preview';
  }
  if (ALLOWED_REDIRECTS.has(p)) {
    return p;
  }
  return '/onboarding/company';
}

export function defaultRedirectForAccessState(state: FleetosAccessState): string {
  switch (state) {
    case 'needs_onboarding':
      return '/onboarding/company';
    case 'pending_review':
      return '/preview';
    case 'active_unsubscribed':
      return '/app';
    case 'active':
      return '/dashboard';
    case 'suspended':
      return '/access-suspended';
    case 'revoked':
      return '/access-revoked';
    default:
      return '/onboarding/company';
  }
}

export function isOperationalDashboardAccess(state: FleetosAccessState | null | undefined): boolean {
  return state === 'active';
}

export function shouldFetchOperationalTenants(state: FleetosAccessState | null | undefined): boolean {
  return state === 'active';
}

export function shouldSyncIdentityAfterSso(state: FleetosAccessState | null | undefined): boolean {
  return state === 'active';
}

export function readAccessRedirect(access: FleetosOperationalAccess | null | undefined): string {
  if (!access) {
    return '/onboarding/company';
  }
  return normalizeAccessRedirectPath(
    access.redirectPath || defaultRedirectForAccessState(access.accessState),
  );
}

/** DEV fallback when `fleetos-get-my-access` is not configured. */
export function inferAccessFromMembership(
  status: FleetosMembershipStatus,
): FleetosOperationalAccess {
  let accessState: FleetosAccessState;
  switch (status) {
    case 'active':
      accessState = 'active';
      break;
    case 'suspended':
      accessState = 'suspended';
      break;
    case 'revoked':
      accessState = 'revoked';
      break;
    case 'pending':
    case 'missing':
    case 'none':
    default:
      accessState = 'pending_review';
      break;
  }
  const redirectPath = defaultRedirectForAccessState(accessState);
  return {
    accessState,
    redirectPath,
    workspaceMode:
      accessState === 'active'
        ? 'operational'
        : accessState === 'pending_review'
          ? 'preview'
          : null,
    gates: null,
    capabilities: {},
    tenant: null,
    membership: null,
  };
}
