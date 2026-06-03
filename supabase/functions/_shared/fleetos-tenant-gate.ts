/**
 * FleetOS — tenant membership gates for operational Edge (P2.1+).
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ADMIN_ROLES = new Set(['owner', 'admin']);

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export type TenantGateResult =
  | {
      ok: true;
      member: {
        id: string;
        role: string;
        legacy_role: string | null;
        is_admin: boolean;
      };
    }
  | { ok: false; status: number; error: string; message: string };

export async function requireActiveTenantMember(
  admin: SupabaseClient,
  codevertexUserId: string,
  tenantId: string,
  options?: { requireAdmin?: boolean },
): Promise<TenantGateResult> {
  if (!isValidUuid(tenantId)) {
    return {
      ok: false,
      status: 400,
      error: 'validation_error',
      message: 'tenant_id must be a valid UUID',
    };
  }

  const { data, error } = await admin
    .from('tenant_members')
    .select('id, role, legacy_role, status')
    .eq('tenant_id', tenantId)
    .eq('codevertex_user_id', codevertexUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      error: 'database_error',
      message: error.message,
    };
  }

  if (!data?.id) {
    return {
      ok: false,
      status: 403,
      error: 'tenant_access_denied',
      message: 'No active membership for this tenant',
    };
  }

  const role = String(data.role ?? 'viewer').trim().toLowerCase();
  const isAdmin = ADMIN_ROLES.has(role);

  if (options?.requireAdmin && !isAdmin) {
    return {
      ok: false,
      status: 403,
      error: 'insufficient_role',
      message: 'Owner or admin role required',
    };
  }

  return {
    ok: true,
    member: {
      id: String(data.id),
      role,
      legacy_role: typeof data.legacy_role === 'string' ? data.legacy_role : null,
      is_admin: isAdmin,
    },
  };
}
