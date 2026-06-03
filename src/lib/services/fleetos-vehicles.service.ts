/**
 * FleetOS P2.1 — vehicles Edge client.
 */

import {
  CodevertexEdgeJwtExpiredError,
  EDGE_SESSION_EXPIRED_MESSAGE,
} from '@/lib/codevertex-edge-jwt';
import { FleetosEdgeRequestError, postFleetosEdge } from '@/lib/fleetos-edge-client';
import type { FleetosVehicleRecord } from '@/types/fleetos-vehicle';

function supabaseBase(): string | null {
  return (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || null;
}

function anonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
}

function edgeUrl(name: string, explicitEnv?: string): string | null {
  const explicit = explicitEnv?.trim();
  if (explicit) return explicit;
  const base = supabaseBase();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/functions/v1/${name}`;
}

export function getFleetosListVehiclesUrl(): string | null {
  return edgeUrl(
    'fleetos-list-vehicles',
    import.meta.env.VITE_FLEETOS_LIST_VEHICLES_URL as string | undefined,
  );
}

export function isFleetosVehiclesConfigured(): boolean {
  return Boolean(getFleetosListVehiclesUrl() && anonKey());
}

export function shouldUseVehicleMockData(): boolean {
  return import.meta.env.VITE_FLEETOS_USE_VEHICLE_MOCK === 'true';
}

export class FleetosVehiclesError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'FleetosVehiclesError';
    this.status = status;
    this.code = code;
  }
}

function mapEdgeError(err: unknown): never {
  if (err instanceof CodevertexEdgeJwtExpiredError) {
    throw new FleetosVehiclesError(401, 'session_expired', EDGE_SESSION_EXPIRED_MESSAGE);
  }
  if (err instanceof FleetosEdgeRequestError) {
    throw new FleetosVehiclesError(err.status, err.code, err.message);
  }
  throw err;
}

export type FleetosVehiclesEdgeOptions = {
  expiresAt?: string | null;
};

async function postEdge<T>(
  url: string,
  edgeJwt: string,
  body: Record<string, unknown>,
  options?: FleetosVehiclesEdgeOptions,
): Promise<T> {
  try {
    return await postFleetosEdge<T>(url, edgeJwt, body, {
      expiresAt: options?.expiresAt,
      redirectOnExpired: true,
    });
  } catch (e) {
    return mapEdgeError(e);
  }
}

function parseVehicle(raw: unknown): FleetosVehicleRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.plate !== 'string') return null;
  return {
    id: r.id,
    tenant_id: String(r.tenant_id ?? ''),
    plate: String(r.plate),
    brand: String(r.brand ?? ''),
    model: String(r.model ?? ''),
    year: typeof r.year === 'number' ? r.year : null,
    status: String(r.status ?? 'active') as FleetosVehicleRecord['status'],
    odometer_km: typeof r.odometer_km === 'number' ? r.odometer_km : 0,
    vin: typeof r.vin === 'string' ? r.vin : null,
    color: typeof r.color === 'string' ? r.color : null,
    fuel: typeof r.fuel === 'string' ? r.fuel : null,
    ownership_type: String(r.ownership_type ?? 'company_owned') as FleetosVehicleRecord['ownership_type'],
    is_active: r.is_active !== false,
    deactivated_at: typeof r.deactivated_at === 'string' ? r.deactivated_at : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  };
}

export async function listFleetVehicles(
  edgeJwt: string,
  tenantId: string,
  options?: { q?: string; status?: string; limit?: number; expiresAt?: string | null },
): Promise<FleetosVehicleRecord[]> {
  const url = getFleetosListVehiclesUrl();
  if (!url) throw new FleetosVehiclesError(0, 'not_configured', 'Vehicles API is not configured');

  const data = await postEdge<{ vehicles?: unknown[] }>(
    url,
    edgeJwt,
    {
      tenant_id: tenantId,
      limit: options?.limit ?? 100,
      ...(options?.q ? { q: options.q } : {}),
      ...(options?.status ? { status: options.status } : {}),
    },
    { expiresAt: options?.expiresAt },
  );

  const out: FleetosVehicleRecord[] = [];
  for (const row of data.vehicles ?? []) {
    const v = parseVehicle(row);
    if (v) out.push(v);
  }
  return out;
}

export async function createFleetVehicle(
  edgeJwt: string,
  tenantId: string,
  payload: Record<string, unknown>,
  options?: FleetosVehiclesEdgeOptions,
): Promise<FleetosVehicleRecord> {
  const url = edgeUrl(
    'fleetos-create-vehicle',
    import.meta.env.VITE_FLEETOS_CREATE_VEHICLE_URL as string | undefined,
  );
  if (!url) throw new FleetosVehiclesError(0, 'not_configured', 'Create vehicle API is not configured');

  const data = await postEdge<{ vehicle?: unknown }>(
    url,
    edgeJwt,
    { tenant_id: tenantId, ...payload },
    options,
  );
  const v = parseVehicle(data.vehicle);
  if (!v) throw new FleetosVehiclesError(500, 'invalid_response', 'Invalid vehicle response');
  return v;
}

export async function updateFleetVehicle(
  edgeJwt: string,
  tenantId: string,
  vehicleId: string,
  payload: Record<string, unknown>,
  options?: FleetosVehiclesEdgeOptions,
): Promise<FleetosVehicleRecord> {
  const url = edgeUrl(
    'fleetos-update-vehicle',
    import.meta.env.VITE_FLEETOS_UPDATE_VEHICLE_URL as string | undefined,
  );
  if (!url) throw new FleetosVehiclesError(0, 'not_configured', 'Update vehicle API is not configured');

  const data = await postEdge<{ vehicle?: unknown }>(
    url,
    edgeJwt,
    { tenant_id: tenantId, vehicle_id: vehicleId, ...payload },
    options,
  );
  const v = parseVehicle(data.vehicle);
  if (!v) throw new FleetosVehiclesError(500, 'invalid_response', 'Invalid vehicle response');
  return v;
}

export async function deactivateFleetVehicle(
  edgeJwt: string,
  tenantId: string,
  vehicleId: string,
  options?: FleetosVehiclesEdgeOptions,
): Promise<{ vehicle: FleetosVehicleRecord; idempotent: boolean }> {
  const url = edgeUrl(
    'fleetos-deactivate-vehicle',
    import.meta.env.VITE_FLEETOS_DEACTIVATE_VEHICLE_URL as string | undefined,
  );
  if (!url) {
    throw new FleetosVehiclesError(0, 'not_configured', 'Deactivate vehicle API is not configured');
  }

  const data = await postEdge<{ vehicle?: unknown; idempotent?: boolean }>(
    url,
    edgeJwt,
    { tenant_id: tenantId, vehicle_id: vehicleId },
    options,
  );
  const v = parseVehicle(data.vehicle);
  if (!v) throw new FleetosVehiclesError(500, 'invalid_response', 'Invalid vehicle response');
  return { vehicle: v, idempotent: data.idempotent === true };
}
