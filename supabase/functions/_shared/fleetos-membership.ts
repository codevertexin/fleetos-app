/**
 * FleetOS Phase 2B — canonical membership helpers for Edge functions.
 * Resolves JWT/Auth Core roles via fleetos_role_map; reads/writes tenant_members.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

export const CANONICAL_ROLES = new Set([
  'owner',
  'admin',
  'manager',
  'dispatcher',
  'driver',
  'mechanic',
  'viewer',
]);

/** Legacy roles allowed in fleetos_role_map (tenant_users era). */
export const LEGACY_ROLES = new Set([
  'tenant_admin',
  'fleet_manager',
  'operations',
  'dispatcher',
  'finance',
  'driver',
  'owner',
  'viewer',
]);

export interface ResolvedRole {
  canonicalRole: string;
  legacyRole: string | null;
}

/**
 * Maps JWT role to canonical tenant_members.role.
 * - Canonical input → use as-is, legacy_role null
 * - Legacy input → fleetos_role_map lookup, legacy_role preserved
 * - Unknown → viewer + legacy_role raw when non-empty
 */
export async function resolveCanonicalRole(
  admin: SupabaseClient,
  roleInput: string | undefined,
): Promise<ResolvedRole> {
  const raw = (roleInput ?? 'viewer').trim().toLowerCase();
  if (!raw) {
    return { canonicalRole: 'viewer', legacyRole: null };
  }

  if (CANONICAL_ROLES.has(raw)) {
    return { canonicalRole: raw, legacyRole: null };
  }

  const { data, error } = await admin
    .from('fleetos_role_map')
    .select('canonical_role')
    .eq('legacy_role', raw)
    .maybeSingle();

  if (!error && data?.canonical_role && CANONICAL_ROLES.has(String(data.canonical_role))) {
    return {
      canonicalRole: String(data.canonical_role),
      legacyRole: raw,
    };
  }

  if (LEGACY_ROLES.has(raw)) {
    return { canonicalRole: 'viewer', legacyRole: raw };
  }

  return { canonicalRole: 'viewer', legacyRole: raw };
}

/** API role for pre-B.5 frontend (FleetosRole legacy strings). */
export function roleForApiResponse(member: {
  role: string;
  legacy_role?: string | null;
}): string {
  const legacy = member.legacy_role?.trim();
  if (legacy) return legacy;
  return member.role;
}

export async function upsertActiveTenantMember(
  admin: SupabaseClient,
  input: {
    tenant_id: string;
    codevertex_user_id: string;
    profile_id: string;
    canonicalRole: string;
    legacyRole: string | null;
  },
): Promise<{ error?: string }> {
  const now = new Date().toISOString();
  const payload = {
    tenant_id: input.tenant_id,
    codevertex_user_id: input.codevertex_user_id,
    profile_id: input.profile_id,
    role: input.canonicalRole,
    legacy_role: input.legacyRole,
    status: 'active',
    is_active: true,
    updated_at: now,
  };

  const { data: existing, error: selErr } = await admin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', input.tenant_id)
    .eq('codevertex_user_id', input.codevertex_user_id)
    .neq('status', 'removed')
    .maybeSingle();

  if (selErr) return { error: selErr.message };

  if (existing?.id) {
    const { error } = await admin.from('tenant_members').update(payload).eq('id', existing.id);
    return { error: error?.message };
  }

  const { error } = await admin.from('tenant_members').insert({
    ...payload,
    created_at: now,
  });
  return { error: error?.message };
}

export const TENANT_MEMBER_SELECT =
  `role, legacy_role, status, is_active, tenants ( id, slug, name, primary_color, logo_url, status )`;

export function memberRowToTenantPayload(
  row: Record<string, unknown>,
  roleOverride?: string,
): Record<string, unknown> | null {
  const t = row.tenants as Record<string, unknown> | null | undefined;
  if (!t || typeof t.id !== 'string' || t.status !== 'active') return null;

  const apiRole =
    typeof roleOverride === 'string'
      ? roleOverride
      : roleForApiResponse({
          role: String(row.role ?? 'viewer'),
          legacy_role: row.legacy_role as string | null | undefined,
        });

  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    role: apiRole,
    accentColor: (t.primary_color as string) || '#00B39A',
    logoUrl: (t.logo_url as string) || '/logo.png',
    companyName: t.name,
  };
}
