/**
 * FleetOS P2.2 — drivers CRUD (shared Edge logic).
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { isValidUuid, requireActiveTenantMember } from './fleetos-tenant-gate.ts';

const DRIVER_STATUSES = new Set([
  'active',
  'inactive',
  'on_trip',
  'available',
  'off_duty',
]);

const DRIVER_AVAILABILITIES = new Set(['available', 'busy', 'off']);

export const DRIVER_SELECT =
  `id, tenant_id, full_name, phone, email, status, availability, license_expires_at, tvde_cert_expires_at, tax_id, address, is_active, deactivated_at, created_at, updated_at`;

export interface DriverRow {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  availability: string | null;
  license_expires_at: string | null;
  tvde_cert_expires_at: string | null;
  tax_id: string | null;
  address: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function parseOptionalDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export function driverRowToApi(row: DriverRow): Record<string, unknown> {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    full_name: row.full_name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    availability: row.availability,
    license_expires_at: row.license_expires_at,
    tvde_cert_expires_at: row.tvde_cert_expires_at,
    tax_id: row.tax_id,
    address: row.address,
    is_active: row.is_active,
    deactivated_at: row.deactivated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function parseListDriversBody(body: unknown):
  | { ok: true; tenant_id: string; include_inactive: boolean; status: string | null; q: string | null; limit: number }
  | { ok: false; message: string } {
  const b = isRecord(body) ? body : {};
  const tenantId = typeof b.tenant_id === 'string' ? b.tenant_id.trim() : '';
  if (!isValidUuid(tenantId)) {
    return { ok: false, message: 'tenant_id is required' };
  }

  let limit = 100;
  if (typeof b.limit === 'number' && Number.isFinite(b.limit)) {
    limit = Math.min(200, Math.max(1, Math.floor(b.limit)));
  }

  const includeInactive = b.include_inactive === true;
  const status =
    typeof b.status === 'string' && b.status.trim() && DRIVER_STATUSES.has(b.status.trim())
      ? b.status.trim()
      : null;

  const q = typeof b.q === 'string' && b.q.trim() ? b.q.trim().toLowerCase() : null;

  return { ok: true, tenant_id: tenantId, include_inactive: includeInactive, status, q, limit };
}

export interface DriverInput {
  full_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  availability: string | null;
  license_expires_at: string | null;
  tvde_cert_expires_at: string | null;
  tax_id: string | null;
  address: string | null;
}

export function parseDriverInput(body: unknown, partial: boolean):
  | { ok: true; input: Partial<DriverInput> }
  | { ok: false; message: string } {
  const b = isRecord(body) ? body : {};
  const input: Partial<DriverInput> = {};

  if (!partial || b.full_name !== undefined || b.name !== undefined) {
    const raw = typeof b.full_name === 'string'
      ? b.full_name
      : typeof b.name === 'string'
        ? b.name
        : '';
    const fullName = raw.trim();
    if (!fullName || fullName.length > 120) {
      return { ok: false, message: 'full_name is required (max 120 chars)' };
    }
    input.full_name = fullName;
  }

  if (!partial || b.phone !== undefined) {
    const phone = typeof b.phone === 'string' ? b.phone.trim() : '';
    input.phone = phone ? phone.slice(0, 40) : null;
  }

  if (!partial || b.email !== undefined) {
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (email && (email.length > 254 || !email.includes('@'))) {
      return { ok: false, message: 'email must be a valid address' };
    }
    input.email = email || null;
  }

  if (!partial || b.status !== undefined) {
    const status = typeof b.status === 'string' ? b.status.trim() : 'active';
    if (!DRIVER_STATUSES.has(status)) {
      return { ok: false, message: 'invalid status' };
    }
    input.status = status;
  }

  if (b.availability !== undefined) {
    if (b.availability === null || b.availability === '') {
      input.availability = null;
    } else {
      const av = typeof b.availability === 'string' ? b.availability.trim() : '';
      if (!av || !DRIVER_AVAILABILITIES.has(av)) {
        return { ok: false, message: 'invalid availability' };
      }
      input.availability = av;
    }
  }

  if (!partial || b.license_expires_at !== undefined) {
    const d = parseOptionalDate(b.license_expires_at);
    if (b.license_expires_at !== undefined && b.license_expires_at !== null && b.license_expires_at !== '' && !d) {
      return { ok: false, message: 'license_expires_at must be YYYY-MM-DD' };
    }
    input.license_expires_at = d;
  }

  if (!partial || b.tvde_cert_expires_at !== undefined) {
    const d = parseOptionalDate(b.tvde_cert_expires_at);
    if (b.tvde_cert_expires_at !== undefined && b.tvde_cert_expires_at !== null && b.tvde_cert_expires_at !== '' && !d) {
      return { ok: false, message: 'tvde_cert_expires_at must be YYYY-MM-DD' };
    }
    input.tvde_cert_expires_at = d;
  }

  if (!partial || b.tax_id !== undefined) {
    const taxId = typeof b.tax_id === 'string' ? b.tax_id.trim() : '';
    input.tax_id = taxId ? taxId.slice(0, 32) : null;
  }

  if (!partial || b.address !== undefined) {
    const address = typeof b.address === 'string' ? b.address.trim() : '';
    input.address = address ? address.slice(0, 500) : null;
  }

  if (!partial) {
    const full = input as DriverInput;
    if (!full.full_name) {
      return { ok: false, message: 'full_name is required' };
    }
    full.status = full.status ?? 'active';
    full.phone = full.phone ?? null;
    full.email = full.email ?? null;
    full.availability = full.availability ?? null;
    full.license_expires_at = full.license_expires_at ?? null;
    full.tvde_cert_expires_at = full.tvde_cert_expires_at ?? null;
    full.tax_id = full.tax_id ?? null;
    full.address = full.address ?? null;
  }

  return { ok: true, input };
}

export async function listDriversForTenant(
  admin: SupabaseClient,
  codevertexUserId: string,
  params: ReturnType<typeof parseListDriversBody> & { ok: true },
): Promise<
  | { ok: true; drivers: Record<string, unknown>[] }
  | { ok: false; status: number; error: string; message: string }
> {
  const gate = await requireActiveTenantMember(admin, codevertexUserId, params.tenant_id);
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error, message: gate.message };
  }

  let query = admin
    .from('drivers')
    .select(DRIVER_SELECT)
    .eq('tenant_id', params.tenant_id)
    .order('created_at', { ascending: false })
    .limit(params.limit);

  if (!params.include_inactive) {
    query = query.eq('is_active', true);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }

  const { data, error } = await query;
  if (error) {
    return { ok: false, status: 500, error: 'database_error', message: error.message };
  }

  let rows = (data ?? []) as DriverRow[];

  if (params.q) {
    const q = params.q;
    rows = rows.filter((d) => {
      const hay = `${d.full_name} ${d.phone ?? ''} ${d.email ?? ''} ${d.tax_id ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return { ok: true, drivers: rows.map(driverRowToApi) };
}

export async function createDriver(
  admin: SupabaseClient,
  codevertexUserId: string,
  tenantId: string,
  input: DriverInput,
): Promise<
  | { ok: true; driver: Record<string, unknown> }
  | { ok: false; status: number; error: string; message: string }
> {
  const gate = await requireActiveTenantMember(admin, codevertexUserId, tenantId, {
    requireAdmin: true,
  });
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error, message: gate.message };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('drivers')
    .insert({
      tenant_id: tenantId,
      full_name: input.full_name,
      phone: input.phone,
      email: input.email,
      status: input.status,
      availability: input.availability,
      license_expires_at: input.license_expires_at,
      tvde_cert_expires_at: input.tvde_cert_expires_at,
      tax_id: input.tax_id,
      address: input.address,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    .select(DRIVER_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        status: 409,
        error: 'email_taken',
        message: 'A driver with this email already exists in the fleet',
      };
    }
    return { ok: false, status: 500, error: 'database_error', message: error.message };
  }

  return { ok: true, driver: driverRowToApi(data as DriverRow) };
}

export async function updateDriver(
  admin: SupabaseClient,
  codevertexUserId: string,
  tenantId: string,
  driverId: string,
  input: Partial<DriverInput>,
): Promise<
  | { ok: true; driver: Record<string, unknown> }
  | { ok: false; status: number; error: string; message: string }
> {
  if (!isValidUuid(driverId)) {
    return {
      ok: false,
      status: 400,
      error: 'validation_error',
      message: 'driver_id must be a valid UUID',
    };
  }

  const gate = await requireActiveTenantMember(admin, codevertexUserId, tenantId, {
    requireAdmin: true,
  });
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error, message: gate.message };
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.full_name !== undefined) payload.full_name = input.full_name;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.email !== undefined) payload.email = input.email;
  if (input.status !== undefined) payload.status = input.status;
  if (input.availability !== undefined) payload.availability = input.availability;
  if (input.license_expires_at !== undefined) payload.license_expires_at = input.license_expires_at;
  if (input.tvde_cert_expires_at !== undefined) payload.tvde_cert_expires_at = input.tvde_cert_expires_at;
  if (input.tax_id !== undefined) payload.tax_id = input.tax_id;
  if (input.address !== undefined) payload.address = input.address;

  const { data, error } = await admin
    .from('drivers')
    .update(payload)
    .eq('id', driverId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .select(DRIVER_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        status: 409,
        error: 'email_taken',
        message: 'A driver with this email already exists in the fleet',
      };
    }
    return { ok: false, status: 500, error: 'database_error', message: error.message };
  }

  if (!data) {
    return {
      ok: false,
      status: 404,
      error: 'driver_not_found',
      message: 'Driver not found or inactive',
    };
  }

  return { ok: true, driver: driverRowToApi(data as DriverRow) };
}

export async function deactivateDriver(
  admin: SupabaseClient,
  codevertexUserId: string,
  tenantId: string,
  driverId: string,
): Promise<
  | { ok: true; driver: Record<string, unknown>; idempotent: boolean }
  | { ok: false; status: number; error: string; message: string }
> {
  if (!isValidUuid(driverId)) {
    return {
      ok: false,
      status: 400,
      error: 'validation_error',
      message: 'driver_id must be a valid UUID',
    };
  }

  const gate = await requireActiveTenantMember(admin, codevertexUserId, tenantId, {
    requireAdmin: true,
  });
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error, message: gate.message };
  }

  const { data: existing, error: selErr } = await admin
    .from('drivers')
    .select(DRIVER_SELECT)
    .eq('id', driverId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (selErr) {
    return { ok: false, status: 500, error: 'database_error', message: selErr.message };
  }
  if (!existing) {
    return {
      ok: false,
      status: 404,
      error: 'driver_not_found',
      message: 'Driver not found',
    };
  }

  const row = existing as DriverRow;
  if (!row.is_active) {
    return { ok: true, driver: driverRowToApi(row), idempotent: true };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('drivers')
    .update({
      is_active: false,
      status: 'inactive',
      deactivated_at: now,
      updated_at: now,
    })
    .eq('id', driverId)
    .eq('tenant_id', tenantId)
    .select(DRIVER_SELECT)
    .single();

  if (error) {
    return { ok: false, status: 500, error: 'database_error', message: error.message };
  }

  return {
    ok: true,
    driver: driverRowToApi(data as DriverRow),
    idempotent: false,
  };
}
