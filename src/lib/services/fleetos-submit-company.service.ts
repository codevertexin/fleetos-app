/**
 * FleetOS P0.3B — `fleetos-submit-company` client.
 */

import { mapApiFieldErrors, type CompanyFormValues, buildCompanySubmitBody } from '@/lib/company-onboarding-validation';
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

async function parseErrorBody(res: Response): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await res.json();
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
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
): Promise<SubmitCompanySuccess> {
  const url = getFleetosSubmitCompanyUrl();
  const anon = anonKey();
  if (!url || !anon) {
    throw new Error(
      'FleetOS submit-company is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)',
    );
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${codevertexEdgeJwt.trim()}`,
    },
    body: JSON.stringify(buildCompanySubmitBody(values)),
  });

  const body = await parseErrorBody(res);

  if (res.status === 201 || res.status === 200) {
    if (body.ok !== true) {
      throw new SubmitCompanyError(res.status, 'invalid_response', 'Unexpected response from server.');
    }
    return {
      access: parseGetMyAccessResponse(body),
      idempotent: res.status === 200,
    };
  }

  if (res.status === 400) {
    const fields =
      body.fields && typeof body.fields === 'object'
        ? mapApiFieldErrors(body.fields as Record<string, string>)
        : undefined;
    const message =
      typeof body.message === 'string' ? body.message : 'Please check the form and try again.';
    throw new SubmitCompanyError(400, 'validation_error', message, { fieldErrors: fields });
  }

  if (res.status === 409) {
    const code = typeof body.error === 'string' ? body.error : 'conflict';
    const message = friendlyConflictMessage(
      code,
      typeof body.message === 'string' ? body.message : 'Unable to submit company application.',
    );
    throw new SubmitCompanyError(409, code, message, {
      tenantId: typeof body.tenant_id === 'string' ? body.tenant_id : undefined,
    });
  }

  const message =
    typeof body.message === 'string'
      ? body.message
      : `Submit failed (${res.status})`;
  throw new SubmitCompanyError(res.status, 'request_failed', message);
}
