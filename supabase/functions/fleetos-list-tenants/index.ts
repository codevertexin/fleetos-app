/**
 * FleetOS — Edge: list operational tenants for the authenticated CodeVertex user
 *
 * Must NOT accept arbitrary codevertex_user_id from the client once verification exists.
 * For now: returns 501 — TenantProvider stays on mock/fallback until this is implemented.
 */

const APP_CODE = 'FLEETOS';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-auth-core-access-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed', message: 'Use POST' });
  }

  let body: { app_code?: string };
  try {
    body = (await req.json()) as { app_code?: string };
  } catch {
    return json(400, { error: 'invalid_json', message: 'Body must be JSON' });
  }

  const appCode = typeof body.app_code === 'string' ? body.app_code.trim().toUpperCase() : '';
  if (appCode !== APP_CODE) {
    return json(400, { error: 'invalid_app_code', message: `app_code must be ${APP_CODE}` });
  }

  const authCoreAccess = req.headers.get('x-auth-core-access-token')?.trim();
  if (!authCoreAccess) {
    return json(401, {
      error: 'missing_auth_core_token',
      message: 'Send Auth Core access token in X-Auth-Core-Access-Token',
    });
  }

  void authCoreAccess;

  return json(501, {
    error: 'not_implemented',
    message:
      'Secure tenant listing requires verified Auth Core identity. Use mock tenant resolution in the app until this endpoint is implemented.',
  });
});
