import { COMPANY_ADMIN, normalizeFleetosRoutePath, OPERATIONS } from '@/lib/fleetos-routes';
import type { FleetosMembershipStatus } from '@/types/session';
import type { FleetosAccessState, FleetosOperationalAccess } from '@/types/fleetos-access';

const ALLOWED_REDIRECTS = new Set([
  '/onboarding/company',
  '/preview',
  '/app',
  COMPANY_ADMIN.root,
  `${COMPANY_ADMIN.root}/vehicles`,
  '/dashboard',
  OPERATIONS.dashboard,
  '/access-suspended',
  '/access-revoked',
]);

/** Normalize legacy paths to contract redirects. */
export function normalizeAccessRedirectPath(path: string): string {
  const p = path.trim();
  if (p === '/pending-approval' || p.startsWith('/demo')) {
    return '/preview';
  }
  const canonical = normalizeFleetosRoutePath(p);
  if (ALLOWED_REDIRECTS.has(p) || ALLOWED_REDIRECTS.has(canonical)) {
    return canonical;
  }
  if (
    canonical.startsWith(`${COMPANY_ADMIN.root}/`) ||
    canonical.startsWith(`${OPERATIONS.root}/`)
  ) {
    return canonical;
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
      return COMPANY_ADMIN.root;
    case 'active':
      return OPERATIONS.dashboard;
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

/** True when `current` is allowed for a route gated by `expected` (single state or list). */
export function matchesExpectedAccessState(
  current: FleetosAccessState | null | undefined,
  expected?: FleetosAccessState | FleetosAccessState[],
): boolean {
  if (!expected) return true;
  if (!current) return false;
  const allowed = Array.isArray(expected) ? expected : [expected];
  return allowed.includes(current);
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
