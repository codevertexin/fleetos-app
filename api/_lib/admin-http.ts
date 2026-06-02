import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readSessionFromRequest } from './admin-session';

export function sendJson(
  res: VercelResponse,
  status: number,
  body: Record<string, unknown>,
): void {
  res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]): void {
  sendJson(res, 405, {
    error: 'method_not_allowed',
    message: `Use ${allowed.join(' or ')}`,
  });
}

/** POST mutations must declare application/json (CSRF mitigation). */
export function requireJsonContentType(req: VercelRequest): boolean {
  const raw = req.headers['content-type'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return false;
  return value.toLowerCase().includes('application/json');
}

export function requireAdminSession(
  req: VercelRequest,
  res: VercelResponse,
): ReturnType<typeof readSessionFromRequest> | null {
  const session = readSessionFromRequest(req);
  if (!session) {
    sendJson(res, 401, {
      error: 'admin_session_required',
      message: 'Valid fleetos_admin_session cookie required',
    });
    return null;
  }
  return session;
}

export function readJsonBody(req: VercelRequest): unknown {
  if (req.body === undefined || req.body === null || req.body === '') {
    return {};
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as unknown;
    } catch {
      return null;
    }
  }
  return req.body;
}
