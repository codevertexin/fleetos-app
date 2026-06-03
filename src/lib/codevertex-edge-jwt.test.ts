import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CodevertexEdgeJwtExpiredError,
  EDGE_JWT_EXPIRY_SKEW_SEC,
  getCodevertexEdgeJwtExpUnix,
  handleCodevertexEdgeSessionExpired,
  isCodevertexEdgeJwtValid,
  resetCodevertexEdgeSessionExpiryGuardForTests,
} from './codevertex-edge-jwt';

const redirectMock = vi.fn();
const clearMock = vi.fn();

vi.mock('@/lib/auth-redirect', () => ({
  redirectToAuthCoreLogin: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock('@/lib/session-storage', () => ({
  clearFleetosClientState: () => clearMock(),
}));

function b64urlJson(value: unknown): string {
  const json = JSON.stringify(value);
  const b64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}

function jwtWithExp(exp: number): string {
  return `hdr.${b64urlJson({ exp, sub: '00000000-0000-4000-8000-000000000001' })}.sig`;
}

beforeEach(() => {
  redirectMock.mockReset();
  clearMock.mockReset();
  resetCodevertexEdgeSessionExpiryGuardForTests();
  vi.stubGlobal('window', {
    location: { pathname: '/admin/vehicles', search: '?x=1' },
  });
});

afterEach(() => {
  resetCodevertexEdgeSessionExpiryGuardForTests();
});

describe('handleCodevertexEdgeSessionExpired', () => {
  it('clears state and redirects only once from operational routes', () => {
    expect(() => handleCodevertexEdgeSessionExpired()).toThrow(CodevertexEdgeJwtExpiredError);
    expect(() => handleCodevertexEdgeSessionExpired()).toThrow(CodevertexEdgeJwtExpiredError);

    expect(clearMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith({
      pathname: '/admin/vehicles',
      search: '?x=1',
      state: null,
    });
  });

  it('does not redirect when already on auth entry path', () => {
    vi.stubGlobal('window', {
      location: { pathname: '/sso/callback', search: '?ticket=abc' },
    });

    expect(() => handleCodevertexEdgeSessionExpired()).toThrow(CodevertexEdgeJwtExpiredError);
    expect(clearMock).toHaveBeenCalledOnce();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe('isCodevertexEdgeJwtValid', () => {
  it('rejects missing token', () => {
    expect(isCodevertexEdgeJwtValid(null)).toBe(false);
  });

  it('rejects token expiring within skew window', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = jwtWithExp(now + 30);
    expect(isCodevertexEdgeJwtValid(token)).toBe(false);
  });

  it('accepts token expiring beyond skew window', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = jwtWithExp(now + EDGE_JWT_EXPIRY_SKEW_SEC + 120);
    expect(isCodevertexEdgeJwtValid(token)).toBe(true);
  });

  it('falls back to expiresAt ISO when JWT has no exp', () => {
    const token = 'opaque.dev-token';
    const future = new Date(Date.now() + 5 * 60_000).toISOString();
    expect(isCodevertexEdgeJwtValid(token, future)).toBe(true);
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isCodevertexEdgeJwtValid(token, past)).toBe(false);
  });

  it('parses exp from JWT payload', () => {
    const exp = 1_900_000_000;
    const token = jwtWithExp(exp);
    expect(getCodevertexEdgeJwtExpUnix(token)).toBe(exp);
  });
});
