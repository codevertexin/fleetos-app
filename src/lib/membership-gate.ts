import type { FleetosMembershipStatus } from '@/types/session';

/** Route for non-active FleetOS membership; null means full app access. */
export function membershipGatePath(status: FleetosMembershipStatus): string | null {
  switch (status) {
    case 'active':
      return null;
    case 'pending':
    case 'missing':
      return '/pending-approval';
    case 'suspended':
      return '/access-suspended';
    case 'revoked':
      return '/access-revoked';
    default:
      return '/pending-approval';
  }
}

export function hasActiveFleetosMembership(status: FleetosMembershipStatus): boolean {
  return status === 'active';
}
