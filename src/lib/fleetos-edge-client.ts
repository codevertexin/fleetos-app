/**
 * Shared FleetOS Edge HTTP client — validates `codevertex_edge_jwt` before every request.
 */

import {
  assertCodevertexEdgeJwtValid,
  CodevertexEdgeJwtExpiredError,
  EDGE_SESSION_EXPIRED_MESSAGE,
  handleCodevertexEdgeSessionExpired,
  isEdgeJwtUnauthorizedResponse,
} from '@/lib/codevertex-edge-jwt';

function anonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
}

export class FleetosEdgeRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'FleetosEdgeRequestError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

async function parseBody(res: Response): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await res.json();
    return data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export type PostFleetosEdgeOptions = {
  expiresAt?: string | null;
  /** When true (default), expired JWT redirects to Auth Core instead of only throwing. */
  redirectOnExpired?: boolean;
};

/**
 * POST to a FleetOS Edge function with Bearer `codevertex_edge_jwt`.
 * Never sends an expired JWT (60s skew). On session expiry, clears client state and re-SSO.
 */
export async function postFleetosEdge<T>(
  url: string,
  edgeJwt: string,
  body: Record<string, unknown>,
  options?: PostFleetosEdgeOptions,
): Promise<T> {
  const redirectOnExpired = options?.redirectOnExpired !== false;

  let token: string;
  try {
    token = assertCodevertexEdgeJwtValid(edgeJwt, options?.expiresAt);
  } catch (e) {
    if (e instanceof CodevertexEdgeJwtExpiredError && redirectOnExpired) {
      handleCodevertexEdgeSessionExpired();
    }
    throw e;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey(),
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await parseBody(res);
  if (!res.ok) {
    const code = typeof data.error === 'string' ? data.error : 'request_failed';
    const message =
      typeof data.message === 'string' ? data.message : `Request failed (${res.status})`;

    if (redirectOnExpired && isEdgeJwtUnauthorizedResponse(res.status, code, message)) {
      handleCodevertexEdgeSessionExpired();
    }

    throw new FleetosEdgeRequestError(res.status, code, message, data);
  }

  return data as T;
}

export { CodevertexEdgeJwtExpiredError, EDGE_SESSION_EXPIRED_MESSAGE };
