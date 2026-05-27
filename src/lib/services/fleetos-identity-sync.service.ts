/**
 * FleetOS Phase 5b — operational identity sync via Supabase Edge (secure path).
 *
 * Does NOT call anon PostgREST RPCs for writes. When the Edge Function is not
 * deployed or returns 501, sync is skipped safely (no insecure success).
 */

import type { SsoConsumeResult } from '@/lib/services/auth.service';

export interface OperationalIdentitySyncMeta {
  operationalPrimaryTenantId: string | null;
  operationalProfileId: string | null;
}

const APP_CODE = 'FLEETOS';

/** Optional full URL; otherwise derived from VITE_SUPABASE_URL. */
export function getFleetosSyncIdentityUrl(): string | null {
  const explicit = (import.meta.env.VITE_FLEETOS_SYNC_IDENTITY_URL as string | undefined)?.trim();
  if (explicit) return explicit;
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/functions/v1/fleetos-sync-identity`;
}

function isEdgeIdentitySyncConfigured(): boolean {
  return Boolean(
    getFleetosSyncIdentityUrl() &&
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim(),
  );
}

/**
 * POST to Edge `fleetos-sync-identity` with Auth Core token in
 * `X-Auth-Core-Access-Token`. Does not send tenant_id or codevertex_user_id in body.
 *
 * Returns null when Edge is not configured, on network error, or on 501 (not implemented).
 */
export async function syncOperationalIdentityAfterSso(
  result: SsoConsumeResult,
): Promise<OperationalIdentitySyncMeta | null> {
  if (!isEdgeIdentitySyncConfigured()) {
    return null;
  }

  if (result.fleetosMembershipStatus !== 'active') {
    return null;
  }

  const url = getFleetosSyncIdentityUrl()!;
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        'X-Auth-Core-Access-Token': result.token,
      },
      body: JSON.stringify({ app_code: APP_CODE }),
    });

    if (res.status === 501) {
      console.warn('[fleetos] fleetos-sync-identity: not implemented (501) — skipping operational DB sync');
      return null;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[fleetos] fleetos-sync-identity failed', res.status, text);
      return null;
    }

    // Future: parse JSON { profile_id, tenant_id, tenants } from verified Edge response.
    await res.json().catch(() => null);
    return null;
  } catch (e) {
    console.warn('[fleetos] fleetos-sync-identity request error', e);
    return null;
  }
}
