/**
 * FleetOS Phase 6 — operational identity via Supabase Edge (RS256 + JWKS).
 *
 * Does NOT send `codevertex_user_id` or `tenant_id` in the body; Edge trusts only
 * the verified `codevertex_edge_jwt` bearer.
 */

import type { SsoConsumeResult } from '@/lib/services/auth.service';
import type { FleetosRole, FleetosTenant } from '@/types/session';

export interface OperationalIdentitySyncMeta {
  operationalPrimaryTenantId: string | null;
  operationalProfileId: string | null;
}

const FLEETOS_ROLES: FleetosRole[] = [
  'tenant_admin',
  'fleet_manager',
  'operations',
  'dispatcher',
  'finance',
  'driver',
  'owner',
  'viewer',
];

function isFleetosRole(value: unknown): value is FleetosRole {
  return typeof value === 'string' && FLEETOS_ROLES.includes(value as FleetosRole);
}

/** Optional full URL; otherwise derived from VITE_SUPABASE_URL. */
export function getFleetosSyncIdentityUrl(): string | null {
  const explicit = (import.meta.env.VITE_FLEETOS_SYNC_IDENTITY_URL as string | undefined)?.trim();
  if (explicit) return explicit;
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/functions/v1/fleetos-sync-identity`;
}

/** Optional full URL; otherwise derived from VITE_SUPABASE_URL. */
export function getFleetosListTenantsUrl(): string | null {
  const explicit = (import.meta.env.VITE_FLEETOS_LIST_TENANTS_URL as string | undefined)?.trim();
  if (explicit) return explicit;
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/functions/v1/fleetos-list-tenants`;
}

function anonKey(): string | null {
  const k = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  return k || null;
}

function isEdgeFunctionsConfigured(): boolean {
  return Boolean(getFleetosSyncIdentityUrl() && anonKey());
}

function isListTenantsConfigured(): boolean {
  return Boolean(getFleetosListTenantsUrl() && anonKey());
}

interface EdgeTenantRow {
  id: string;
  slug: string;
  name: string;
  role?: string;
  accentColor?: string;
  logoUrl?: string;
  companyName?: string;
}

function parseEdgeTenantRows(data: unknown): EdgeTenantRow[] {
  if (!data || typeof data !== 'object') return [];
  const tenants = (data as Record<string, unknown>).tenants;
  if (!Array.isArray(tenants)) return [];
  const out: EdgeTenantRow[] = [];
  for (const row of tenants) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.slug !== 'string' || typeof r.name !== 'string') continue;
    out.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      role: typeof r.role === 'string' ? r.role : undefined,
      accentColor: typeof r.accentColor === 'string' ? r.accentColor : undefined,
      logoUrl: typeof r.logoUrl === 'string' ? r.logoUrl : undefined,
      companyName: typeof r.companyName === 'string' ? r.companyName : undefined,
    });
  }
  return out;
}

export function mapEdgeTenantRowToFleetosTenant(row: EdgeTenantRow): FleetosTenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    membershipRole: isFleetosRole(row.role) ? row.role : undefined,
    branding: {
      accentColor: row.accentColor ?? '#00B39A',
      logoUrl: row.logoUrl ?? '/logo.png',
      companyName: row.companyName ?? row.name,
    },
  };
}

/**
 * POST `fleetos-sync-identity` with `Authorization: Bearer <codevertex_edge_jwt>` and `apikey: anon`.
 */
export async function syncOperationalIdentityAfterSso(
  result: SsoConsumeResult,
): Promise<OperationalIdentitySyncMeta | null> {
  if (!isEdgeFunctionsConfigured()) {
    return null;
  }

  const edgeJwt = result.codevertexEdgeJwt?.trim();
  if (!edgeJwt) {
    return null;
  }

  if (result.fleetosMembershipStatus !== 'active') {
    return null;
  }

  const url = getFleetosSyncIdentityUrl()!;
  const anon = anonKey()!;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${edgeJwt}`,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[fleetos] fleetos-sync-identity failed', res.status, text);
      return null;
    }

    const data: unknown = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') return null;
    const body = data as Record<string, unknown>;
    if (body.ok !== true) return null;

    const profileId = typeof body.profile_id === 'string' ? body.profile_id : null;
    const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id : null;

    return {
      operationalProfileId: profileId,
      operationalPrimaryTenantId: tenantId,
    };
  } catch (e) {
    console.warn('[fleetos] fleetos-sync-identity request error', e);
    return null;
  }
}

/** True when Edge JWT is present and not past `codevertexEdgeJwtExpiresAt` (if provided). */
export function isCodevertexEdgeJwtValid(
  jwt: string | null | undefined,
  expiresAt: string | null | undefined,
): boolean {
  const t = jwt?.trim();
  if (!t) return false;
  if (!expiresAt?.trim()) return true;
  return new Date(expiresAt) > new Date();
}

/**
 * POST `fleetos-list-tenants` with `Authorization: Bearer <codevertex_edge_jwt>`.
 */
export async function fetchOperationalTenantsFromEdge(
  codevertexEdgeJwt: string,
): Promise<FleetosTenant[]> {
  if (!isListTenantsConfigured()) {
    return [];
  }

  const url = getFleetosListTenantsUrl()!;
  const anon = anonKey()!;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${codevertexEdgeJwt.trim()}`,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn('[fleetos] fleetos-list-tenants failed', res.status, text);
    return [];
  }

  const data: unknown = await res.json().catch(() => null);
  return parseEdgeTenantRows(data).map(mapEdgeTenantRowToFleetosTenant);
}
