/**
 * Thin helpers for FleetOS operational Edge handlers.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import {
  corsHeadersForRequest,
  verifyFleetosEdgeJwt,
} from './codevertex-edge-jwt.ts';

export function json(
  status: number,
  body: Record<string, unknown>,
  cors: Record<string, string> | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(cors ?? {}) },
  });
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization');
  const m = h?.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

export function createServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function handleFleetosEdgePost(
  req: Request,
  handler: (
    admin: ReturnType<typeof createClient>,
    sub: string,
    body: unknown,
    cors: Record<string, string>,
  ) => Promise<Response>,
): Promise<Response> {
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

  const admin = createServiceClient();
  if (!admin) {
    return json(
      500,
      { error: 'server_misconfigured', message: 'Supabase service env missing' },
      cors,
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'validation_error', message: 'Invalid JSON body' }, cors);
  }

  return handler(admin, claims.sub, body, cors);
}
