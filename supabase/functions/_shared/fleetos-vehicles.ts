/**
 * FleetOS P2.1 — vehicles CRUD (shared Edge logic).
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { isValidUuid, requireActiveTenantMember } from './fleetos-tenant-gate.ts';

const VEHICLE_STATUSES = new Set([
  'active',
  'inactive',
  'maintenance',
  'available',
  'rented',
]);

const OWNERSHIP_TYPES = new Set([
  'company_owned',
  'individual_owner',
  'external_company',
  'leasing_partner',
]);

export const VEHICLE_SELECT =
  `id, tenant_id, plate, brand, model, year, status, odometer_km, vin, color, fuel, ownership_type, is_active, deactivated_at, created_at, updated_at`;

export interface VehicleRow {
  id: string;
  tenant_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  status: string;
  odometer_km: number;
  vin: string | null;
  color: string | null;
  fuel: string | null;
  ownership_type: string;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function normalizePlate(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function vehicleRowToApi(row: VehicleRow): Record<string, unknown> {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    plate: row.plate,
    brand: row.brand,
    model: row.model,
    year: row.year,
    status: row.status,
    odometer_km: row.odometer_km,
    vin: row.vin,
    color: row.color,
    fuel: row.fuel,
    ownership_type: row.ownership_type,
    is_active: row.is_active,
    deactivated_at: row.deactivated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function parseListVehiclesBody(body: unknown):
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
    typeof b.status === 'string' && b.status.trim() && VEHICLE_STATUSES.has(b.status.trim())
      ? b.status.trim()
      : null;

  const q = typeof b.q === 'string' && b.q.trim() ? b.q.trim().toLowerCase() : null;

  return { ok: true, tenant_id: tenantId, include_inactive: includeInactive, status, q, limit };
}

export interface VehicleInput {
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  status: string;
  odometer_km: number;
  vin: string | null;
  color: string | null;
  fuel: string | null;
  ownership_type: string;
}

export function parseVehicleInput(body: unknown, partial: boolean):
  | { ok: true; input: Partial<VehicleInput> }
  | { ok: false; message: string } {
  const b = isRecord(body) ? body : {};

  const input: Partial<VehicleInput> = {};

  if (!partial || b.plate !== undefined) {
    const plate = typeof b.plate === 'string' ? normalizePlate(b.plate) : '';
    if (!plate || plate.length > 20) {
      return { ok: false, message: 'plate is required (max 20 chars)' };
    }
    input.plate = plate;
  }

  if (!partial || b.brand !== undefined) {
    const brand = typeof b.brand === 'string' ? b.brand.trim() : '';
    if (!brand || brand.length > 80) {
      return { ok: false, message: 'brand is required (max 80 chars)' };
    }
    input.brand = brand;
  }

  if (!partial || b.model !== undefined) {
    const model = typeof b.model === 'string' ? b.model.trim() : '';
    if (!model || model.length > 80) {
      return { ok: false, message: 'model is required (max 80 chars)' };
    }
    input.model = model;
  }

  if (!partial || b.year !== undefined) {
    if (b.year === null || b.year === '') {
      input.year = null;
    } else if (typeof b.year === 'number' && Number.isFinite(b.year)) {
      const y = Math.floor(b.year);
      if (y < 1980 || y > 2100) {
        return { ok: false, message: 'year must be between 1980 and 2100' };
      }
      input.year = y;
    } else {
      return { ok: false, message: 'year must be a number or null' };
    }
  }

  if (!partial || b.status !== undefined) {
    const status = typeof b.status === 'string' ? b.status.trim() : 'active';
    if (!VEHICLE_STATUSES.has(status)) {
      return { ok: false, message: 'invalid status' };
    }
    input.status = status;
  }

  if (!partial || b.odometer_km !== undefined) {
    const odometer =
      typeof b.odometer_km === 'number'
        ? b.odometer_km
        : typeof b.odometer === 'number'
          ? b.odometer
          : 0;
    if (!Number.isFinite(odometer) || odometer < 0) {
      return { ok: false, message: 'odometer_km must be >= 0' };
    }
    input.odometer_km = Math.floor(odometer);
  }

  if (!partial || b.vin !== undefined) {
    const vin = typeof b.vin === 'string' ? b.vin.trim() : '';
    input.vin = vin ? vin.slice(0, 32) : null;
  }

  if (!partial || b.color !== undefined) {
    const color = typeof b.color === 'string' ? b.color.trim() : '';
    input.color = color ? color.slice(0, 40) : null;
  }

  if (!partial || b.fuel !== undefined) {
    const fuel = typeof b.fuel === 'string' ? b.fuel.trim() : '';
    input.fuel = fuel ? fuel.slice(0, 40) : null;
  }

  if (!partial || b.ownership_type !== undefined) {
    const ot = typeof b.ownership_type === 'string' ? b.ownership_type.trim() : 'company_owned';
    if (!OWNERSHIP_TYPES.has(ot)) {
      return { ok: false, message: 'invalid ownership_type' };
    }
    input.ownership_type = ot;
  }

  if (!partial) {
    const full = input as VehicleInput;
    if (!full.plate || !full.brand || !full.model) {
      return { ok: false, message: 'plate, brand, and model are required' };
    }
    full.status = full.status ?? 'active';
    full.odometer_km = full.odometer_km ?? 0;
    full.ownership_type = full.ownership_type ?? 'company_owned';
    full.year = full.year ?? null;
    full.vin = full.vin ?? null;
    full.color = full.color ?? null;
    full.fuel = full.fuel ?? null;
  }

  return { ok: true, input };
}

export async function listVehiclesForTenant(
  admin: SupabaseClient,
  codevertexUserId: string,
  params: ReturnType<typeof parseListVehiclesBody> & { ok: true },
): Promise<
  | { ok: true; vehicles: Record<string, unknown>[] }
  | { ok: false; status: number; error: string; message: string }
> {
  const gate = await requireActiveTenantMember(admin, codevertexUserId, params.tenant_id);
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error, message: gate.message };
  }

  let query = admin
    .from('vehicles')
    .select(VEHICLE_SELECT)
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

  let rows = (data ?? []) as VehicleRow[];

  if (params.q) {
    const q = params.q;
    rows = rows.filter((v) => {
      const hay = `${v.plate} ${v.brand} ${v.model} ${v.vin ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return { ok: true, vehicles: rows.map(vehicleRowToApi) };
}

export async function createVehicle(
  admin: SupabaseClient,
  codevertexUserId: string,
  tenantId: string,
  input: VehicleInput,
): Promise<
  | { ok: true; vehicle: Record<string, unknown> }
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
    .from('vehicles')
    .insert({
      tenant_id: tenantId,
      plate: input.plate,
      brand: input.brand,
      model: input.model,
      year: input.year,
      status: input.status,
      odometer_km: input.odometer_km,
      vin: input.vin,
      color: input.color,
      fuel: input.fuel,
      ownership_type: input.ownership_type,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    .select(VEHICLE_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        status: 409,
        error: 'plate_taken',
        message: 'A vehicle with this plate already exists in the fleet',
      };
    }
    return { ok: false, status: 500, error: 'database_error', message: error.message };
  }

  return { ok: true, vehicle: vehicleRowToApi(data as VehicleRow) };
}

export async function updateVehicle(
  admin: SupabaseClient,
  codevertexUserId: string,
  tenantId: string,
  vehicleId: string,
  input: Partial<VehicleInput>,
): Promise<
  | { ok: true; vehicle: Record<string, unknown> }
  | { ok: false; status: number; error: string; message: string }
> {
  if (!isValidUuid(vehicleId)) {
    return {
      ok: false,
      status: 400,
      error: 'validation_error',
      message: 'vehicle_id must be a valid UUID',
    };
  }

  const gate = await requireActiveTenantMember(admin, codevertexUserId, tenantId, {
    requireAdmin: true,
  });
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error, message: gate.message };
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.plate !== undefined) payload.plate = input.plate;
  if (input.brand !== undefined) payload.brand = input.brand;
  if (input.model !== undefined) payload.model = input.model;
  if (input.year !== undefined) payload.year = input.year;
  if (input.status !== undefined) payload.status = input.status;
  if (input.odometer_km !== undefined) payload.odometer_km = input.odometer_km;
  if (input.vin !== undefined) payload.vin = input.vin;
  if (input.color !== undefined) payload.color = input.color;
  if (input.fuel !== undefined) payload.fuel = input.fuel;
  if (input.ownership_type !== undefined) payload.ownership_type = input.ownership_type;

  const { data, error } = await admin
    .from('vehicles')
    .update(payload)
    .eq('id', vehicleId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .select(VEHICLE_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        status: 409,
        error: 'plate_taken',
        message: 'A vehicle with this plate already exists in the fleet',
      };
    }
    return { ok: false, status: 500, error: 'database_error', message: error.message };
  }

  if (!data) {
    return {
      ok: false,
      status: 404,
      error: 'vehicle_not_found',
      message: 'Vehicle not found or inactive',
    };
  }

  return { ok: true, vehicle: vehicleRowToApi(data as VehicleRow) };
}

export async function deactivateVehicle(
  admin: SupabaseClient,
  codevertexUserId: string,
  tenantId: string,
  vehicleId: string,
): Promise<
  | { ok: true; vehicle: Record<string, unknown>; idempotent: boolean }
  | { ok: false; status: number; error: string; message: string }
> {
  if (!isValidUuid(vehicleId)) {
    return {
      ok: false,
      status: 400,
      error: 'validation_error',
      message: 'vehicle_id must be a valid UUID',
    };
  }

  const gate = await requireActiveTenantMember(admin, codevertexUserId, tenantId, {
    requireAdmin: true,
  });
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error, message: gate.message };
  }

  const { data: existing, error: selErr } = await admin
    .from('vehicles')
    .select(VEHICLE_SELECT)
    .eq('id', vehicleId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (selErr) {
    return { ok: false, status: 500, error: 'database_error', message: selErr.message };
  }
  if (!existing) {
    return {
      ok: false,
      status: 404,
      error: 'vehicle_not_found',
      message: 'Vehicle not found',
    };
  }

  const row = existing as VehicleRow;
  if (!row.is_active) {
    return { ok: true, vehicle: vehicleRowToApi(row), idempotent: true };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('vehicles')
    .update({
      is_active: false,
      status: 'inactive',
      deactivated_at: now,
      updated_at: now,
    })
    .eq('id', vehicleId)
    .eq('tenant_id', tenantId)
    .select(VEHICLE_SELECT)
    .single();

  if (error) {
    return { ok: false, status: 500, error: 'database_error', message: error.message };
  }

  return {
    ok: true,
    vehicle: vehicleRowToApi(data as VehicleRow),
    idempotent: false,
  };
}
