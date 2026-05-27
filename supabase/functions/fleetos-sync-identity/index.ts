/**
 * FleetOS Edge — operational identity sync (Phase 6).
 * Verifies `codevertex_edge_jwt` (RS256 + JWKS) and upserts profiles / tenant_users.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import {
  corsHeadersForRequest,
  verifyFleetosEdgeJwt,
  type FleetosEdgeClaims,
} from '../_shared/codevertex-edge-jwt.ts';

const ALLOWED_ROLES = new Set([
  'tenant_admin',
  'fleet_manager',
  'operations',
  'dispatcher',
  'finance',
  'driver',
  'owner',
  'viewer',
]);

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

function normalizeRole(role: string | undefined): string {
  const r = (role ?? 'viewer').trim().toLowerCase();
  return ALLOWED_ROLES.has(r) ? r : 'viewer';
}

function bearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization');
  const m = h?.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

async function resolveProfileId(
  admin: ReturnType<typeof createClient>,
  sub: string,
): Promise<{ profileId: string | null; error?: string }> {
  const { data: byCv, error: e1 } = await admin
    .from('profiles')
    .select('id')
    .eq('codevertex_user_id', sub)
    .maybeSingle();
  if (e1) return { profileId: null, error: e1.message };
  if (byCv?.id) return { profileId: byCv.id as string };

  const { data: byPk, error: e2 } = await admin.from('profiles').select('id').eq('id', sub).maybeSingle();
  if (e2) return { profileId: null, error: e2.message };
  if (byPk?.id) {
    const { error: e3 } = await admin.from('profiles').update({ codevertex_user_id: sub }).eq('id', sub);
    if (e3) return { profileId: null, error: e3.message };
    return { profileId: byPk.id as string };
  }

  const { data: inserted, error: e4 } = await admin
    .from('profiles')
    .insert({ codevertex_user_id: sub })
    .select('id')
    .single();
  if (e4) return { profileId: null, error: e4.message };
  return { profileId: inserted?.id as string };
}

async function fetchTenantsForUser(
  admin: ReturnType<typeof createClient>,
  sub: string,
  claims: FleetosEdgeClaims,
): Promise<Record<string, unknown>[]> {
  const { data: rows, error } = await admin
    .from('tenant_users')
    .select(
      `role, is_active, tenants ( id, slug, name, primary_color, logo_url, status )`,
    )
    .eq('codevertex_user_id', sub)
    .eq('is_active', true);

  if (error) throw new Error(error.message);

  const out: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  for (const row of rows ?? []) {
    const r = row as Record<string, unknown>;
    const t = r.tenants as Record<string, unknown> | null | undefined;
    if (!t || typeof t.id !== 'string' || t.status !== 'active') continue;
    if (seen.has(t.id as string)) continue;
    seen.add(t.id as string);
    out.push({
      id: t.id,
      slug: t.slug,
      name: t.name,
      role: r.role,
      accentColor: (t.primary_color as string) || '#00B39A',
      logoUrl: (t.logo_url as string) || '/logo.png',
      companyName: t.name,
    });
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
      out.push({
        id: trow.id,
        slug: trow.slug,
        name: trow.name,
        role: normalizeRole(claims.role),
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
    return json(401, { error: 'missing_bearer', message: 'Authorization: Bearer <codevertex_edge_jwt> required' }, cors);
  }

  let claims: FleetosEdgeClaims;
  try {
    claims = await verifyFleetosEdgeJwt(token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'verify_failed';
    return json(401, { error: 'invalid_token', message: msg }, cors);
  }

  if (claims.membership_status !== 'active') {
    return json(403, {
      error: 'membership_not_active',
      membership_status: claims.membership_status,
      message: 'Operational sync requires membership_status active',
    }, cors);
  }

  if (!claims.tenant_id) {
    return json(422, { error: 'missing_tenant_id', message: 'tenant_id claim required for sync' }, cors);
  }

  const url = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!url || !serviceKey) {
    return json(500, { error: 'server_misconfigured', message: 'Supabase service env missing' }, cors);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: tenantRow, error: tErr } = await admin
    .from('tenants')
    .select('id')
    .eq('id', claims.tenant_id)
    .eq('status', 'active')
    .maybeSingle();

  if (tErr) {
    return json(500, { error: 'database_error', message: tErr.message }, cors);
  }
  if (!tenantRow?.id) {
    return json(409, { error: 'tenant_not_found', message: 'tenant_id does not exist or is inactive' }, cors);
  }

  const { profileId, error: pErr } = await resolveProfileId(admin, claims.sub);
  if (pErr || !profileId) {
    return json(422, { error: 'profile_upsert_failed', message: pErr ?? 'unknown' }, cors);
  }

  const role = normalizeRole(claims.role);

  const { error: tuErr } = await admin.from('tenant_users').upsert(
    {
      tenant_id: claims.tenant_id,
      codevertex_user_id: claims.sub,
      profile_id: profileId,
      role,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,codevertex_user_id' },
  );

  if (tuErr) {
    return json(500, { error: 'database_error', message: tuErr.message }, cors);
  }

  let tenants: Record<string, unknown>[] = [];
  try {
    tenants = await fetchTenantsForUser(admin, claims.sub, claims);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'tenants_fetch_failed';
    return json(500, { error: 'database_error', message: msg }, cors);
  }

  return json(
    200,
    {
      ok: true,
      profile_id: profileId,
      codevertex_user_id: claims.sub,
      tenant_id: claims.tenant_id,
      membership_status: claims.membership_status,
      role,
      tenants,
    },
    cors,
  );
});
