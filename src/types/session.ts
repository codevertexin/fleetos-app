/** FleetOS app membership in Auth Core (approval_required mode). */
export type FleetosMembershipStatus =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'revoked'
  | 'missing';

/** FleetOS tenant-scoped roles (CodeVertex membership mapping). */
export type FleetosRole =
  | 'tenant_admin'
  | 'fleet_manager'
  | 'operations'
  | 'dispatcher'
  | 'finance'
  | 'driver'
  | 'owner'
  | 'viewer';

export interface SessionUser {
  id: string;
  codevertexUserId: string;
  name: string;
  email: string;
  role: FleetosRole;
  companyId: string;
}

export interface TenantBranding {
  accentColor: string;
  logoUrl: string;
  companyName: string;
}

export interface FleetosTenant {
  id: string;
  slug: string;
  name: string;
  branding: TenantBranding;
  /** From tenant_users.role when resolved via operational DB. */
  membershipRole?: FleetosRole;
}

export interface AuthSession {
  codevertexUserId: string;
  user: SessionUser;
  token: string;
  expiresAt: string;
  roles: FleetosRole[];
  /** Auth Core FLEETOS membership — identity may exist without operational access. */
  fleetosMembershipStatus: FleetosMembershipStatus;
  /** Phase 5b: last successful operational sync (Supabase RPC). */
  operationalPrimaryTenantId?: string | null;
  operationalProfileId?: string | null;
}
