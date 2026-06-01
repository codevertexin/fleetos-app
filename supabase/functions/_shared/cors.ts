/**
 * FleetOS Edge — explicit browser Origin allowlist (no wildcard).
 * Defaults cover production + local dev; extend via FLEETOS_ALLOWED_ORIGINS (comma-separated).
 */

/** Built-in origins — always allowed unless you rely solely on env (not recommended). */
export const FLEETOS_DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
  'https://fleetos.codevertex.cc',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
];

const CORS_ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type';
const CORS_ALLOW_METHODS = 'POST, OPTIONS';

/** Merges defaults with FLEETOS_ALLOWED_ORIGINS (deduped, order preserved). */
export function parseAllowedOrigins(): string[] {
  const fromEnv = Deno.env.get('FLEETOS_ALLOWED_ORIGINS')?.trim();
  const extra = fromEnv
    ? fromEnv.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const origin of [...FLEETOS_DEFAULT_ALLOWED_ORIGINS, ...extra]) {
    if (!seen.has(origin)) {
      seen.add(origin);
      out.push(origin);
    }
  }
  return out;
}

function buildCorsHeaders(allowOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    Vary: 'Origin',
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
  };
}

/** Returns CORS headers for this request, or null if Origin is not allowed. */
export function corsHeadersForRequest(req: Request): Record<string, string> | null {
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) {
    return null;
  }

  const origin = req.headers.get('Origin');

  if (origin && allowed.includes(origin)) {
    return buildCorsHeaders(origin);
  }

  // Some clients omit Origin on OPTIONS; reflect first allowed origin for preflight.
  if (!origin && req.method === 'OPTIONS') {
    return buildCorsHeaders(allowed[0]!);
  }

  return null;
}
