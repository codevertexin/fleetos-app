/**
 * Server-only env for FleetOS Admin BFF (Vercel / vercel dev).
 * Never import from src/ — no VITE_ secrets for admin.
 */

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

export function getAdminSecret(): string | undefined {
  return readEnv('FLEETOS_ADMIN_SECRET');
}

export function getOperatorToken(): string | undefined {
  return readEnv('FLEETOS_ADMIN_UI_OPERATOR_TOKEN');
}

export function getSupabaseUrl(): string | undefined {
  return readEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
}

export function getSupabaseAnonKey(): string | undefined {
  return readEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');
}

export function getEdgeAllowedOrigin(): string {
  return (
    readEnv('FLEETOS_EDGE_ALLOWED_ORIGIN') ??
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4200')
  );
}

export function getSessionSigningSecret(): string | undefined {
  return readEnv('ADMIN_UI_SESSION_SIGNING_SECRET', 'FLEETOS_ADMIN_UI_OPERATOR_TOKEN');
}

export function getSessionTtlSeconds(): number {
  const raw = readEnv('ADMIN_UI_SESSION_TTL_SECONDS');
  if (!raw) return 28_800;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 60) return 28_800;
  return Math.min(n, 86_400);
}

export function isProduction(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production'
  );
}

export function assertAdminBffConfigured(): {
  adminSecret: string;
  supabaseUrl: string;
  anonKey: string;
  origin: string;
} | { error: string } {
  const adminSecret = getAdminSecret();
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const origin = getEdgeAllowedOrigin();

  if (!adminSecret) {
    return { error: 'FLEETOS_ADMIN_SECRET is not configured' };
  }
  if (!supabaseUrl) {
    return { error: 'SUPABASE_URL or VITE_SUPABASE_URL is not configured' };
  }
  if (!anonKey) {
    return { error: 'SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY is not configured' };
  }
  if (!origin) {
    return { error: 'FLEETOS_EDGE_ALLOWED_ORIGIN is not configured' };
  }

  return { adminSecret, supabaseUrl, anonKey, origin };
}
