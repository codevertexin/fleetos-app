import { describe, expect, it } from 'vitest';
import {
  assertFleetosAuthEntryUrl,
  buildAuthCoreEntryUrl,
  getAccountUrl,
  getForgotPasswordUrl,
  getLoginUrl,
  getRegisterUrl,
  getSecurityUrl,
  type PlatformLinksConfig,
} from './platformLinks';

const TEST_CONFIG: PlatformLinksConfig = {
  appCode: 'FLEETOS',
  appBaseUrl: 'http://localhost:4200',
  authBaseUrl: 'https://auth.codevertex.cc',
};

describe('platformLinks auth entry URLs', () => {
  it('getLoginUrl uses /auth/login with SSO callback and return_to', () => {
    const url = buildAuthCoreEntryUrl('login', '/dashboard', TEST_CONFIG);
    expect(url).toMatch(/^https:\/\/auth\.codevertex\.cc\/auth\/login\?/);
    expect(url).toContain('app=FLEETOS');
    expect(url).toContain(
      `return_url=${encodeURIComponent('http://localhost:4200/sso/callback')}`,
    );
    expect(url).toContain(
      `return_to=${encodeURIComponent('http://localhost:4200/dashboard')}`,
    );
    expect(url).not.toContain('/account/profile');
    assertFleetosAuthEntryUrl(url, 'login');
  });

  it('getLoginUrl without destination defaults return_to to /dashboard', () => {
    const url = buildAuthCoreEntryUrl('login', undefined, TEST_CONFIG);
    expect(url).toContain(
      `return_to=${encodeURIComponent('http://localhost:4200/dashboard')}`,
    );
    assertFleetosAuthEntryUrl(url, 'login');
  });

  it('getRegisterUrl uses /auth/register', () => {
    const url = buildAuthCoreEntryUrl('register', '/bookings', TEST_CONFIG);
    expect(url).toContain('/auth/register?');
    assertFleetosAuthEntryUrl(url, 'register');
  });

  it('getForgotPasswordUrl uses /auth/forgot-password', () => {
    const url = buildAuthCoreEntryUrl('forgot-password', '/login', TEST_CONFIG);
    expect(url).toContain('/auth/forgot-password?');
    assertFleetosAuthEntryUrl(url, 'forgot-password');
  });

  it('rejects account/profile as auth entry', () => {
    const bad = `${TEST_CONFIG.authBaseUrl}/account/profile?app=FLEETOS&return_url=http://localhost:4200/sso/callback&return_to=http://localhost:4200/dashboard`;
    expect(() => assertFleetosAuthEntryUrl(bad, 'login')).toThrow(/Expected Auth Core path/);
  });

  it('runtime helpers do not point login at account routes', () => {
    expect(getLoginUrl('/dashboard')).toContain('/auth/login?');
    expect(getRegisterUrl('/dashboard')).toContain('/auth/register?');
    expect(getForgotPasswordUrl()).toContain('/auth/forgot-password?');
    expect(getAccountUrl('http://localhost:4200/settings')).toContain('/account/profile?');
    expect(getSecurityUrl('http://localhost:4200/settings')).toContain('/account/security?');
    expect(getLoginUrl()).not.toContain('/account/');
  });
});
