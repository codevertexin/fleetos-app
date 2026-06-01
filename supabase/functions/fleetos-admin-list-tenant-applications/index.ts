/**
 * FleetOS P1.1 — admin list pending company applications.
 * Auth: X-FleetOS-Admin-Secret (FLEETOS_ADMIN_SECRET).
 */

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { verifyAdminSecret } from '../_shared/fleetos-admin-auth.ts';
import {
  listTenantApplications,
  parseListApplicationsBody,
} from '../_shared/fleetos-admin-applications.ts';
import { corsHeadersForRequest } from '../_shared/codevertex-edge-jwt.ts';

function json(
  status: number,
  body: Record<string, unknown>,
  cors: Record<string, string> | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(cors ?? {}) },
  });
}

function createServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

  const auth = verifyAdminSecret(req);
  if (!auth.ok) {
    return json(401, { error: auth.error, message: auth.message }, cors);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'validation_error', message: 'Invalid JSON body' }, cors);
  }

  const parsed = parseListApplicationsBody(body);
  if (!parsed.ok) {
    return json(400, { error: 'validation_error', message: parsed.message }, cors);
  }

  const admin = createServiceClient();
  if (!admin) {
    return json(
      500,
      { error: 'server_misconfigured', message: 'Supabase service env missing' },
      cors,
    );
  }

  const result = await listTenantApplications(admin, parsed.params);
  if (!result.ok) {
    return json(500, { error: 'database_error', message: result.message }, cors);
  }

  return json(200, { ok: true, ...result.data }, cors);
});
