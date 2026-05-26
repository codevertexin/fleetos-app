/**
 * Auth Service — CodeVertex Auth Core
 * URLs via platformLinks — mock API calls until Phase 2 SSO.
 */

import { AUTH_BASE_URL, getLoginUrl, getRegisterUrl, getAccountUrl, getSecurityUrl } from '@/lib/platformLinks';

export { AUTH_BASE_URL as AUTH_CORE_URL };
export { getLoginUrl, getRegisterUrl, getAccountUrl, getSecurityUrl };

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

// TODO: Replace with real call → POST https://auth.codevertex.cc/api/logout
export async function logout(): Promise<void> {
  await delay(200);
  localStorage.removeItem('fleetos-token');
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
