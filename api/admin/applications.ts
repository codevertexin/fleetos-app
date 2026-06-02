import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyListApplications } from '../_lib/admin-edge-proxy';
import {
  methodNotAllowed,
  readJsonBody,
  requireAdminSession,
  requireJsonContentType,
  sendJson,
} from '../_lib/admin-http';

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

  const result = await proxyListApplications(body);
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
