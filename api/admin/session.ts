import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOperatorToken } from '../_lib/admin-env';
import {
  buildClearSessionCookie,
  issueSessionCookie,
  readSessionFromRequest,
} from '../_lib/admin-session';
import { timingSafeEqualString } from '../_lib/timing-safe';
import {
  methodNotAllowed,
  readJsonBody,
  requireJsonContentType,
  sendJson,
} from '../_lib/admin-http';

function readLoginToken(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const raw =
    (typeof record.token === 'string' && record.token) ||
    (typeof record.operator_token === 'string' && record.operator_token);
  return raw?.trim() || null;
}

function readReviewerLabel(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const record = body as Record<string, unknown>;
  if (typeof record.reviewer_label !== 'string') return undefined;
  const v = record.reviewer_label.trim();
  return v || undefined;
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const method = req.method ?? 'GET';

  if (method === 'GET') {
    const session = readSessionFromRequest(req);
    sendJson(res, 200, {
      ok: true,
      authenticated: session !== null,
      reviewer_label: session?.reviewer_label ?? null,
    });
    return;
  }

  if (method === 'DELETE') {
    res.setHeader('Set-Cookie', buildClearSessionCookie());
    res.status(204).end();
    return;
  }

  if (method === 'POST') {
    if (!requireJsonContentType(req)) {
      sendJson(res, 415, {
        error: 'unsupported_media_type',
        message: 'Content-Type must be application/json',
      });
      return;
    }

    const body = readJsonBody(req);
    if (body === null) {
      sendJson(res, 400, { error: 'validation_error', message: 'Invalid JSON body' });
      return;
    }

    const token = readLoginToken(body);
    if (!token) {
      sendJson(res, 400, {
        error: 'validation_error',
        message: 'token is required',
      });
      return;
    }

    const configured = getOperatorToken();
    if (!configured) {
      console.error('[admin-bff] FLEETOS_ADMIN_UI_OPERATOR_TOKEN is not configured');
      sendJson(res, 500, {
        error: 'server_misconfigured',
        message: 'Operator authentication is not configured',
      });
      return;
    }

    if (!timingSafeEqualString(token, configured)) {
      sendJson(res, 401, {
        error: 'operator_unauthorized',
        message: 'Invalid operator token',
      });
      return;
    }

    const ok = issueSessionCookie(res, readReviewerLabel(body));
    if (!ok) {
      sendJson(res, 500, {
        error: 'server_misconfigured',
        message: 'Session signing is not configured',
      });
      return;
    }

    sendJson(res, 200, { ok: true, authenticated: true });
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
}
