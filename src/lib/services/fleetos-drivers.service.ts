/**
 * FleetOS P2.2 — drivers Edge client.
 */

import {
  CodevertexEdgeJwtExpiredError,
  EDGE_SESSION_EXPIRED_MESSAGE,
} from '@/lib/codevertex-edge-jwt';
import { FleetosEdgeRequestError, postFleetosEdge } from '@/lib/fleetos-edge-client';
import type { FleetosDriverRecord } from '@/types/fleetos-driver';

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

export function getFleetosListDriversUrl(): string | null {
  return edgeUrl(
    'fleetos-list-drivers',
    import.meta.env.VITE_FLEETOS_LIST_DRIVERS_URL as string | undefined,
  );
}

export function isFleetosDriversConfigured(): boolean {
  return Boolean(getFleetosListDriversUrl() && anonKey());
}

export function shouldUseDriverMockData(): boolean {
  return import.meta.env.VITE_FLEETOS_USE_DRIVER_MOCK === 'true';
}

export class FleetosDriversError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'FleetosDriversError';
    this.status = status;
    this.code = code;
  }
}

function mapEdgeError(err: unknown): never {
  if (err instanceof CodevertexEdgeJwtExpiredError) {
    throw new FleetosDriversError(401, 'session_expired', EDGE_SESSION_EXPIRED_MESSAGE);
  }
  if (err instanceof FleetosEdgeRequestError) {
    throw new FleetosDriversError(err.status, err.code, err.message);
  }
  throw err;
}

export type FleetosDriversEdgeOptions = {
  expiresAt?: string | null;
};

async function postEdge<T>(
  url: string,
  edgeJwt: string,
  body: Record<string, unknown>,
  options?: FleetosDriversEdgeOptions,
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

function parseDriver(raw: unknown): FleetosDriverRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.full_name !== 'string') return null;
  return {
    id: r.id,
    tenant_id: String(r.tenant_id ?? ''),
    full_name: String(r.full_name),
    phone: typeof r.phone === 'string' ? r.phone : null,
    email: typeof r.email === 'string' ? r.email : null,
    license_no: typeof r.license_no === 'string' ? r.license_no : null,
    status: String(r.status ?? 'active') as FleetosDriverRecord['status'],
    availability:
      r.availability === 'available' || r.availability === 'busy' || r.availability === 'off'
        ? r.availability
        : null,
    license_expires_at: typeof r.license_expires_at === 'string' ? r.license_expires_at : null,
    tvde_cert_expires_at: typeof r.tvde_cert_expires_at === 'string' ? r.tvde_cert_expires_at : null,
    tax_id: typeof r.tax_id === 'string' ? r.tax_id : null,
    address: typeof r.address === 'string' ? r.address : null,
    is_active: r.is_active !== false,
    deactivated_at: typeof r.deactivated_at === 'string' ? r.deactivated_at : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  };
}

export async function listFleetDrivers(
  edgeJwt: string,
  tenantId: string,
  options?: { q?: string; status?: string; limit?: number; expiresAt?: string | null },
): Promise<FleetosDriverRecord[]> {
  const url = getFleetosListDriversUrl();
  if (!url) throw new FleetosDriversError(0, 'not_configured', 'Drivers API is not configured');

  const data = await postEdge<{ drivers?: unknown[] }>(
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

  const out: FleetosDriverRecord[] = [];
  for (const row of data.drivers ?? []) {
    const d = parseDriver(row);
    if (d) out.push(d);
  }
  return out;
}

export async function createFleetDriver(
  edgeJwt: string,
  tenantId: string,
  payload: Record<string, unknown>,
  options?: FleetosDriversEdgeOptions,
): Promise<FleetosDriverRecord> {
  const url = edgeUrl(
    'fleetos-create-driver',
    import.meta.env.VITE_FLEETOS_CREATE_DRIVER_URL as string | undefined,
  );
  if (!url) throw new FleetosDriversError(0, 'not_configured', 'Create driver API is not configured');

  const data = await postEdge<{ driver?: unknown }>(
    url,
    edgeJwt,
    { tenant_id: tenantId, ...payload },
    options,
  );
  const d = parseDriver(data.driver);
  if (!d) throw new FleetosDriversError(500, 'invalid_response', 'Invalid driver response');
  return d;
}

export async function updateFleetDriver(
  edgeJwt: string,
  tenantId: string,
  driverId: string,
  payload: Record<string, unknown>,
  options?: FleetosDriversEdgeOptions,
): Promise<FleetosDriverRecord> {
  const url = edgeUrl(
    'fleetos-update-driver',
    import.meta.env.VITE_FLEETOS_UPDATE_DRIVER_URL as string | undefined,
  );
  if (!url) throw new FleetosDriversError(0, 'not_configured', 'Update driver API is not configured');

  const data = await postEdge<{ driver?: unknown }>(
    url,
    edgeJwt,
    { tenant_id: tenantId, driver_id: driverId, ...payload },
    options,
  );
  const d = parseDriver(data.driver);
  if (!d) throw new FleetosDriversError(500, 'invalid_response', 'Invalid driver response');
  return d;
}

export async function deactivateFleetDriver(
  edgeJwt: string,
  tenantId: string,
  driverId: string,
  options?: FleetosDriversEdgeOptions,
): Promise<{ driver: FleetosDriverRecord; idempotent: boolean }> {
  const url = edgeUrl(
    'fleetos-deactivate-driver',
    import.meta.env.VITE_FLEETOS_DEACTIVATE_DRIVER_URL as string | undefined,
  );
  if (!url) {
    throw new FleetosDriversError(0, 'not_configured', 'Deactivate driver API is not configured');
  }

  const data = await postEdge<{ driver?: unknown; idempotent?: boolean }>(
    url,
    edgeJwt,
    { tenant_id: tenantId, driver_id: driverId },
    options,
  );
  const d = parseDriver(data.driver);
  if (!d) throw new FleetosDriversError(500, 'invalid_response', 'Invalid driver response');
  return { driver: d, idempotent: data.idempotent === true };
}
