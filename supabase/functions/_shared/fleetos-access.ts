/**
 * FleetOS P0 — operational access resolution (company onboarding + billing gate).
 * @see docs/architecture/FLEETOS_COMPANY_ONBOARDING_P0_CONTRACT.md
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { roleForApiResponse } from './fleetos-membership.ts';

export type FleetosAccessState =
  | 'needs_onboarding'
  | 'pending_review'
  | 'active_unsubscribed'
  | 'active'
  | 'suspended'
  | 'revoked';

export type TenantApproval = 'none' | 'pending_review' | 'approved' | 'suspended' | 'revoked';

export type TenantBilling = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';

export type WorkspaceMode = 'preview' | 'setup' | 'operational';

export interface FleetosAccessGates {
  auth_membership: string;
  tenant_approval: TenantApproval;
  tenant_billing: TenantBilling;
  role: string | null;
}

export interface FleetosAccessTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  submitted_at: string;
  billing_plan_code: string | null;
  subscription_status: TenantBilling;
}

export interface FleetosAccessMembership {
  id: string;
  role: string;
  status: string;
}

export interface FleetosAccessCapabilities {
  can_submit_company: boolean;
  can_access_preview_workspace: boolean;
  can_access_app_shell: boolean;
  can_access_dashboard: boolean;
  can_read_preview_mock_data: boolean;
  can_write_setup_data: boolean;
  can_write_operational_data: boolean;
  can_manage_billing: boolean;
  can_invite_members: boolean;
  can_view_application_status: boolean;
  can_edit_company_application: boolean;
  can_configure_company: boolean;
  can_view_pricing: boolean;
  can_start_checkout: boolean;
  can_contact_support: boolean;
  can_access_legal_support: boolean;
}

export interface FleetosAccessResolution {
  access_state: FleetosAccessState;
  redirect_path: string;
  workspace_mode: WorkspaceMode | null;
  gates: Omit<FleetosAccessGates, 'auth_membership'>;
  tenant: FleetosAccessTenant | null;
  membership: FleetosAccessMembership | null;
  capabilities: FleetosAccessCapabilities;
}

const ACCESS_PRIORITY: Record<FleetosAccessState, number> = {
  active: 50,
  active_unsubscribed: 45,
  pending_review: 30,
  suspended: 20,
  revoked: 10,
  needs_onboarding: 0,
};

export const ACCESS_MEMBER_SELECT =
  `id, role, legacy_role, status, created_at, updated_at, tenants ( id, slug, name, status, metadata, created_at, billing_plan_code, subscription_status )`;

interface MemberRow {
  id: string;
  role: string;
  legacy_role: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  tenants: {
    id: string;
    slug: string;
    name: string;
    status: string;
    metadata: unknown;
    created_at: string;
    billing_plan_code: string | null;
    subscription_status: string;
  } | null;
}

export function normalizeSubscriptionStatus(raw: string | null | undefined): TenantBilling {
  const v = (raw ?? 'none').trim().toLowerCase();
  if (v === 'trialing' || v === 'active' || v === 'past_due' || v === 'canceled') {
    return v;
  }
  return 'none';
}

/** Layer 2 — tenant + member approval (no billing). */
export function resolveTenantApproval(tenantStatus: string, memberStatus: string): TenantApproval {
  const t = tenantStatus.trim().toLowerCase();
  const m = memberStatus.trim().toLowerCase();

  if (t === 'suspended' || m === 'suspended') {
    return 'suspended';
  }

  if (t === 'revoked' || t === 'archived' || t === 'inactive') {
    return 'revoked';
  }

  if (t === 'pending_review' || m === 'pending' || m === 'invited') {
    return 'pending_review';
  }

  if (t === 'active' && m === 'active') {
    return 'approved';
  }

  if (t === 'active' && m !== 'active') {
    return 'pending_review';
  }

  return 'revoked';
}

/** Layer 3 + final access_state from approval + billing. */
export function resolveAccessState(
  approval: TenantApproval,
  billing: TenantBilling,
): FleetosAccessState {
  if (approval === 'pending_review') return 'pending_review';
  if (approval === 'suspended') return 'suspended';
  if (approval === 'revoked') return 'revoked';
  if (approval === 'approved') {
    if (billing === 'active' || billing === 'trialing') return 'active';
    return 'active_unsubscribed';
  }
  return 'needs_onboarding';
}

/** @deprecated Use resolveTenantApproval + resolveAccessState — kept for row priority helpers. */
export function resolveRowAccessState(
  tenantStatus: string,
  memberStatus: string,
  subscriptionStatus = 'none',
): FleetosAccessState {
  const approval = resolveTenantApproval(tenantStatus, memberStatus);
  const billing = normalizeSubscriptionStatus(subscriptionStatus);
  return resolveAccessState(approval, billing);
}

export function workspaceModeForState(state: FleetosAccessState): WorkspaceMode | null {
  switch (state) {
    case 'pending_review':
      return 'preview';
    case 'active_unsubscribed':
      return 'setup';
    case 'active':
      return 'operational';
    default:
      return null;
  }
}

function redirectForState(state: FleetosAccessState): string {
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

function isOwnerAdmin(role: string): boolean {
  const r = role.trim().toLowerCase();
  return r === 'owner' || r === 'admin' || r === 'tenant_admin';
}

export function capabilitiesForState(
  state: FleetosAccessState,
  role: string | null,
): FleetosAccessCapabilities {
  const ownerAdmin = role ? isOwnerAdmin(role) : false;

  const base = {
    can_submit_company: false,
    can_access_preview_workspace: false,
    can_access_app_shell: false,
    can_access_dashboard: false,
    can_read_preview_mock_data: false,
    can_write_setup_data: false,
    can_write_operational_data: false,
    can_manage_billing: false,
    can_invite_members: false,
    can_view_application_status: false,
    can_edit_company_application: false,
    can_configure_company: false,
    can_view_pricing: false,
    can_start_checkout: false,
    can_contact_support: true,
    can_access_legal_support: true,
  };

  switch (state) {
    case 'needs_onboarding':
      return { ...base, can_submit_company: true };
    case 'pending_review':
      return {
        ...base,
        can_access_preview_workspace: true,
        can_read_preview_mock_data: true,
        can_view_application_status: true,
        can_edit_company_application: true,
        can_view_pricing: true,
      };
    case 'active_unsubscribed':
      return {
        ...base,
        can_access_app_shell: true,
        can_write_setup_data: true,
        can_manage_billing: ownerAdmin,
        can_invite_members: ownerAdmin,
        can_configure_company: true,
        can_view_pricing: true,
        can_start_checkout: ownerAdmin,
      };
    case 'active':
      return {
        ...base,
        can_access_app_shell: true,
        can_access_dashboard: true,
        can_write_setup_data: true,
        can_write_operational_data: true,
        can_manage_billing: ownerAdmin,
        can_invite_members: ownerAdmin,
        can_configure_company: true,
        can_view_pricing: true,
        can_start_checkout: ownerAdmin,
      };
    case 'suspended':
    case 'revoked':
      return base;
    default:
      return base;
  }
}

export function extractSubmittedAtFromMetadata(metadata: unknown, tenantCreatedAt: string): string {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const onboarding = (metadata as Record<string, unknown>).onboarding;
    if (onboarding && typeof onboarding === 'object' && !Array.isArray(onboarding)) {
      const submitted = (onboarding as Record<string, unknown>).submitted_at;
      if (typeof submitted === 'string' && submitted.trim()) {
        return submitted.trim();
      }
    }
  }
  return tenantCreatedAt;
}

function rowToResolution(row: MemberRow): FleetosAccessResolution {
  const tenant = row.tenants!;
  const apiRole = roleForApiResponse({ role: row.role, legacy_role: row.legacy_role });
  const tenantApproval = resolveTenantApproval(tenant.status, row.status);
  const tenantBilling = normalizeSubscriptionStatus(tenant.subscription_status);
  const access_state = resolveAccessState(tenantApproval, tenantBilling);

  return {
    access_state,
    redirect_path: redirectForState(access_state),
    workspace_mode: workspaceModeForState(access_state),
    gates: {
      tenant_approval: tenantApproval,
      tenant_billing: tenantBilling,
      role: apiRole,
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      submitted_at: extractSubmittedAtFromMetadata(tenant.metadata, tenant.created_at),
      billing_plan_code: tenant.billing_plan_code,
      subscription_status: tenantBilling,
    },
    membership: {
      id: row.id,
      role: apiRole,
      status: row.status,
    },
    capabilities: capabilitiesForState(access_state, apiRole),
  };
}

function pickPrimaryRow(rows: MemberRow[]): MemberRow | null {
  if (rows.length === 0) return null;

  let best: MemberRow | null = null;
  let bestPriority = -1;
  let bestCreated = '';

  for (const row of rows) {
    const tenant = row.tenants;
    if (!tenant?.id) continue;

    const state = resolveRowAccessState(
      tenant.status,
      row.status,
      tenant.subscription_status,
    );
    const priority = ACCESS_PRIORITY[state];
    const created = row.created_at || '';

    if (
      priority > bestPriority ||
      (priority === bestPriority && created > bestCreated)
    ) {
      best = row;
      bestPriority = priority;
      bestCreated = created;
    }
  }

  return best;
}

export function emptyAccessResolution(): FleetosAccessResolution {
  const access_state: FleetosAccessState = 'needs_onboarding';
  return {
    access_state,
    redirect_path: redirectForState(access_state),
    workspace_mode: null,
    gates: {
      tenant_approval: 'none',
      tenant_billing: 'none',
      role: null,
    },
    tenant: null,
    membership: null,
    capabilities: capabilitiesForState(access_state, null),
  };
}

export function resolveAccessFromMemberRows(rows: MemberRow[]): FleetosAccessResolution {
  const primary = pickPrimaryRow(rows);
  if (!primary) {
    return emptyAccessResolution();
  }
  return rowToResolution(primary);
}

/** Normalize Auth Core JWT membership_status for API echo (not operational gate). */
export function normalizeAuthMembershipStatus(raw: string | undefined): string {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v || v === 'none' || v === 'missing') return 'missing';
  if (v === 'approved') return 'active';
  if (
    v === 'active' ||
    v === 'pending' ||
    v === 'approval_required' ||
    v === 'awaiting_approval' ||
    v === 'awaiting' ||
    v === 'suspended' ||
    v === 'revoked'
  ) {
    if (v === 'approval_required' || v === 'awaiting_approval' || v === 'awaiting') {
      return 'pending';
    }
    return v;
  }
  return 'missing';
}

export async function loadMemberRowsForUser(
  admin: SupabaseClient,
  codevertexUserId: string,
): Promise<{ rows: MemberRow[]; error?: string }> {
  const { data, error } = await admin
    .from('tenant_members')
    .select(ACCESS_MEMBER_SELECT)
    .eq('codevertex_user_id', codevertexUserId)
    .neq('status', 'removed');

  if (error) {
    return { rows: [], error: error.message };
  }

  const rows: MemberRow[] = [];
  for (const raw of data ?? []) {
    const r = raw as Record<string, unknown>;
    const tenantsRaw = r.tenants as Record<string, unknown> | null | undefined;
    if (!tenantsRaw || typeof tenantsRaw.id !== 'string') continue;

    const planRaw = tenantsRaw.billing_plan_code;
    rows.push({
      id: String(r.id),
      role: String(r.role ?? 'viewer'),
      legacy_role: typeof r.legacy_role === 'string' ? r.legacy_role : null,
      status: String(r.status ?? 'pending'),
      created_at: String(r.created_at ?? ''),
      updated_at: String(r.updated_at ?? ''),
      tenants: {
        id: tenantsRaw.id,
        slug: String(tenantsRaw.slug ?? ''),
        name: String(tenantsRaw.name ?? ''),
        status: String(tenantsRaw.status ?? 'inactive'),
        metadata: tenantsRaw.metadata,
        created_at: String(tenantsRaw.created_at ?? ''),
        billing_plan_code:
          typeof planRaw === 'string' && planRaw.trim() ? planRaw.trim() : null,
        subscription_status: String(tenantsRaw.subscription_status ?? 'none'),
      },
    });
  }

  return { rows };
}

export function buildAccessResponse(
  codevertexUserId: string,
  authMembershipStatusRaw: string | undefined,
  resolution: FleetosAccessResolution,
): Record<string, unknown> {
  const auth_membership = normalizeAuthMembershipStatus(authMembershipStatusRaw);

  return {
    ok: true,
    access_state: resolution.access_state,
    auth_membership_status: auth_membership,
    codevertex_user_id: codevertexUserId,
    tenant: resolution.tenant,
    membership: resolution.membership,
    gates: {
      auth_membership,
      tenant_approval: resolution.gates.tenant_approval,
      tenant_billing: resolution.gates.tenant_billing,
      role: resolution.gates.role,
    },
    workspace_mode: resolution.workspace_mode,
    redirect_path: resolution.redirect_path,
    capabilities: resolution.capabilities,
  };
}
