/**
 * FleetOS Edge — submit company onboarding application (P0.2B).
 * Authorization: Bearer <codevertex_edge_jwt> (RS256 + JWKS); identity from JWT `sub` only.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import {
  corsHeadersForRequest,
  verifyFleetosEdgeJwt,
} from '../_shared/codevertex-edge-jwt.ts';
import {
  buildSubmitSuccessBody,
  evaluateSubmitConflicts,
  findIdempotentPendingApplication,
  idempotentToSuccessPayload,
  isSlugTakenByOther,
  submitCompanyApplication,
  SUBMIT_CONFLICT_MEMBER_SELECT,
  validateCompanyPayload,
} from '../_shared/fleetos-submit-company.ts';

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(
      400,
      {
        error: 'validation_error',
        message: 'Invalid JSON body',
        fields: { body: 'must be valid JSON' },
      },
      cors,
    );
  }

  const validated = validateCompanyPayload(body);
  if (!validated.ok) {
    return json(
      400,
      {
        error: 'validation_error',
        message: 'Invalid company payload',
        fields: validated.fields,
      },
      cors,
    );
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

  const company = validated.company;

  const idempotent = await findIdempotentPendingApplication(admin, claims.sub, company.slug);
  if (idempotent) {
    const successBody = buildSubmitSuccessBody(idempotentToSuccessPayload(idempotent));
    return json(200, successBody, cors);
  }

  try {
    const slugTaken = await isSlugTakenByOther(admin, company.slug);
    if (slugTaken) {
      return json(
        409,
        { error: 'slug_taken', message: 'Slug is already in use' },
        cors,
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'slug_check_failed';
    return json(500, { error: 'database_error', message: msg }, cors);
  }

  const { data: memberRows, error: membersErr } = await admin
    .from('tenant_members')
    .select(SUBMIT_CONFLICT_MEMBER_SELECT)
    .eq('codevertex_user_id', claims.sub)
    .neq('status', 'removed');

  if (membersErr) {
    return json(500, { error: 'database_error', message: membersErr.message }, cors);
  }

  const conflictRows = (memberRows ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const t = r.tenants as Record<string, unknown> | null | undefined;
    return {
      id: String(r.id),
      role: String(r.role ?? ''),
      status: String(r.status ?? ''),
      tenants: t && typeof t.id === 'string'
        ? { id: t.id, status: String(t.status ?? '') }
        : null,
    };
  });

  const conflict = evaluateSubmitConflicts(conflictRows);
  if (conflict) {
    if (conflict.kind === 'already_has_active_membership') {
      return json(
        409,
        {
          error: 'already_has_active_membership',
          message: 'User already has an active operational membership',
        },
        cors,
      );
    }
    return json(
      409,
      {
        error: 'pending_application_exists',
        message: 'A company application is already pending review',
        tenant_id: conflict.tenant_id,
      },
      cors,
    );
  }

  const result = await submitCompanyApplication(admin, claims.sub, company);
  if (!result.ok) {
    const status = result.error === 'database_error' ? 500 : 409;
    const body: Record<string, unknown> = {
      error: result.error,
      message: result.message ?? result.error,
    };
    if (result.tenant_id) body.tenant_id = result.tenant_id;
    return json(status, body, cors);
  }

  const successBody = buildSubmitSuccessBody(result.payload);
  return json(201, successBody, cors);
});
