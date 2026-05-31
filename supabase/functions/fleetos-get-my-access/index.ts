/**
 * FleetOS Edge — resolve operational access state (P0.2A company onboarding).
 * Authorization: Bearer <codevertex_edge_jwt> (RS256 + JWKS); identity from JWT `sub` only.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import {
  corsHeadersForRequest,
  verifyFleetosEdgeJwt,
} from '../_shared/codevertex-edge-jwt.ts';
import {
  buildAccessResponse,
  loadMemberRowsForUser,
  resolveAccessFromMemberRows,
} from '../_shared/fleetos-access.ts';

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
      {
        error: 'missing_bearer',
        message: 'Authorization: Bearer <codevertex_edge_jwt> required',
      },
      cors,
    );
  }

  let claims;
  try {
    claims = await verifyFleetosEdgeJwt(token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'verify_failed';
    return json(401, { error: 'invalid_token', message: msg }, cors);
  }

  const url = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!url || !serviceKey) {
    return json(
      500,
      { error: 'server_misconfigured', message: 'Supabase service env missing' },
      cors,
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { rows, error: loadError } = await loadMemberRowsForUser(admin, claims.sub);
  if (loadError) {
    return json(500, { error: 'database_error', message: loadError }, cors);
  }

  const resolution = resolveAccessFromMemberRows(rows);
  const body = buildAccessResponse(claims.sub, claims.membership_status, resolution);

  return json(200, body, cors);
});
