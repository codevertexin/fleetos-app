import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CodevertexEdgeJwtExpiredError,
  EDGE_JWT_EXPIRY_SKEW_SEC,
  resetCodevertexEdgeSessionExpiryGuardForTests,
} from './codevertex-edge-jwt';
import { postFleetosEdge } from './fleetos-edge-client';

function b64urlJson(value: unknown): string {
  const json = JSON.stringify(value);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jwtWithExp(exp: number): string {
  return `hdr.${b64urlJson({ exp, sub: '00000000-0000-4000-8000-000000000001' })}.sig`;
}

const redirectMock = vi.fn();
const clearMock = vi.fn();

vi.mock('@/lib/auth-redirect', () => ({
  redirectToAuthCoreLogin: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock('@/lib/session-storage', () => ({
  clearFleetosClientState: () => clearMock(),
}));

describe('postFleetosEdge', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    redirectMock.mockReset();
    clearMock.mockReset();
    resetCodevertexEdgeSessionExpiryGuardForTests();
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon');
    vi.stubGlobal('window', {
      location: { pathname: '/admin/vehicles', search: '', href: 'http://localhost/admin/vehicles' },
    });
  });

  afterEach(() => {
    resetCodevertexEdgeSessionExpiryGuardForTests();
    vi.unstubAllGlobals();
  });

  it('does not call fetch when JWT exp is inside skew window', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = jwtWithExp(now + 10);

    await expect(
      postFleetosEdge('https://example.com/fn', expired, {}, { redirectOnExpired: false }),
    ).rejects.toBeInstanceOf(CodevertexEdgeJwtExpiredError);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls fetch when JWT is valid beyond skew', async () => {
    const now = Math.floor(Date.now() / 1000);
    const valid = jwtWithExp(now + EDGE_JWT_EXPIRY_SKEW_SEC + 300);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await postFleetosEdge('https://example.com/fn', valid, {});

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${valid}`);
  });

  it('rejects via expiresAt fallback when JWT has no exp claim', async () => {
    const token = 'opaque-no-exp';
    const past = new Date(Date.now() - 120_000).toISOString();

    await expect(
      postFleetosEdge('https://example.com/fn', token, {}, {
        expiresAt: past,
        redirectOnExpired: false,
      }),
    ).rejects.toBeInstanceOf(CodevertexEdgeJwtExpiredError);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
