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
}

export interface AuthSession {
  codevertexUserId: string;
  user: SessionUser;
  token: string;
  expiresAt: string;
  roles: FleetosRole[];
}
