/**
 * FleetOS P1.1 — admin Edge authentication (shared secret).
 */

const ADMIN_SECRET_HEADER = 'x-fleetos-admin-secret';

export type AdminAuthResult =
  | { ok: true; reviewerSource: 'fleetos_admin_secret' }
  | { ok: false; error: 'admin_unauthorized'; message: string };

/** Constant-time string compare (UTF-8). */
export function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < ba.length; i++) {
    diff |= ba[i]! ^ bb[i]!;
  }
  return diff === 0;
}

export function readAdminSecretFromRequest(req: Request): string | null {
  return req.headers.get(ADMIN_SECRET_HEADER)?.trim() ?? null;
}

export function verifyAdminSecret(req: Request): AdminAuthResult {
  const configured = Deno.env.get('FLEETOS_ADMIN_SECRET')?.trim();
  if (!configured) {
    return {
      ok: false,
      error: 'admin_unauthorized',
      message: 'FLEETOS_ADMIN_SECRET is not configured on Edge',
    };
  }

  const provided = readAdminSecretFromRequest(req);
  if (!provided) {
    return {
      ok: false,
      error: 'admin_unauthorized',
      message: 'X-FleetOS-Admin-Secret header is required',
    };
  }

  if (!timingSafeEqualString(provided, configured)) {
    return {
      ok: false,
      error: 'admin_unauthorized',
      message: 'Invalid admin secret',
    };
  }

  return { ok: true, reviewerSource: 'fleetos_admin_secret' };
}
