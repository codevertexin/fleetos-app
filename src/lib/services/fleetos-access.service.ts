/**
 * FleetOS P0.3A — `fleetos-get-my-access` client (post-SSO router).
 */

import type {
  FleetosAccessState,
  FleetosOperationalAccess,
  FleetosWorkspaceMode,
} from '@/types/fleetos-access';
import {
  defaultRedirectForAccessState,
  normalizeAccessRedirectPath,
} from '@/lib/access-routing';

export function getFleetosGetMyAccessUrl(): string | null {
  const explicit = (import.meta.env.VITE_FLEETOS_GET_MY_ACCESS_URL as string | undefined)?.trim();
  if (explicit) return explicit;
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/functions/v1/fleetos-get-my-access`;
}

export function isGetMyAccessConfigured(): boolean {
  const url = getFleetosGetMyAccessUrl();
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  return Boolean(url && anon);
}

function anonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
}

function parseAccessState(raw: unknown): FleetosAccessState {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (
    v === 'needs_onboarding' ||
    v === 'pending_review' ||
    v === 'active_unsubscribed' ||
    v === 'active' ||
    v === 'suspended' ||
    v === 'revoked'
  ) {
    return v;
  }
  return 'needs_onboarding';
}

function parseWorkspaceMode(raw: unknown): FleetosWorkspaceMode | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (v === 'preview' || v === 'setup' || v === 'operational') {
    return v;
  }
  return null;
}

function parseCapabilities(raw: unknown): FleetosOperationalAccess['capabilities'] {
  if (!raw || typeof raw !== 'object') return {};
  const out: FleetosOperationalAccess['capabilities'] = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}

export function parseGetMyAccessResponse(data: unknown): FleetosOperationalAccess {
  const body = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const accessState = parseAccessState(body.access_state);
  const redirectPath = normalizeAccessRedirectPath(
    typeof body.redirect_path === 'string' && body.redirect_path.trim()
      ? body.redirect_path.trim()
      : defaultRedirectForAccessState(accessState),
  );

  const gatesRaw = body.gates;
  const gates =
    gatesRaw && typeof gatesRaw === 'object'
      ? {
          auth_membership: String((gatesRaw as Record<string, unknown>).auth_membership ?? ''),
          tenant_approval: String((gatesRaw as Record<string, unknown>).tenant_approval ?? ''),
          tenant_billing: String((gatesRaw as Record<string, unknown>).tenant_billing ?? ''),
          role:
            typeof (gatesRaw as Record<string, unknown>).role === 'string'
              ? ((gatesRaw as Record<string, unknown>).role as string)
              : null,
        }
      : null;

  let tenant: FleetosOperationalAccess['tenant'] = null;
  const tenantRaw = body.tenant;
  if (tenantRaw && typeof tenantRaw === 'object') {
    const t = tenantRaw as Record<string, unknown>;
    if (typeof t.id === 'string' && typeof t.slug === 'string' && typeof t.name === 'string') {
      tenant = {
        id: t.id,
        slug: t.slug,
        name: t.name,
        status: String(t.status ?? ''),
        submitted_at: typeof t.submitted_at === 'string' ? t.submitted_at : undefined,
        billing_plan_code:
          typeof t.billing_plan_code === 'string' ? t.billing_plan_code : null,
        subscription_status:
          typeof t.subscription_status === 'string' ? t.subscription_status : undefined,
      };
    }
  }

  let membership: FleetosOperationalAccess['membership'] = null;
  const memberRaw = body.membership;
  if (memberRaw && typeof memberRaw === 'object') {
    const m = memberRaw as Record<string, unknown>;
    if (typeof m.id === 'string') {
      membership = {
        id: m.id,
        role: String(m.role ?? 'viewer'),
        status: String(m.status ?? ''),
      };
    }
  }

  return {
    accessState,
    redirectPath,
    workspaceMode: parseWorkspaceMode(body.workspace_mode),
    gates,
    capabilities: parseCapabilities(body.capabilities),
    tenant,
    membership,
  };
}

/**
 * POST `fleetos-get-my-access` with Bearer `codevertex_edge_jwt`.
 */
export async function fetchMyAccess(codevertexEdgeJwt: string): Promise<FleetosOperationalAccess> {
  const url = getFleetosGetMyAccessUrl();
  const anon = anonKey();
  if (!url || !anon) {
    throw new Error('FleetOS get-my-access is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${codevertexEdgeJwt.trim()}`,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`fleetos-get-my-access failed (${res.status}): ${text || res.statusText}`);
  }

  const data: unknown = await res.json().catch(() => null);
  if (data && typeof data === 'object' && (data as Record<string, unknown>).ok !== true) {
    throw new Error('fleetos-get-my-access returned ok=false');
  }
  return parseGetMyAccessResponse(data);
}
