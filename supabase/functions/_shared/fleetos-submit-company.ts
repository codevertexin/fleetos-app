/**
 * FleetOS P0.2B — company onboarding submit (validation + writes).
 * @see docs/architecture/FLEETOS_COMPANY_ONBOARDING_P0_CONTRACT.md §9
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { extractSubmittedAtFromMetadata } from './fleetos-access.ts';
import { roleForApiResponse } from './fleetos-membership.ts';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_COUNTRY_RE = /^[A-Z]{2}$/;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const HTTPS_URL_RE = /^https:\/\/.+/i;

const OWNER_ADMIN_ROLES = new Set(['owner', 'admin']);
const IDEMPOTENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ValidatedCompany {
  name: string;
  legal_name: string;
  slug: string;
  country_code: string;
  tax_id: string;
  locale: string;
  currency: string;
  timezone: string;
  primary_color: string | null;
  logo_url: string | null;
}

export interface SubmitConflictActive {
  kind: 'already_has_active_membership';
}

export interface SubmitConflictPending {
  kind: 'pending_application_exists';
  tenant_id: string;
}

export type SubmitConflict = SubmitConflictActive | SubmitConflictPending;

export interface SubmitSuccessPayload {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    submitted_at: string;
  };
  membership: {
    id: string;
    role: string;
    status: string;
  };
  idempotent: boolean;
}

interface ConflictMemberRow {
  id: string;
  role: string;
  status: string;
  tenants: { id: string; status: string } | null;
}

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** P0 field validation — returns field-keyed errors for 400. */
export function validateCompanyPayload(
  body: unknown,
): { ok: true; company: ValidatedCompany } | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const prefix = 'company';

  if (!isRecord(body) || !isRecord(body.company)) {
    return { ok: false, fields: { company: 'company object is required' } };
  }

  const c = body.company;
  const name = trimStr(c.name);
  const legalName = trimStr(c.legal_name);
  const slug = trimStr(c.slug).toLowerCase();
  const countryCode = trimStr(c.country_code).toUpperCase();
  const taxId = trimStr(c.tax_id);
  const locale = trimStr(c.locale) || 'pt-PT';
  const currency = trimStr(c.currency) || 'EUR';
  const timezone = trimStr(c.timezone) || 'Europe/Lisbon';
  const primaryColorRaw = c.primary_color;
  const logoUrlRaw = c.logo_url;

  if (name.length < 2 || name.length > 120) {
    fields[`${prefix}.name`] = 'must be 2–120 characters';
  }
  if (legalName.length < 2 || legalName.length > 200) {
    fields[`${prefix}.legal_name`] = 'must be 2–200 characters';
  }
  if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 48) {
    fields[`${prefix}.slug`] = 'must be 3–48 chars, lowercase alphanumeric and hyphens only';
  }
  if (!ISO_COUNTRY_RE.test(countryCode)) {
    fields[`${prefix}.country_code`] = 'must be ISO 3166-1 alpha-2 (e.g. PT)';
  }
  if (!taxId) {
    fields[`${prefix}.tax_id`] = 'is required';
  } else if (countryCode === 'PT' && !/^\d{9}$/.test(taxId.replace(/\s/g, ''))) {
    fields[`${prefix}.tax_id`] = 'for PT must be 9 digits (NIF format check P1)';
  }

  let primary_color: string | null = null;
  if (primaryColorRaw !== undefined && primaryColorRaw !== null && primaryColorRaw !== '') {
    const pc = trimStr(primaryColorRaw);
    if (!HEX_COLOR_RE.test(pc)) {
      fields[`${prefix}.primary_color`] = 'must be #RRGGBB';
    } else {
      primary_color = pc;
    }
  }

  let logo_url: string | null = null;
  if (logoUrlRaw !== undefined && logoUrlRaw !== null && logoUrlRaw !== '') {
    const lu = trimStr(logoUrlRaw);
    if (!HTTPS_URL_RE.test(lu)) {
      fields[`${prefix}.logo_url`] = 'must be an HTTPS URL or null';
    } else {
      logo_url = lu;
    }
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, fields };
  }

  return {
    ok: true,
    company: {
      name,
      legal_name: legalName,
      slug,
      country_code: countryCode,
      tax_id: countryCode === 'PT' ? taxId.replace(/\s/g, '') : taxId,
      locale,
      currency,
      timezone,
      primary_color,
      logo_url,
    },
  };
}

/** Block submit when user already has owner/admin membership active or pending (P0.2B). */
export function evaluateSubmitConflicts(rows: ConflictMemberRow[]): SubmitConflict | null {
  for (const row of rows) {
    const role = row.role.trim().toLowerCase();
    if (!OWNER_ADMIN_ROLES.has(role)) continue;

    const mStatus = row.status.trim().toLowerCase();
    const tenant = row.tenants;
    if (!tenant?.id) continue;

    const tStatus = tenant.status.trim().toLowerCase();

    if (mStatus === 'active') {
      return { kind: 'already_has_active_membership' };
    }

    if (mStatus === 'pending' || mStatus === 'invited' || tStatus === 'pending_review') {
      return { kind: 'pending_application_exists', tenant_id: tenant.id };
    }
  }

  return null;
}

export function buildOnboardingMetadata(
  company: ValidatedCompany,
  codevertexUserId: string,
  submittedAt: string,
): Record<string, unknown> {
  return {
    onboarding: {
      legal_name: company.legal_name,
      tax_id: company.tax_id,
      country_code: company.country_code,
      submitted_at: submittedAt,
      submitted_by_codevertex_user_id: codevertexUserId,
      review_notes: null,
    },
  };
}

export function buildSubmitSuccessBody(
  payload: SubmitSuccessPayload,
): Record<string, unknown> {
  const { tenant, membership } = payload;
  return {
    ok: true,
    access_state: 'pending_review',
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      submitted_at: tenant.submitted_at,
    },
    membership: {
      id: membership.id,
      role: membership.role,
      status: membership.status,
    },
    redirect_path: '/preview',
    auth_core: {
      recommended_membership_status: 'pending',
      fleetos_tenant_id: tenant.id,
      fleetos_role: 'owner',
    },
  };
}

export async function ensureProfileForUser(
  admin: SupabaseClient,
  codevertexUserId: string,
): Promise<{ profileId: string | null; error?: string }> {
  const { data: byCv, error: e1 } = await admin
    .from('profiles')
    .select('id')
    .eq('codevertex_user_id', codevertexUserId)
    .maybeSingle();
  if (e1) return { profileId: null, error: e1.message };
  if (byCv?.id) return { profileId: byCv.id as string };

  const { data: byPk, error: e2 } = await admin
    .from('profiles')
    .select('id')
    .eq('id', codevertexUserId)
    .maybeSingle();
  if (e2) return { profileId: null, error: e2.message };
  if (byPk?.id) {
    const { error: e3 } = await admin
      .from('profiles')
      .update({ codevertex_user_id: codevertexUserId })
      .eq('id', codevertexUserId);
    if (e3) return { profileId: null, error: e3.message };
    return { profileId: byPk.id as string };
  }

  const { data: inserted, error: e4 } = await admin
    .from('profiles')
    .insert({ codevertex_user_id: codevertexUserId })
    .select('id')
    .single();
  if (e4) return { profileId: null, error: e4.message };
  return { profileId: inserted?.id as string };
}

interface IdempotentRow {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    metadata: unknown;
    created_at: string;
  };
  membership: {
    id: string;
    role: string;
    legacy_role: string | null;
    status: string;
  };
}

/** Same sub + slug + pending_review within 24h (contract §9.4 optional idempotency). */
export async function findIdempotentPendingApplication(
  admin: SupabaseClient,
  codevertexUserId: string,
  slug: string,
): Promise<IdempotentRow | null> {
  const { data: tenant, error: te } = await admin
    .from('tenants')
    .select('id, name, slug, status, metadata, created_at')
    .eq('slug', slug)
    .eq('status', 'pending_review')
    .maybeSingle();

  if (te || !tenant?.id) return null;

  const { data: member, error: me } = await admin
    .from('tenant_members')
    .select('id, role, legacy_role, status, created_at')
    .eq('tenant_id', tenant.id)
    .eq('codevertex_user_id', codevertexUserId)
    .in('role', ['owner', 'admin'])
    .in('status', ['pending', 'invited'])
    .maybeSingle();

  if (me || !member?.id) return null;

  const submittedAt = extractSubmittedAtFromMetadata(tenant.metadata, tenant.created_at);
  const submittedMs = Date.parse(submittedAt);
  if (!Number.isFinite(submittedMs)) return null;
  if (Date.now() - submittedMs > IDEMPOTENT_WINDOW_MS) return null;

  return {
    tenant: tenant as IdempotentRow['tenant'],
    membership: member as IdempotentRow['membership'],
  };
}

export async function isSlugTakenByOther(
  admin: SupabaseClient,
  slug: string,
  excludeTenantId?: string,
): Promise<boolean> {
  let q = admin.from('tenants').select('id').eq('slug', slug);
  if (excludeTenantId) {
    q = q.neq('id', excludeTenantId);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

export async function submitCompanyApplication(
  admin: SupabaseClient,
  codevertexUserId: string,
  company: ValidatedCompany,
): Promise<
  | { ok: true; payload: SubmitSuccessPayload }
  | { ok: false; error: string; message?: string; tenant_id?: string }
> {
  const submittedAt = new Date().toISOString();
  const metadata = buildOnboardingMetadata(company, codevertexUserId, submittedAt);

  const { data: tenantRow, error: tenantErr } = await admin
    .from('tenants')
    .insert({
      name: company.name,
      slug: company.slug,
      status: 'pending_review',
      locale: company.locale,
      currency: company.currency,
      timezone: company.timezone,
      primary_color: company.primary_color,
      logo_url: company.logo_url,
      billing_plan_code: null,
      legacy_company_id: null,
      metadata,
    })
    .select('id, name, slug, status, metadata, created_at')
    .single();

  if (tenantErr) {
    if (tenantErr.code === '23505') {
      return { ok: false, error: 'slug_taken', message: 'Slug is already in use' };
    }
    return { ok: false, error: 'database_error', message: tenantErr.message };
  }

  const tenantId = tenantRow.id as string;

  const rollbackTenant = async () => {
    await admin.from('tenants').delete().eq('id', tenantId);
  };

  const { error: settingsErr } = await admin.from('tenant_settings').insert({
    tenant_id: tenantId,
  });

  if (settingsErr) {
    await rollbackTenant();
    return { ok: false, error: 'database_error', message: settingsErr.message };
  }

  const { profileId, error: profileErr } = await ensureProfileForUser(admin, codevertexUserId);
  if (profileErr || !profileId) {
    await rollbackTenant();
    return {
      ok: false,
      error: 'database_error',
      message: profileErr ?? 'profile_create_failed',
    };
  }

  const { data: memberRow, error: memberErr } = await admin
    .from('tenant_members')
    .insert({
      tenant_id: tenantId,
      codevertex_user_id: codevertexUserId,
      profile_id: profileId,
      role: 'owner',
      legacy_role: null,
      status: 'pending',
      is_active: false,
    })
    .select('id, role, legacy_role, status')
    .single();

  if (memberErr) {
    await rollbackTenant();
    if (memberErr.code === '23505') {
      return {
        ok: false,
        error: 'pending_application_exists',
        message: 'Membership already exists for this tenant',
        tenant_id: tenantId,
      };
    }
    return { ok: false, error: 'database_error', message: memberErr.message };
  }

  return {
    ok: true,
    payload: {
      idempotent: false,
      tenant: {
        id: tenantId,
        name: tenantRow.name as string,
        slug: tenantRow.slug as string,
        status: tenantRow.status as string,
        submitted_at: submittedAt,
      },
      membership: {
        id: memberRow.id as string,
        role: roleForApiResponse({
          role: String(memberRow.role),
          legacy_role: memberRow.legacy_role as string | null,
        }),
        status: String(memberRow.status),
      },
    },
  };
}

export function idempotentToSuccessPayload(row: IdempotentRow): SubmitSuccessPayload {
  return {
    idempotent: true,
    tenant: {
      id: row.tenant.id,
      name: row.tenant.name,
      slug: row.tenant.slug,
      status: row.tenant.status,
      submitted_at: extractSubmittedAtFromMetadata(row.tenant.metadata, row.tenant.created_at),
    },
    membership: {
      id: row.membership.id,
      role: roleForApiResponse({
        role: row.membership.role,
        legacy_role: row.membership.legacy_role,
      }),
      status: row.membership.status,
    },
  };
}

export const SUBMIT_CONFLICT_MEMBER_SELECT =
  `id, role, status, tenants ( id, status )`;
