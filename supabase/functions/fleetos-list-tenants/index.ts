/**
 * FleetOS Edge — list operational tenants for verified CodeVertex user (Phase 6 + 2B).
 * Authorization: Bearer <codevertex_edge_jwt> (RS256 + JWKS); identity from JWT `sub` only.
 * Reads active rows from public.tenant_members.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import {
  corsHeadersForRequest,
  verifyFleetosEdgeJwt,
  type FleetosEdgeClaims,
} from '../_shared/codevertex-edge-jwt.ts';
import {
  memberRowToTenantPayload,
  resolveCanonicalRole,
  roleForApiResponse,
  TENANT_MEMBER_SELECT,
} from '../_shared/fleetos-membership.ts';

function json(
  status: number,
  body: Record<string, unknown>,
  cors: Record<string, string> | null,
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(cors ?? {}),
  };
  return new Response(JSON.stringify(body), { status, headers });
}

function bearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization');
  const m = h?.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

async function listTenantsForUser(
  admin: ReturnType<typeof createClient>,
  sub: string,
  claims: FleetosEdgeClaims,
): Promise<Record<string, unknown>[]> {
  const { data: rows, error } = await admin
    .from('tenant_members')
    .select(TENANT_MEMBER_SELECT)
    .eq('codevertex_user_id', sub)
    .eq('status', 'active');

  if (error) throw new Error(error.message);

  const out: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  for (const row of rows ?? []) {
    const r = row as Record<string, unknown>;
    const payload = memberRowToTenantPayload(r);
    if (!payload || seen.has(payload.id as string)) continue;
    seen.add(payload.id as string);
    out.push(payload);
  }

  if (
    claims.membership_status === 'active' &&
    claims.tenant_id &&
    !seen.has(claims.tenant_id)
  ) {
    const { data: trow, error: te } = await admin
      .from('tenants')
      .select('id, slug, name, primary_color, logo_url, status')
      .eq('id', claims.tenant_id)
      .eq('status', 'active')
      .maybeSingle();
    if (!te && trow?.id) {
      const resolved = await resolveCanonicalRole(admin, claims.role);
      out.push({
        id: trow.id,
        slug: trow.slug,
        name: trow.name,
        role: roleForApiResponse({
          role: resolved.canonicalRole,
          legacy_role: resolved.legacyRole,
        }),
        accentColor: trow.primary_color || '#00B39A',
        logoUrl: trow.logo_url || '/logo.png',
        companyName: trow.name,
      });
    }
  }

  return out;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeadersForRequest(req);
  if (!cors) {
    return new Response(JSON.stringify({ error: 'cors_origin_not_allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed', message: 'Use POST' }, cors);
  }

  const token = bearerToken(req);
  if (!token) {
    return json(
      401,
      { error: 'missing_bearer', message: 'Authorization: Bearer <codevertex_edge_jwt> required' },
      cors,
    );
  }

  let claims: FleetosEdgeClaims;
  try {
    claims = await verifyFleetosEdgeJwt(token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'verify_failed';
    return json(401, { error: 'invalid_token', message: msg }, cors);
  }

  const url = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!url || !serviceKey) {
    return json(500, { error: 'server_misconfigured', message: 'Supabase service env missing' }, cors);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let tenants: Record<string, unknown>[] = [];
  try {
    tenants = await listTenantsForUser(admin, claims.sub, claims);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'tenants_fetch_failed';
    return json(500, { error: 'database_error', message: msg }, cors);
  }

  return json(200, { ok: true, codevertex_user_id: claims.sub, membership_status: claims.membership_status, tenants }, cors);
});
