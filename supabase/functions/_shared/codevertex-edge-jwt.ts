/**
 * CodeVertex `fleetos_edge_verify` JWT verification (RS256 + JWKS).
 * Used by FleetOS Edge Functions only — never import from Vite `src/`.
 */

import * as jose from 'npm:jose@5.9.6';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface FleetosEdgeClaims {
  sub: string;
  app_code: string;
  ecosystem_code: string;
  token_use: string;
  membership_status: string;
  tenant_id: string | null;
  role?: string;
  jti: string;
}

let jwksCache: { uri: string; resolver: jose.JWTVerifyGetKey } | null = null;

function getRemoteJwkSet(): jose.JWTVerifyGetKey {
  const uri = Deno.env.get('CODEVERTEX_JWKS_URI')?.trim();
  if (!uri) {
    throw new Error('CODEVERTEX_JWKS_URI is not configured');
  }
  if (!jwksCache || jwksCache.uri !== uri) {
    jwksCache = { uri, resolver: jose.createRemoteJWKSet(new URL(uri)) };
  }
  return jwksCache.resolver;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * Verifies RS256 JWT from Auth Core `consume-sso-ticket` (`codevertex_edge_jwt`).
 * Throws on any validation failure (caller maps to HTTP 401/403).
 */
export async function verifyFleetosEdgeJwt(token: string): Promise<FleetosEdgeClaims> {
  const issuer = Deno.env.get('CODEVERTEX_JWT_ISSUER')?.trim();
  const audience = Deno.env.get('CODEVERTEX_JWT_AUDIENCE')?.trim();
  if (!issuer || !audience) {
    throw new Error('CODEVERTEX_JWT_ISSUER or CODEVERTEX_JWT_AUDIENCE is not configured');
  }

  const { protectedHeader, payload } = await jose.jwtVerify(token, getRemoteJwkSet(), {
    issuer,
    audience,
    algorithms: ['RS256'],
  });

  if (protectedHeader.alg !== 'RS256') {
    throw new Error(`unexpected alg: ${protectedHeader.alg ?? 'missing'}`);
  }

  const sub = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  if (!isUuid(sub)) {
    throw new Error('invalid sub (must be UUID)');
  }

  const appCode = String(payload.app_code ?? '').trim().toUpperCase();
  if (appCode !== 'FLEETOS') {
    throw new Error('invalid app_code');
  }

  const ecosystem = String(payload.ecosystem_code ?? '').trim().toLowerCase();
  if (ecosystem !== 'codevertex') {
    throw new Error('invalid ecosystem_code');
  }

  const tokenUse = String(payload.token_use ?? '').trim();
  if (tokenUse !== 'fleetos_edge_verify') {
    throw new Error('invalid token_use');
  }

  const jti = payload.jti;
  if (typeof jti !== 'string' || !jti.trim()) {
    throw new Error('missing jti');
  }

  const membership_status = String(payload.membership_status ?? '').trim().toLowerCase();
  const tenantRaw = payload.tenant_id;
  const tenant_id =
    tenantRaw === null || tenantRaw === undefined
      ? null
      : typeof tenantRaw === 'string'
        ? tenantRaw.trim()
        : String(tenantRaw).trim();

  if (tenant_id !== null && tenant_id !== '' && !isUuid(tenant_id)) {
    throw new Error('invalid tenant_id claim');
  }

  return {
    sub,
    app_code: appCode,
    ecosystem_code: ecosystem,
    token_use: tokenUse,
    membership_status,
    tenant_id: tenant_id === '' ? null : tenant_id,
    role: typeof payload.role === 'string' ? payload.role : undefined,
    jti: jti.trim(),
  };
}

export function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get('FLEETOS_ALLOWED_ORIGINS')?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/** Returns CORS headers for this request, or null if Origin is not allowed. */
export function corsHeadersForRequest(req: Request): Record<string, string> | null {
  const allowed = parseAllowedOrigins();
  const origin = req.headers.get('Origin');

  if (allowed.length === 0) {
    return null;
  }

  if (origin && allowed.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
  }

  if (!origin && req.method === 'OPTIONS') {
    return {
      'Access-Control-Allow-Origin': allowed[0]!,
      Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
  }

  return null;
}
