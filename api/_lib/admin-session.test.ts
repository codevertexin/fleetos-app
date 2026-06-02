import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
} from './admin-session';

describe('admin session token', () => {
  beforeEach(() => {
    process.env.ADMIN_UI_SESSION_SIGNING_SECRET = 'test-signing-secret-32chars-min!!';
  });

  afterEach(() => {
    delete process.env.ADMIN_UI_SESSION_SIGNING_SECRET;
  });

  it('roundtrips a valid payload', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = createSessionToken({ exp, reviewer_label: 'ops@test' });
    expect(token).toBeTruthy();

    const parsed = verifySessionToken(token!);
    expect(parsed?.exp).toBe(exp);
    expect(parsed?.reviewer_label).toBe('ops@test');
  });

  it('rejects expired token', () => {
    const token = createSessionToken({ exp: Math.floor(Date.now() / 1000) - 10 });
    expect(verifySessionToken(token!)).toBeNull();
  });

  it('rejects tampered signature', () => {
    const token = createSessionToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
    const tampered = token!.replace(/.$/, 'x');
    expect(verifySessionToken(tampered)).toBeNull();
  });
});
