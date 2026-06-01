/**
 * FleetOS P1.1 — list pending company applications (admin queue).
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { extractSubmittedAtFromMetadata } from './fleetos-access.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const OWNER_ADMIN_ROLES = new Set(['owner', 'admin']);

export type ListSort = 'submitted_at_asc' | 'submitted_at_desc';

export interface ListApplicationsParams {
  status: 'pending_review';
  tenantId: string | null;
  limit: number;
  cursor: string | null;
  sort: ListSort;
  countryCode: string | null;
  q: string | null;
}

export interface TenantApplicationItem {
  tenant: Record<string, unknown>;
  onboarding: Record<string, unknown> | null;
  submitter_membership: Record<string, unknown> | null;
  counts: { pending_members: number };
}

export interface ListApplicationsResult {
  items: TenantApplicationItem[];
  page: {
    limit: number;
    next_cursor: string | null;
    total_estimate: number;
  };
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  locale: string | null;
  currency: string | null;
  timezone: string | null;
  subscription_status: string | null;
  billing_plan_code: string | null;
  created_at: string;
  metadata: unknown;
}

interface MemberRow {
  id: string;
  role: string;
  status: string;
  codevertex_user_id: string;
  profile_id: string | null;
  is_active: boolean;
  created_at: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function parseOnboarding(metadata: unknown): Record<string, unknown> | null {
  if (!isRecord(metadata)) return null;
  const onboarding = metadata.onboarding;
  if (!isRecord(onboarding)) return null;
  return { ...onboarding };
}

function encodeCursor(submittedAt: string, tenantId: string): string {
  return btoa(`${submittedAt}|${tenantId}`);
}

function decodeCursor(cursor: string): { submittedAt: string; tenantId: string } | null {
  try {
    const raw = atob(cursor.trim());
    const [submittedAt, tenantId] = raw.split('|');
    if (!submittedAt || !tenantId || !UUID_RE.test(tenantId)) return null;
    return { submittedAt, tenantId };
  } catch {
    return null;
  }
}

export function parseListApplicationsBody(body: unknown):
  | { ok: true; params: ListApplicationsParams }
  | { ok: false; message: string } {
  const b = isRecord(body) ? body : {};
  const statusRaw = typeof b.status === 'string' ? b.status.trim() : 'pending_review';
  if (statusRaw !== 'pending_review') {
    return { ok: false, message: 'status must be pending_review in P1.1' };
  }

  let limit = 50;
  if (typeof b.limit === 'number' && Number.isFinite(b.limit)) {
    limit = Math.min(100, Math.max(1, Math.floor(b.limit)));
  }

  const sortRaw = typeof b.sort === 'string' ? b.sort.trim() : 'submitted_at_asc';
  const sort: ListSort = sortRaw === 'submitted_at_desc' ? 'submitted_at_desc' : 'submitted_at_asc';

  let tenantId: string | null = null;
  if (typeof b.tenant_id === 'string' && b.tenant_id.trim()) {
    tenantId = b.tenant_id.trim();
    if (!UUID_RE.test(tenantId)) {
      return { ok: false, message: 'tenant_id must be a valid UUID' };
    }
  }

  let countryCode: string | null = null;
  let q: string | null = null;
  const filters = b.filters;
  if (isRecord(filters)) {
    if (typeof filters.country_code === 'string' && filters.country_code.trim()) {
      countryCode = filters.country_code.trim().toUpperCase();
    }
    if (typeof filters.q === 'string' && filters.q.trim()) {
      q = filters.q.trim().toLowerCase();
    }
  }

  const cursor = typeof b.cursor === 'string' && b.cursor.trim() ? b.cursor.trim() : null;
  if (cursor && !decodeCursor(cursor)) {
    return { ok: false, message: 'invalid cursor' };
  }

  return {
    ok: true,
    params: {
      status: 'pending_review',
      tenantId,
      limit,
      cursor,
      sort,
      countryCode,
      q,
    },
  };
}

function pickSubmitterMember(
  members: MemberRow[],
  submittedBy: string | null,
): MemberRow | null {
  const candidates = members.filter(m =>
    OWNER_ADMIN_ROLES.has(m.role.trim().toLowerCase()) &&
    (m.status === 'pending' || m.status === 'invited')
  );
  if (candidates.length === 0) return null;

  if (submittedBy) {
    const match = candidates.find(m => m.codevertex_user_id === submittedBy);
    if (match) return match;
  }

  return [...candidates].sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ?? null;
}

function matchesQuery(tenant: TenantRow, onboarding: Record<string, unknown> | null, q: string): boolean {
  const hay = [
    tenant.name,
    tenant.slug,
    onboarding && typeof onboarding.legal_name === 'string' ? onboarding.legal_name : '',
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function buildItem(tenant: TenantRow, members: MemberRow[]): TenantApplicationItem | null {
  const onboarding = parseOnboarding(tenant.metadata);
  const submittedBy =
    onboarding && typeof onboarding.submitted_by_codevertex_user_id === 'string'
      ? onboarding.submitted_by_codevertex_user_id
      : null;

  const submitter = pickSubmitterMember(members, submittedBy);
  if (!submitter) {
    return null;
  }

  const pendingCount = members.filter(m =>
    OWNER_ADMIN_ROLES.has(m.role.trim().toLowerCase()) &&
    (m.status === 'pending' || m.status === 'invited')
  ).length;

  const submittedAt = extractSubmittedAtFromMetadata(tenant.metadata, tenant.created_at);

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      locale: tenant.locale,
      currency: tenant.currency,
      timezone: tenant.timezone,
      subscription_status: tenant.subscription_status ?? 'none',
      billing_plan_code: tenant.billing_plan_code,
      created_at: tenant.created_at,
      submitted_at: submittedAt,
    },
    onboarding,
    submitter_membership: {
      id: submitter.id,
      role: submitter.role,
      status: submitter.status,
      codevertex_user_id: submitter.codevertex_user_id,
      profile_id: submitter.profile_id,
      is_active: submitter.is_active,
    },
    counts: { pending_members: pendingCount },
  };
}

export async function listTenantApplications(
  admin: SupabaseClient,
  params: ListApplicationsParams,
): Promise<{ ok: true; data: ListApplicationsResult } | { ok: false; message: string }> {
  let query = admin
    .from('tenants')
    .select(
      'id, name, slug, status, locale, currency, timezone, subscription_status, billing_plan_code, created_at, metadata',
    )
    .eq('status', params.status);

  if (params.tenantId) {
    query = query.eq('id', params.tenantId);
  }

  const { data: tenantRows, error: te } = await query;
  if (te) {
    return { ok: false, message: te.message };
  }

  const tenants = (tenantRows ?? []) as TenantRow[];
  if (tenants.length === 0) {
    return {
      ok: true,
      data: {
        items: [],
        page: { limit: params.limit, next_cursor: null, total_estimate: 0 },
      },
    };
  }

  const tenantIds = tenants.map(t => t.id);
  const { data: memberRows, error: me } = await admin
    .from('tenant_members')
    .select('id, tenant_id, role, status, codevertex_user_id, profile_id, is_active, created_at')
    .in('tenant_id', tenantIds);

  if (me) {
    return { ok: false, message: me.message };
  }

  const membersByTenant = new Map<string, MemberRow[]>();
  for (const raw of memberRows ?? []) {
    const r = raw as Record<string, unknown>;
    const tid = String(r.tenant_id ?? '');
    if (!tid) continue;
    const row: MemberRow = {
      id: String(r.id),
      role: String(r.role ?? ''),
      status: String(r.status ?? ''),
      codevertex_user_id: String(r.codevertex_user_id ?? ''),
      profile_id: typeof r.profile_id === 'string' ? r.profile_id : null,
      is_active: Boolean(r.is_active),
      created_at: String(r.created_at ?? ''),
    };
    const list = membersByTenant.get(tid) ?? [];
    list.push(row);
    membersByTenant.set(tid, list);
  }

  let items: Array<TenantApplicationItem & { _sortKey: string; _tenantId: string }> = [];

  for (const tenant of tenants) {
    const onboarding = parseOnboarding(tenant.metadata);
    if (params.countryCode) {
      const cc = onboarding && typeof onboarding.country_code === 'string'
        ? onboarding.country_code.toUpperCase()
        : '';
      if (cc !== params.countryCode) continue;
    }
    if (params.q && !matchesQuery(tenant, onboarding, params.q)) {
      continue;
    }

    const members = membersByTenant.get(tenant.id) ?? [];
    const item = buildItem(tenant, members);
    if (!item) continue;

    const sortKey = extractSubmittedAtFromMetadata(tenant.metadata, tenant.created_at);
    items.push({ ...item, _sortKey: sortKey, _tenantId: tenant.id });
  }

  items.sort((a, b) => {
    const cmp = a._sortKey.localeCompare(b._sortKey);
    return params.sort === 'submitted_at_desc' ? -cmp : cmp;
  });

  if (params.cursor) {
    const decoded = decodeCursor(params.cursor)!;
    items = items.filter(row => {
      const cmp = row._sortKey.localeCompare(decoded.submittedAt);
      if (cmp > 0) return true;
      if (cmp < 0) return false;
      return row._tenantId > decoded.tenantId;
    });
  }

  const totalEstimate = items.length;
  const pageItems = items.slice(0, params.limit);
  const last = pageItems[pageItems.length - 1];
  const next_cursor =
    items.length > params.limit && last
      ? encodeCursor(last._sortKey, last._tenantId)
      : null;

  const stripped = pageItems.map(({ _sortKey: _s, _tenantId: _t, ...rest }) => rest);

  return {
    ok: true,
    data: {
      items: stripped,
      page: {
        limit: params.limit,
        next_cursor,
        total_estimate: totalEstimate,
      },
    },
  };
}
