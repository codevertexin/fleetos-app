import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyReviewTenant } from '../_lib/admin-edge-proxy';
import {
  methodNotAllowed,
  readJsonBody,
  requireAdminSession,
  requireJsonContentType,
  sendJson,
} from '../_lib/admin-http';

function enrichReviewBody(
  body: unknown,
  session: { reviewer_label?: string },
): Record<string, unknown> {
  const base =
    body && typeof body === 'object' && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>) }
      : {};

  if (
    (base.reviewer_label === undefined || base.reviewer_label === null) &&
    session.reviewer_label
  ) {
    base.reviewer_label = session.reviewer_label;
  }

  return base;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  if (!requireJsonContentType(req)) {
    sendJson(res, 415, {
      error: 'unsupported_media_type',
      message: 'Content-Type must be application/json',
    });
    return;
  }

  const session = requireAdminSession(req, res);
  if (!session) return;

  const body = readJsonBody(req);
  if (body === null) {
    sendJson(res, 400, { error: 'validation_error', message: 'Invalid JSON body' });
    return;
  }

  const edgeBody = enrichReviewBody(body, session);
  const result = await proxyReviewTenant(edgeBody);

  if ('configError' in result) {
    console.error('[admin-bff]', result.configError);
    sendJson(res, 500, {
      error: 'server_misconfigured',
      message: 'Admin BFF is not fully configured',
    });
    return;
  }

  sendJson(res, result.status, result.body);
}
