/**
 * FleetOS P0.3B — `fleetos-submit-company` client.
 */

import { mapApiFieldErrors, type CompanyFormValues, buildCompanySubmitBody } from '@/lib/company-onboarding-validation';
import {
  CodevertexEdgeJwtExpiredError,
  EDGE_SESSION_EXPIRED_MESSAGE,
} from '@/lib/codevertex-edge-jwt';
import { FleetosEdgeRequestError, postFleetosEdge } from '@/lib/fleetos-edge-client';
import { parseGetMyAccessResponse } from '@/lib/services/fleetos-access.service';
import type { FleetosOperationalAccess } from '@/types/fleetos-access';
import type { CompanyFormFieldErrors } from '@/lib/company-onboarding-validation';

export function getFleetosSubmitCompanyUrl(): string | null {
  const explicit = (import.meta.env.VITE_FLEETOS_SUBMIT_COMPANY_URL as string | undefined)?.trim();
  if (explicit) return explicit;
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/functions/v1/fleetos-submit-company`;
}

export function isSubmitCompanyConfigured(): boolean {
  const url = getFleetosSubmitCompanyUrl();
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  return Boolean(url && anon);
}

function anonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
}

export class SubmitCompanyError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: CompanyFormFieldErrors;
  readonly tenantId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: { fieldErrors?: CompanyFormFieldErrors; tenantId?: string },
  ) {
    super(message);
    this.name = 'SubmitCompanyError';
    this.status = status;
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
    this.tenantId = options?.tenantId;
  }
}

export interface SubmitCompanySuccess {
  access: FleetosOperationalAccess;
  idempotent: boolean;
}

function friendlyConflictMessage(code: string, fallback: string): string {
  switch (code) {
    case 'slug_taken':
      return 'This workspace URL is already taken. Choose another slug.';
    case 'pending_application_exists':
      return 'You already have a company application under review.';
    case 'already_has_active_membership':
      return 'Your account already has an active FleetOS workspace.';
    default:
      return fallback;
  }
}

/**
 * POST `fleetos-submit-company` with Bearer `codevertex_edge_jwt`.
 * Treats 201 and 200 (idempotent) as success.
 */
export async function submitCompanyApplication(
  codevertexEdgeJwt: string,
  values: CompanyFormValues,
  options?: { expiresAt?: string | null },
): Promise<SubmitCompanySuccess> {
  const url = getFleetosSubmitCompanyUrl();
  const anon = anonKey();
  if (!url || !anon) {
    throw new Error(
      'FleetOS submit-company is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)',
    );
  }

  try {
    const body = await postFleetosEdge<Record<string, unknown>>(
      url,
      codevertexEdgeJwt,
      buildCompanySubmitBody(values),
      { expiresAt: options?.expiresAt, redirectOnExpired: true },
    );
    if (body.ok !== true) {
      throw new SubmitCompanyError(500, 'invalid_response', 'Unexpected response from server.');
    }
    return {
      access: parseGetMyAccessResponse(body),
      idempotent: body.idempotent === true,
    };
  } catch (e) {
    if (e instanceof CodevertexEdgeJwtExpiredError) {
      throw new SubmitCompanyError(401, 'session_expired', EDGE_SESSION_EXPIRED_MESSAGE);
    }
    if (e instanceof FleetosEdgeRequestError) {
      const { status, code, message, body } = e;

      if (status === 400) {
        const fields =
          body.fields && typeof body.fields === 'object'
            ? mapApiFieldErrors(body.fields as Record<string, string>)
            : undefined;
        throw new SubmitCompanyError(400, 'validation_error', message, { fieldErrors: fields });
      }

      if (status === 409) {
        throw new SubmitCompanyError(409, code, friendlyConflictMessage(code, message), {
          tenantId: typeof body.tenant_id === 'string' ? body.tenant_id : undefined,
        });
      }

      throw new SubmitCompanyError(status, code, message);
    }
    throw e;
  }
}
