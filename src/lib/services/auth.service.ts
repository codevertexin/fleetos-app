/**
 * Auth Service — CodeVertex Auth Core
 * URLs via platformLinks — mock API calls until Phase 2 SSO.
 */

import { APP_CODE, AUTH_BASE_URL, getLoginUrl, getRegisterUrl, getAccountUrl, getSecurityUrl } from '@/lib/platformLinks';
import type { FleetosRole } from '@/types/session';

export { AUTH_BASE_URL as AUTH_CORE_URL };
export { getLoginUrl, getRegisterUrl, getAccountUrl, getSecurityUrl };

export interface SsoProfile {
  id: string;
  email: string;
  display_name: string;
}

export interface SsoMembership {
  app_code: string;
  role: FleetosRole;
  tenant_id?: string;
}

export interface SsoConsumeResult {
  profile: SsoProfile;
  memberships: SsoMembership[];
  roles: FleetosRole[];
  token: string;
  expiresAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  avatar?: string;
  token?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

// TODO: Replace with real call → POST https://auth.codevertex.cc/api/login
export async function login(_payload: LoginPayload): Promise<AuthResponse> {
  await delay(400);
  return {
    user: {
      id: 'u1',
      name: 'Carlos Mendes',
      email: 'carlos@fleetos.app',
      role: 'fleet_admin',
      companyId: 'c1',
    },
    token: 'mock-jwt-token',
    expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
  };
}

// TODO: Replace → POST AUTH Core SSO ticket consume
export async function consumeSsoTicket(payload: {
  app_code: string;
  ticket: string;
}): Promise<SsoConsumeResult> {
  if (import.meta.env.PROD) {
    throw new Error(
      'Auth Core SSO is not configured for production builds. Wire the real consume endpoint before deploying.',
    );
  }

  await delay(400);
  void payload.ticket;
  return {
    profile: {
      id: 'cv-u1',
      email: 'carlos@fleetos.app',
      display_name: 'Carlos Mendes',
    },
    memberships: [
      { app_code: APP_CODE, role: 'tenant_admin', tenant_id: 't1' },
    ],
    roles: ['tenant_admin', 'fleet_manager'],
    token: `mock-sso-token-${Date.now()}`,
    expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
  };
}

// TODO: Replace with real call → POST https://auth.codevertex.cc/api/logout
export async function logout(): Promise<void> {
  await delay(200);
}

// TODO: Replace with real call → POST https://auth.codevertex.cc/api/forgot-password
export async function forgotPassword(_email: string): Promise<{ message: string }> {
  await delay(500);
  return { message: 'Reset email sent. Check your inbox.' };
}

// TODO: Replace with real call → POST https://auth.codevertex.cc/api/reset-password
export async function resetPassword(_token: string, _newPassword: string): Promise<void> {
  await delay(400);
}

// TODO: Replace with real call → GET https://auth.codevertex.cc/api/me
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = localStorage.getItem('fleetos-token');
  if (!token) return null;
  await delay(200);
  return {
    id: 'u1',
    name: 'Carlos Mendes',
    email: 'carlos@fleetos.app',
    role: 'fleet_admin',
    companyId: 'c1',
  };
}

// TODO: Replace with real call → PUT https://auth.codevertex.cc/api/me
export async function updateProfile(_data: Partial<AuthUser>): Promise<AuthUser> {
  await delay(400);
  return {
    id: 'u1',
    name: 'Carlos Mendes',
    email: 'carlos@fleetos.app',
    role: 'fleet_admin',
    companyId: 'c1',
  };
}

// TODO: Replace with real call → POST https://auth.codevertex.cc/api/change-password
export async function changePassword(_oldPassword: string, _newPassword: string): Promise<void> {
  await delay(400);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
