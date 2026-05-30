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

import { isValidUuid, parseJwtPayload } from '@/lib/auth-core-jwt';

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

  const roleCandidate = raw.role ?? raw.fleetos_role ?? raw.membership_role;

  return {

    app_code: appCode,

    role: isFleetosRole(roleCandidate) ? roleCandidate : 'viewer',

    status,

    tenant_id:

      typeof raw.tenant_id === 'string'

        ? raw.tenant_id

        : typeof raw.tenantId === 'string'

          ? raw.tenantId

          : undefined,

  };

}



function devLogSsoParse(
  contract: 'fleetos-flat' | 'legacy',
  body: Record<string, unknown>,
  detail?: Record<string, unknown>,
): void {
  if (!import.meta.env.DEV) return;
  console.info('[fleetos:sso-parse]', {
    contract,
    keys: Object.keys(body),
    ...detail,
  });
}



function devLogSsoParseBeforeThrow(body: Record<string, unknown>, reason: string): void {
  if (!import.meta.env.DEV) return;
  console.warn('[fleetos:sso-parse] parse failed', {
    keys: Object.keys(body),
    reason,
  });
}



function isFleetosFlatConsumeContract(body: Record<string, unknown>): boolean {
  if (body.ok !== true) return false;

  const profileRaw = (body.profile ?? body.user) as Record<string, unknown> | undefined;
  const hasLegacyProfile = Boolean(
    profileRaw && typeof profileRaw.id === 'string' && profileRaw.id.trim(),
  );
  const hasLegacyToken = Boolean(
    (typeof body.token === 'string' && body.token.trim()) ||
      (typeof body.access_token === 'string' && body.access_token.trim()),
  );
  if (hasLegacyProfile && hasLegacyToken) {
    return false;
  }

  const hasEdgeJwt =
    typeof body.codevertex_edge_jwt === 'string' && body.codevertex_edge_jwt.trim().length > 0;
  const hasFlatStatus =
    typeof body.fleetosMembershipStatus === 'string' ||
    typeof body.fleetos_membership_status === 'string';
  return hasEdgeJwt || hasFlatStatus;
}



function resolveFlatFleetosMembershipStatus(
  body: Record<string, unknown>,
  membershipFallback?: SsoMembership,
): FleetosMembershipStatus {
  if (typeof body.fleetosMembershipStatus === 'string') {
    return normalizeMembershipStatus(body.fleetosMembershipStatus);
  }
  if (typeof body.fleetos_membership_status === 'string') {
    return normalizeMembershipStatus(body.fleetos_membership_status);
  }
  return membershipFallback?.status ?? 'missing';
}



function resolveFlatFleetosRole(body: Record<string, unknown>): FleetosRole {
  const candidate = body.fleetos_role ?? body.membership_role ?? body.role;
  return isFleetosRole(candidate) ? candidate : 'viewer';
}



function resolveConsumeProfileId(
  body: Record<string, unknown>,
  edgeJwt?: string,
): string {
  const profileRaw = (body.profile ?? body.user) as Record<string, unknown> | undefined;
  if (profileRaw && typeof profileRaw.id === 'string' && profileRaw.id.trim()) {
    return profileRaw.id.trim();
  }

  if (edgeJwt) {
    const payload = parseJwtPayload(edgeJwt);
    const sub =
      payload && typeof payload.sub === 'string'
        ? payload.sub.trim()
        : payload && typeof payload.user_id === 'string'
          ? payload.user_id.trim()
          : '';
    if (sub) {
      return sub;
    }
  }

  const message = import.meta.env.DEV
    ? 'SSO consume: missing profile id and JWT sub (FLEETOS flat contract).'
    : USER_SAFE_SSO_ERROR;
  throw new AuthCoreError(message);
}



function resolveConsumeAccessToken(body: Record<string, unknown>, edgeJwt?: string): string {
  if (typeof body.token === 'string' && body.token.trim()) {
    return body.token.trim();
  }
  if (typeof body.access_token === 'string' && body.access_token.trim()) {
    return body.access_token.trim();
  }
  if (edgeJwt) {
    return edgeJwt;
  }
  return '';
}



function buildSyntheticFleetosMembership(
  body: Record<string, unknown>,
  status: FleetosMembershipStatus,
): SsoMembership {
  return {
    app_code: APP_CODE,
    status,
    role: resolveFlatFleetosRole(body),
    tenant_id:
      typeof body.tenant_id === 'string'
        ? body.tenant_id
        : typeof body.tenantId === 'string'
          ? body.tenantId
          : undefined,
  };
}



function parseFleetosFlatSsoConsumeResponse(body: Record<string, unknown>): SsoConsumeResult {
  devLogSsoParse('fleetos-flat', body);

  const codevertexEdgeJwt =
    typeof body.codevertex_edge_jwt === 'string' && body.codevertex_edge_jwt.trim()
      ? body.codevertex_edge_jwt.trim()
      : undefined;

  const membershipsRaw = Array.isArray(body.memberships) ? body.memberships : [];
  let memberships: SsoMembership[] = membershipsRaw
    .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object')
    .map(m => parseMembershipRow(m));

  const fleetosFromBody = body.membership ?? body.fleetos_membership;
  if (fleetosFromBody && typeof fleetosFromBody === 'object') {
    const parsed = parseMembershipRow(fleetosFromBody as Record<string, unknown>);
    if (!findFleetosMembership(memberships)) {
      memberships.push({ ...parsed, app_code: APP_CODE });
    }
  }

  const fleetosMembershipStatus = resolveFlatFleetosMembershipStatus(
    body,
    findFleetosMembership(memberships),
  );

  if (!findFleetosMembership(memberships)) {
    memberships = [buildSyntheticFleetosMembership(body, fleetosMembershipStatus)];
  }

  const fleetosMembership = findFleetosMembership(memberships)!;

  const profileId = resolveConsumeProfileId(body, codevertexEdgeJwt);
  const token = resolveConsumeAccessToken(body, codevertexEdgeJwt);
  if (!token) {
    devLogSsoParseBeforeThrow(body, 'flat contract: missing token/access_token/codevertex_edge_jwt');
    throw new AuthCoreError(USER_SAFE_SSO_ERROR);
  }

  const profileRaw = (body.profile ?? body.user) as Record<string, unknown> | undefined;

  const rolesRaw = Array.isArray(body.roles) ? body.roles : [];
  let roles = rolesRaw.filter(isFleetosRole);
  if (roles.length === 0) {
    roles = [fleetosMembership.role];
  }

  const expiresAt =
    typeof body.expiresAt === 'string'
      ? body.expiresAt
      : typeof body.expires_at === 'string'
        ? body.expires_at
        : typeof body.codevertex_edge_jwt_expires_at === 'string' &&
            body.codevertex_edge_jwt_expires_at.trim()
          ? body.codevertex_edge_jwt_expires_at.trim()
          : new Date(Date.now() + 86400 * 1000).toISOString();

  devLogSsoParse('fleetos-flat', body, {
    fleetosMembershipStatus,
    hasEdgeJwt: Boolean(codevertexEdgeJwt),
    profileId,
  });

  return {
    profile: {
      id: profileId,
      email: typeof profileRaw?.email === 'string' ? profileRaw.email : '',
      display_name:
        typeof profileRaw?.display_name === 'string'
          ? profileRaw.display_name
          : typeof profileRaw?.name === 'string'
            ? profileRaw.name
            : 'FleetOS User',
    },
    memberships,
    roles,
    token,
    expiresAt,
    fleetosMembershipStatus,
    codevertexEdgeJwt,
    codevertexEdgeJwtExpiresAt:
      typeof body.codevertex_edge_jwt_expires_at === 'string' &&
      body.codevertex_edge_jwt_expires_at.trim()
        ? body.codevertex_edge_jwt_expires_at.trim()
        : undefined,
  };
}



function parseLegacySsoConsumeResponse(body: Record<string, unknown>): SsoConsumeResult {
  devLogSsoParse('legacy', body);

  const profileRaw = (body.profile ?? body.user) as Record<string, unknown> | undefined;

  if (!profileRaw || typeof profileRaw.id !== 'string') {
    devLogSsoParseBeforeThrow(body, 'legacy: missing profile/user.id');
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

  const fleetosMembershipStatus = resolveFlatFleetosMembershipStatus(body, fleetosMembership);

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

  const token = resolveConsumeAccessToken(body);

  if (!token) {

    devLogSsoParseBeforeThrow(body, 'legacy: missing token/access_token');

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



function parseSsoConsumeResponse(data: unknown): SsoConsumeResult {

  if (!data || typeof data !== 'object') {

    devLogSsoParseBeforeThrow({}, 'non-object response body');

    throw new AuthCoreError(USER_SAFE_SSO_ERROR);

  }

  const body = data as Record<string, unknown>;

  if (isFleetosFlatConsumeContract(body)) {

    return parseFleetosFlatSsoConsumeResponse(body);

  }

  return parseLegacySsoConsumeResponse(body);

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



/**
 * @deprecated Legacy mock — production must use Auth Core redirect via `getLoginUrl()` / `AuthProvider.login()`.
 * Do not use for real authentication.
 */
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



/**
 * @deprecated Legacy mock — use `getForgotPasswordUrl()` and Auth Core password recovery.
 */
export async function forgotPassword(_email: string): Promise<{ message: string }> {

  await delay(500);

  return { message: 'Reset email sent. Check your inbox.' };

}



/**
 * @deprecated Legacy mock — password reset is owned by Auth Core (`getResetPasswordUrl()`).
 */
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



/**
 * @deprecated Legacy mock — profile updates belong in Auth Core (`getAccountUrl()`).
 */
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



/**
 * @deprecated Legacy mock — password changes belong in Auth Core (`getSecurityUrl()`).
 */
export async function changePassword(_oldPassword: string, _newPassword: string): Promise<void> {

  await delay(400);

}



function delay(ms: number) {

  return new Promise(resolve => setTimeout(resolve, ms));

}


