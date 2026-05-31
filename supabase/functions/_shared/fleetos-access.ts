/**
 * FleetOS P0 — operational access resolution (company onboarding).
 * @see docs/architecture/FLEETOS_COMPANY_ONBOARDING_P0_CONTRACT.md
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { roleForApiResponse } from './fleetos-membership.ts';

export type FleetosAccessState =
  | 'needs_onboarding'
  | 'pending_review'
  | 'active'
  | 'suspended'
  | 'revoked';

export interface FleetosAccessTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  submitted_at: string;
}

export interface FleetosAccessMembership {
  id: string;
  role: string;
  status: string;
}

export interface FleetosAccessCapabilities {
  can_submit_company: boolean;
  can_access_dashboard: boolean;
  can_access_operational_shell: boolean;
}

export interface FleetosAccessResolution {
  access_state: FleetosAccessState;
  redirect_path: string;
  tenant: FleetosAccessTenant | null;
  membership: FleetosAccessMembership | null;
  capabilities: FleetosAccessCapabilities;
}

const ACCESS_PRIORITY: Record<FleetosAccessState, number> = {
  active: 40,
  pending_review: 30,
  suspended: 20,
  revoked: 10,
  needs_onboarding: 0,
};

export const ACCESS_MEMBER_SELECT =
  `id, role, legacy_role, status, created_at, updated_at, tenants ( id, slug, name, status, metadata, created_at )`;

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
  } | null;
}

function redirectForState(state: FleetosAccessState): string {
  switch (state) {
    case 'needs_onboarding':
      return '/onboarding/company';
    case 'pending_review':
      return '/pending-approval';
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

function capabilitiesForState(state: FleetosAccessState): FleetosAccessCapabilities {
  return {
    can_submit_company: state === 'needs_onboarding',
    can_access_dashboard: state === 'active',
    can_access_operational_shell: state === 'active',
  };
}

function extractSubmittedAt(metadata: unknown, tenantCreatedAt: string): string {
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

/** Per-row operational state from tenant + member lifecycle columns. */
export function resolveRowAccessState(tenantStatus: string, memberStatus: string): FleetosAccessState {
  const t = tenantStatus.trim().toLowerCase();
  const m = memberStatus.trim().toLowerCase();

  if (t === 'active' && m === 'active') {
    return 'active';
  }

  if (
    t === 'pending_review' ||
    m === 'pending' ||
    m === 'invited'
  ) {
    return 'pending_review';
  }

  if (t === 'suspended' || m === 'suspended') {
    return 'suspended';
  }

  if (t === 'revoked' || t === 'archived' || t === 'inactive') {
    return 'revoked';
  }

  // e.g. active tenant + non-active member without pending (unexpected) → pending_review
  if (t === 'active' && m !== 'active') {
    return 'pending_review';
  }

  return 'revoked';
}

function pickPrimaryRow(rows: MemberRow[]): MemberRow | null {
  if (rows.length === 0) return null;

  let best: MemberRow | null = null;
  let bestPriority = -1;
  let bestCreated = '';

  for (const row of rows) {
    const tenant = row.tenants;
    if (!tenant?.id) continue;

    const state = resolveRowAccessState(tenant.status, row.status);
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

function rowToResolution(row: MemberRow): FleetosAccessResolution {
  const tenant = row.tenants!;
  const access_state = resolveRowAccessState(tenant.status, row.status);

  return {
    access_state,
    redirect_path: redirectForState(access_state),
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      submitted_at: extractSubmittedAt(tenant.metadata, tenant.created_at),
    },
    membership: {
      id: row.id,
      role: roleForApiResponse({ role: row.role, legacy_role: row.legacy_role }),
      status: row.status,
    },
    capabilities: capabilitiesForState(access_state),
  };
}

export function emptyAccessResolution(): FleetosAccessResolution {
  const access_state: FleetosAccessState = 'needs_onboarding';
  return {
    access_state,
    redirect_path: redirectForState(access_state),
    tenant: null,
    membership: null,
    capabilities: capabilitiesForState(access_state),
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
  return {
    ok: true,
    access_state: resolution.access_state,
    auth_membership_status: normalizeAuthMembershipStatus(authMembershipStatusRaw),
    codevertex_user_id: codevertexUserId,
    tenant: resolution.tenant,
    membership: resolution.membership,
    redirect_path: resolution.redirect_path,
    capabilities: resolution.capabilities,
  };
}
