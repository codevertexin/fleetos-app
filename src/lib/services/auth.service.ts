/**

 * Auth Service — CodeVertex Auth Core

 * SSO consume + FleetOS membership gate (approval_required).

 */



import {

  APP_CODE,

  AUTH_BASE_URL,

  getAccountUrl,

  getLoginUrl,

  getRegisterUrl,

  getSecurityUrl,

} from '@/lib/platformLinks';

import { isValidUuid } from '@/lib/auth-core-jwt';

import type { FleetosMembershipStatus, FleetosRole } from '@/types/session';



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

  status: FleetosMembershipStatus;

  tenant_id?: string;

}



export interface SsoConsumeResult {

  profile: SsoProfile;

  memberships: SsoMembership[];

  roles: FleetosRole[];

  token: string;

  expiresAt: string;

  fleetosMembershipStatus: FleetosMembershipStatus;

  /** Phase 6 — RS256 Edge token from Auth Core (`consume-sso-ticket`); verified only on Supabase Edge. */
  codevertexEdgeJwt?: string;

  codevertexEdgeJwtExpiresAt?: string;

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



export class AuthCoreError extends Error {

  constructor(message: string) {

    super(message);

    this.name = 'AuthCoreError';

  }

}



const USER_SAFE_SSO_ERROR =

  'Unable to complete sign-in. Please return to the login page and try again.';



export function isSsoConsumeConfigured(): boolean {

  return Boolean((import.meta.env.VITE_AUTH_SSO_CONSUME_URL as string | undefined)?.trim());

}



function getSsoConsumeEndpoint(): string | null {

  const configured = import.meta.env.VITE_AUTH_SSO_CONSUME_URL as string | undefined;

  if (configured?.trim()) {

    return configured.trim();

  }

  return null;

}



function isFleetosRole(value: unknown): value is FleetosRole {

  return (

    typeof value === 'string' &&

    [

      'tenant_admin',

      'fleet_manager',

      'operations',

      'dispatcher',

      'finance',

      'driver',

      'owner',

      'viewer',

    ].includes(value)

  );

}



export function normalizeMembershipStatus(value: unknown): FleetosMembershipStatus {

  if (typeof value !== 'string') {

    return 'missing';

  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'active' || normalized === 'approved') {

    return 'active';

  }

  if (

    normalized === 'pending' ||

    normalized === 'approval_required' ||

    normalized === 'awaiting_approval' ||

    normalized === 'awaiting'

  ) {

    return 'pending';

  }

  if (normalized === 'suspended') {

    return 'suspended';

  }

  if (normalized === 'revoked' || normalized === 'inactive' || normalized === 'denied' || normalized === 'rejected') {

    return 'revoked';

  }

  if (normalized === 'none') {

    return 'none';

  }

  return 'missing';

}



export function findFleetosMembership(memberships: SsoMembership[]): SsoMembership | undefined {

  return memberships.find(m => m.app_code.toUpperCase() === APP_CODE.toUpperCase());

}



export function resolveFleetosMembershipStatus(memberships: SsoMembership[]): FleetosMembershipStatus {

  const fleetos = findFleetosMembership(memberships);

  if (!fleetos) {

    return 'missing';

  }

  return fleetos.status;

}



function parseMembershipRow(raw: Record<string, unknown>): SsoMembership {

  const appCode = String(raw.app_code ?? raw.appCode ?? APP_CODE);

  const status = normalizeMembershipStatus(

    raw.status ?? raw.membership_status ?? raw.membershipStatus ?? raw.state,

  );

  return {

    app_code: appCode,

    role: isFleetosRole(raw.role) ? raw.role : 'viewer',

    status,

    tenant_id:

      typeof raw.tenant_id === 'string'

        ? raw.tenant_id

        : typeof raw.tenantId === 'string'

          ? raw.tenantId

          : undefined,

  };

}



function parseSsoConsumeResponse(data: unknown): SsoConsumeResult {

  if (!data || typeof data !== 'object') {

    throw new AuthCoreError(USER_SAFE_SSO_ERROR);

  }



  const body = data as Record<string, unknown>;

  const profileRaw = (body.profile ?? body.user) as Record<string, unknown> | undefined;

  if (!profileRaw || typeof profileRaw.id !== 'string') {

    throw new AuthCoreError(USER_SAFE_SSO_ERROR);

  }



  const membershipsRaw = Array.isArray(body.memberships) ? body.memberships : [];

  const memberships: SsoMembership[] = membershipsRaw

    .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object')

    .map(m => parseMembershipRow(m));



  const fleetosFromBody = body.membership ?? body.fleetos_membership;

  if (fleetosFromBody && typeof fleetosFromBody === 'object') {

    const parsed = parseMembershipRow(fleetosFromBody as Record<string, unknown>);

    if (!findFleetosMembership(memberships)) {

      memberships.push({ ...parsed, app_code: APP_CODE });

    }

  }



  const fleetosMembership = findFleetosMembership(memberships);

  const fleetosMembershipStatus = fleetosMembership?.status ?? 'missing';



  const rolesRaw = Array.isArray(body.roles) ? body.roles : [];

  let roles = rolesRaw.filter(isFleetosRole);

  if (roles.length === 0 && fleetosMembership) {

    roles = [fleetosMembership.role];

  }

  if (roles.length === 0 && memberships.length > 0) {

    roles = [memberships[0]!.role];

  }

  if (roles.length === 0) {

    roles = ['viewer'];

  }



  const token =

    typeof body.token === 'string'

      ? body.token

      : typeof body.access_token === 'string'

        ? body.access_token

        : '';

  if (!token) {

    throw new AuthCoreError(USER_SAFE_SSO_ERROR);

  }



  const expiresAt =

    typeof body.expiresAt === 'string'

      ? body.expiresAt

      : typeof body.expires_at === 'string'

        ? body.expires_at

        : new Date(Date.now() + 86400 * 1000).toISOString();



  return {

    profile: {

      id: profileRaw.id,

      email: typeof profileRaw.email === 'string' ? profileRaw.email : '',

      display_name:

        typeof profileRaw.display_name === 'string'

          ? profileRaw.display_name

          : typeof profileRaw.name === 'string'

            ? profileRaw.name

            : 'FleetOS User',

    },

    memberships,

    roles,

    token,

    expiresAt,

    fleetosMembershipStatus,

    codevertexEdgeJwt:

      typeof body.codevertex_edge_jwt === 'string' && body.codevertex_edge_jwt.trim()

        ? body.codevertex_edge_jwt.trim()

        : undefined,

    codevertexEdgeJwtExpiresAt:

      typeof body.codevertex_edge_jwt_expires_at === 'string' && body.codevertex_edge_jwt_expires_at.trim()

        ? body.codevertex_edge_jwt_expires_at.trim()

        : undefined,

  };

}



/**

 * Auth Core SSO ticket consumption (production / configured environments).

 */

export async function consumeSsoTicketReal(payload: {

  app_code: string;

  ticket: string;

}): Promise<SsoConsumeResult> {

  const endpoint = getSsoConsumeEndpoint();

  if (!endpoint) {

    throw new AuthCoreError(USER_SAFE_SSO_ERROR);

  }



  if (!payload.ticket?.trim()) {

    throw new AuthCoreError(USER_SAFE_SSO_ERROR);

  }



  try {

    const response = await fetch(endpoint, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },

      body: JSON.stringify({

        app_code: payload.app_code,

        ticket: payload.ticket,

      }),

    });



    if (!response.ok) {

      throw new AuthCoreError(USER_SAFE_SSO_ERROR);

    }



    const data: unknown = await response.json();

    return parseSsoConsumeResponse(data);

  } catch (error) {

    if (error instanceof AuthCoreError) {

      throw error;

    }

    throw new AuthCoreError(USER_SAFE_SSO_ERROR);

  }

}



/**

 * Development mock when VITE_AUTH_SSO_CONSUME_URL is not set.

 * Ticket prefix `pending-`, `suspended-`, `revoked-` simulates membership states.

 */

export async function consumeSsoTicketDevMock(payload: {

  app_code: string;

  ticket: string;

}): Promise<SsoConsumeResult> {

  if (import.meta.env.PROD) {

    throw new AuthCoreError('Development sign-in is not available in production.');

  }



  await delay(400);



  let status: FleetosMembershipStatus = 'active';

  const ticket = payload.ticket ?? '';

  if (ticket.startsWith('pending-')) {

    status = 'pending';

  } else if (ticket.startsWith('suspended-')) {

    status = 'suspended';

  } else if (ticket.startsWith('revoked-')) {

    status = 'revoked';

  } else if (ticket.startsWith('missing-')) {

    status = 'missing';

  }



  const devMockTenantRaw = (import.meta.env.VITE_FLEETOS_DEV_MOCK_TENANT_ID as string | undefined)?.trim();

  const mockTenantId = isValidUuid(devMockTenantRaw) ? devMockTenantRaw! : 't1';



  const memberships: SsoMembership[] =

    status === 'missing'

      ? []

      : [

          {

            app_code: APP_CODE,

            role: 'tenant_admin',

            status,

            tenant_id: mockTenantId,

          },

        ];



  return {

    profile: {

      id: 'a0000000-0000-4000-8000-0000000000c1',

      email: 'carlos@fleetos.app',

      display_name: 'Carlos Mendes',

    },

    memberships,

    roles: status === 'active' ? ['tenant_admin', 'fleet_manager'] : ['viewer'],

    token: `mock-sso-token-${Date.now()}`,

    expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),

    fleetosMembershipStatus: status === 'missing' ? 'missing' : status,

  };

}



/** Real Auth Core when configured; dev mock only in DEV without URL. */

export async function consumeSsoTicket(payload: {

  app_code: string;

  ticket: string;

}): Promise<SsoConsumeResult> {

  if (isSsoConsumeConfigured()) {

    return consumeSsoTicketReal(payload);

  }

  if (import.meta.env.DEV) {

    return consumeSsoTicketDevMock(payload);

  }

  throw new AuthCoreError(USER_SAFE_SSO_ERROR);

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



export async function logout(): Promise<void> {

  await delay(100);

}



export async function forgotPassword(_email: string): Promise<{ message: string }> {

  await delay(500);

  return { message: 'Reset email sent. Check your inbox.' };

}



export async function resetPassword(_token: string, _newPassword: string): Promise<void> {

  await delay(400);

}



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



export async function changePassword(_oldPassword: string, _newPassword: string): Promise<void> {

  await delay(400);

}



function delay(ms: number) {

  return new Promise(resolve => setTimeout(resolve, ms));

}


