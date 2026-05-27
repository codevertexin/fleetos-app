/**
 * FleetOS — Edge: operational identity sync (Phase 5b secure path)
 *
 * Invoked by the FleetOS SPA after Auth Core SSO consume (active membership).
 * - Never trust browser-supplied codevertex_user_id or tenant_id.
 * - Auth Core verification (JWKS / introspection / signed assertion) is NOT
 *   wired yet — this handler returns 501 until the contract is final.
 * - When implemented: verify token → derive ids → createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
 *   server-side only (never expose service_role to the client).
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

  // Auth Core bearer: prefer dedicated header so Supabase gateway Authorization
  // can remain the anon key if needed.
  const authCoreAccess = req.headers.get('x-auth-core-access-token')?.trim();
  if (!authCoreAccess) {
    return json(401, {
      error: 'missing_auth_core_token',
      message: 'Send Auth Core access token in X-Auth-Core-Access-Token',
    });
  }

  // TODO Phase 6: verify JWT signature (JWKS) or introspect with Auth Core;
  // derive codevertex_user_id + tenant_id + membership active from trusted response only.
  // const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // await supabase.from('profiles').upsert(...)

  void authCoreAccess;

  return json(501, {
    error: 'not_implemented',
    message:
      'Auth Core verification contract not finalized. No database writes performed. Deploy after JWKS/introspection is agreed with Auth Core.',
  });
});
