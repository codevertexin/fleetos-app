/**
 * FleetOS Platform Admin BFF client (P1.2C).
 * Only calls same-origin /api/admin/* — never Supabase Edge admin functions.
 */

import type {
  AdminApplicationsListResponse,
  AdminReviewResponse,
  AdminSessionResponse,
} from '@/types/fleetos-admin-applications';

const ADMIN_API = '/api/admin';

export class AdminBffError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AdminBffError';
    this.status = status;
    this.code = code;
  }
}

async function parseJsonBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return { message: text.slice(0, 200) };
}

async function adminFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  let body = init?.body;

  if (init?.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }

  const res = await fetch(`${ADMIN_API}${path}`, {
    ...init,
    body,
    headers,
    credentials: 'include',
  });

  const data = await parseJsonBody(res);

  if (!res.ok) {
    const code = typeof data.error === 'string' ? data.error : 'request_failed';
    const message =
      typeof data.message === 'string' ? data.message : `Request failed (${res.status})`;
    throw new AdminBffError(res.status, code, message);
  }

  return data as T;
}

export async function fetchAdminSession(): Promise<AdminSessionResponse> {
  return adminFetch<AdminSessionResponse>('/session', { method: 'GET' });
}

export async function createAdminSession(
  token: string,
  reviewerLabel?: string,
): Promise<AdminSessionResponse> {
  return adminFetch<AdminSessionResponse>('/session', {
    method: 'POST',
    json: {
      token: token.trim(),
      ...(reviewerLabel?.trim() ? { reviewer_label: reviewerLabel.trim() } : {}),
    },
  });
}

export async function deleteAdminSession(): Promise<void> {
  const res = await fetch(`${ADMIN_API}/session`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok && res.status !== 204) {
    const data = await parseJsonBody(res);
    const code = typeof data.error === 'string' ? data.error : 'logout_failed';
    const message =
      typeof data.message === 'string' ? data.message : 'Could not sign out';
    throw new AdminBffError(res.status, code, message);
  }
}

export async function listAdminApplications(
  body: Record<string, unknown> = { status: 'pending_review', limit: 50 },
): Promise<AdminApplicationsListResponse> {
  return adminFetch<AdminApplicationsListResponse>('/applications', {
    method: 'POST',
    json: body,
  });
}

export interface ReviewTenantPayload {
  tenant_id: string;
  decision: 'approve' | 'reject';
  review_notes?: string;
  reviewer_label?: string;
}

export async function reviewAdminTenant(
  payload: ReviewTenantPayload,
): Promise<AdminReviewResponse> {
  return adminFetch<AdminReviewResponse>('/review-tenant', {
    method: 'POST',
    json: payload,
  });
}
