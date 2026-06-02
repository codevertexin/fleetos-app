import { assertAdminBffConfigured } from './admin-env';

const LIST_FN = 'fleetos-admin-list-tenant-applications';
const REVIEW_FN = 'fleetos-admin-review-tenant';

export interface EdgeProxyResult {
  status: number;
  body: Record<string, unknown>;
}

async function parseEdgeResponse(res: Response): Promise<EdgeProxyResult> {
  const text = await res.text();
  let body: Record<string, unknown> = {};
  if (text) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      } else {
        body = { error: 'invalid_edge_response', message: 'Non-object JSON from Edge' };
      }
    } catch {
      body = { error: 'invalid_edge_response', message: text.slice(0, 200) };
    }
  }

  if (res.status === 401 && body.error === 'admin_unauthorized') {
    console.error('[admin-bff] Edge returned admin_unauthorized — check FLEETOS_ADMIN_SECRET');
    return {
      status: 502,
      body: {
        error: 'admin_backend_misconfigured',
        message: 'Admin Edge authentication failed',
      },
    };
  }

  return { status: res.status, body };
}

export async function proxyListApplications(
  edgeBody: unknown,
): Promise<EdgeProxyResult | { configError: string }> {
  const cfg = assertAdminBffConfigured();
  if ('error' in cfg) {
    return { configError: cfg.error };
  }

  const url = `${cfg.supabaseUrl}/functions/v1/${LIST_FN}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-FleetOS-Admin-Secret': cfg.adminSecret,
      apikey: cfg.anonKey,
      Origin: cfg.origin,
    },
    body: JSON.stringify(edgeBody ?? {}),
  });

  return parseEdgeResponse(res);
}

export async function proxyReviewTenant(
  edgeBody: unknown,
): Promise<EdgeProxyResult | { configError: string }> {
  const cfg = assertAdminBffConfigured();
  if ('error' in cfg) {
    return { configError: cfg.error };
  }

  const url = `${cfg.supabaseUrl}/functions/v1/${REVIEW_FN}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-FleetOS-Admin-Secret': cfg.adminSecret,
      apikey: cfg.anonKey,
      Origin: cfg.origin,
    },
    body: JSON.stringify(edgeBody ?? {}),
  });

  return parseEdgeResponse(res);
}
