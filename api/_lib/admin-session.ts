import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getSessionSigningSecret,
  getSessionTtlSeconds,
  isProduction,
} from './admin-env';

export const ADMIN_SESSION_COOKIE = 'fleetos_admin_session';

export interface AdminSessionPayload {
  exp: number;
  reviewer_label?: string;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data, 'utf8')
    .toString('base64url');
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

export function createSessionToken(payload: AdminSessionPayload): string | null {
  const secret = getSessionSigningSecret();
  if (!secret) return null;

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = signPayload(encoded, secret);
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): AdminSessionPayload | null {
  const secret = getSessionSigningSecret();
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expected = signPayload(encoded, secret);
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as AdminSessionPayload;
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (
      payload.reviewer_label !== undefined &&
      typeof payload.reviewer_label !== 'string'
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;

  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function readSessionFromRequest(req: VercelRequest): AdminSessionPayload | null {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[ADMIN_SESSION_COOKIE];
  if (!raw) return null;
  return verifySessionToken(raw);
}

export function buildSessionCookie(token: string): string {
  const maxAge = getSessionTtlSeconds();
  const secure = isProduction() ? '; Secure' : '';
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function buildClearSessionCookie(): string {
  const secure = isProduction() ? '; Secure' : '';
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function issueSessionCookie(
  res: VercelResponse,
  reviewerLabel?: string,
): boolean {
  const exp = Math.floor(Date.now() / 1000) + getSessionTtlSeconds();
  const payload: AdminSessionPayload = { exp };
  if (reviewerLabel?.trim()) {
    payload.reviewer_label = reviewerLabel.trim();
  }

  const token = createSessionToken(payload);
  if (!token) return false;

  res.setHeader('Set-Cookie', buildSessionCookie(token));
  return true;
}
