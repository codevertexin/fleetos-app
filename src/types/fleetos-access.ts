/** Operational access from `fleetos-get-my-access` (P0.2b-2). */

export type FleetosAccessState =
  | 'needs_onboarding'
  | 'pending_review'
  | 'active_unsubscribed'
  | 'active'
  | 'suspended'
  | 'revoked';

export type FleetosWorkspaceMode = 'preview' | 'setup' | 'operational';

export interface FleetosAccessGates {
  auth_membership: string;
  tenant_approval: string;
  tenant_billing: string;
  role: string | null;
}

export interface FleetosAccessTenantSnapshot {
  id: string;
  name: string;
  slug: string;
  status: string;
  submitted_at?: string;
  billing_plan_code?: string | null;
  subscription_status?: string;
}

export interface FleetosAccessMembershipSnapshot {
  id: string;
  role: string;
  status: string;
}

export interface FleetosAccessCapabilities {
  can_submit_company?: boolean;
  can_access_preview_workspace?: boolean;
  can_access_app_shell?: boolean;
  can_access_dashboard?: boolean;
  can_write_setup_data?: boolean;
  can_write_operational_data?: boolean;
  can_invite_members?: boolean;
  can_start_checkout?: boolean;
  [key: string]: boolean | undefined;
}

export interface FleetosOperationalAccess {
  accessState: FleetosAccessState;
  redirectPath: string;
  workspaceMode: FleetosWorkspaceMode | null;
  gates: FleetosAccessGates | null;
  capabilities: FleetosAccessCapabilities;
  tenant: FleetosAccessTenantSnapshot | null;
  membership: FleetosAccessMembershipSnapshot | null;
}
