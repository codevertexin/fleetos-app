/**
 * Auth Core access token helpers.
 * Prefer JWT `sub` as canonical CodeVertex user id; never accept arbitrary client fields alone.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return UUID_RE.test(value.trim());
}

export function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(b64 + pad);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export class AuthCoreJwtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthCoreJwtError';
  }
}

/**
 * Resolves canonical CodeVertex user id from the SSO consume envelope.
 * - JWT: `sub` must match `consumeProfileId` when both are UUIDs.
 * - Dev mock / opaque tokens: only `consumeProfileId` is used in development.
 */
export function resolveVerifiedCodevertexUserId(args: {
  accessToken: string;
  consumeProfileId: string;
}): string {
  const { accessToken, consumeProfileId } = args;
  if (!isValidUuid(consumeProfileId)) {
    throw new AuthCoreJwtError('Invalid SSO profile id.');
  }

  const payload = parseJwtPayload(accessToken);
  const subRaw =
    payload && typeof payload.sub === 'string'
      ? payload.sub
      : payload && typeof payload.user_id === 'string'
        ? payload.user_id
        : null;

  if (subRaw && isValidUuid(subRaw)) {
    if (subRaw !== consumeProfileId) {
      throw new AuthCoreJwtError('JWT subject does not match SSO profile id.');
    }
    return subRaw;
  }

  if (import.meta.env.DEV && (accessToken.startsWith('mock-') || !payload)) {
    return consumeProfileId;
  }

  throw new AuthCoreJwtError('Missing JWT subject (sub). Configure opaque-token introspection in a later phase.');
}
