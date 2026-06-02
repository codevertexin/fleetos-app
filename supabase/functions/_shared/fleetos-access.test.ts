/**
 * P0.2A / P0.2b-2 — unit tests for operational access + billing gate (Deno).
 * Run: deno test --allow-read supabase/functions/_shared/fleetos-access.test.ts
 */

import {
  accessStatePriority,
  capabilitiesForState,
  compareMemberRowsByAccess,
  emptyAccessResolution,
  normalizeAuthMembershipStatus,
  normalizeSubscriptionStatus,
  resolveAccessFromMemberRows,
  resolveAccessState,
  resolveRowAccessState,
  resolveTenantApproval,
} from './fleetos-access.ts';
import { assertEquals } from 'jsr:@std/assert@1';

function activeTenantRow(
  subscription_status: string,
  memberId = 'm1',
  opts?: { slug?: string; name?: string; tenantId?: string; created_at?: string },
) {
  return {
    id: memberId,
    role: 'owner',
    legacy_role: null,
    status: 'active',
    created_at: opts?.created_at ?? '2026-05-28T10:00:00.000Z',
    updated_at: '2026-05-28T10:00:00.000Z',
    tenants: {
      id: opts?.tenantId ?? 't-active',
      slug: opts?.slug ?? 'acme',
      name: opts?.name ?? 'Acme',
      status: 'active',
      metadata: {},
      created_at: '2026-05-28T08:00:00.000Z',
      billing_plan_code: null,
      subscription_status,
    },
  };
}

function flashPendingRow(created_at: string) {
  return {
    id: 'm-flash',
    role: 'owner',
    legacy_role: null,
    status: 'pending',
    created_at,
    updated_at: created_at,
    tenants: {
      id: 't-flash',
      slug: 'flash',
      name: 'Flash',
      status: 'pending_review',
      metadata: {},
      created_at: '2026-05-29T08:00:00.000Z',
      billing_plan_code: null,
      subscription_status: 'none',
    },
  };
}

function johnFredRow(subscription_status: string, created_at: string) {
  return activeTenantRow(subscription_status, 'm-john-fred', {
    slug: 'john-fred',
    name: 'John & Fred',
    tenantId: 't-john-fred',
    created_at,
  });
}

Deno.test('emptyAccessResolution — needs_onboarding', () => {
  const r = emptyAccessResolution();
  assertEquals(r.access_state, 'needs_onboarding');
  assertEquals(r.redirect_path, '/onboarding/company');
  assertEquals(r.capabilities.can_submit_company, true);
  assertEquals(r.gates.tenant_approval, 'none');
});

Deno.test('resolveTenantApproval — pending_review variants', () => {
  assertEquals(resolveTenantApproval('pending_review', 'pending'), 'pending_review');
  assertEquals(resolveTenantApproval('active', 'pending'), 'pending_review');
  assertEquals(resolveTenantApproval('active', 'invited'), 'pending_review');
});

Deno.test('resolveAccessState — billing splits approved tenant', () => {
  assertEquals(resolveAccessState('approved', 'none'), 'active_unsubscribed');
  assertEquals(resolveAccessState('approved', 'past_due'), 'active_unsubscribed');
  assertEquals(resolveAccessState('approved', 'canceled'), 'active_unsubscribed');
  assertEquals(resolveAccessState('approved', 'active'), 'active');
  assertEquals(resolveAccessState('approved', 'trialing'), 'active');
});

Deno.test('resolveRowAccessState — suspended and revoked', () => {
  assertEquals(resolveRowAccessState('suspended', 'active', 'none'), 'suspended');
  assertEquals(resolveRowAccessState('revoked', 'active', 'active'), 'revoked');
  assertEquals(resolveRowAccessState('archived', 'active', 'active'), 'revoked');
});

Deno.test('pending_review → /preview with preview capabilities', () => {
  const r = resolveAccessFromMemberRows([
    {
      id: 'm-pending',
      role: 'owner',
      legacy_role: null,
      status: 'pending',
      created_at: '2026-05-29T10:00:00.000Z',
      updated_at: '2026-05-29T10:00:00.000Z',
      tenants: {
        id: 't-pending',
        slug: 'acme',
        name: 'Acme',
        status: 'pending_review',
        metadata: {},
        created_at: '2026-05-29T08:00:00.000Z',
        billing_plan_code: null,
        subscription_status: 'none',
      },
    },
  ]);
  assertEquals(r.access_state, 'pending_review');
  assertEquals(r.redirect_path, '/preview');
  assertEquals(r.workspace_mode, 'preview');
  assertEquals(r.capabilities.can_access_preview_workspace, true);
  assertEquals(r.capabilities.can_write_setup_data, false);
  assertEquals(r.capabilities.can_write_operational_data, false);
  assertEquals(r.capabilities.can_invite_members, false);
  assertEquals(r.capabilities.can_start_checkout, false);
});

Deno.test('active + subscription_status none → active_unsubscribed /app', () => {
  const r = resolveAccessFromMemberRows([activeTenantRow('none')]);
  assertEquals(r.access_state, 'active_unsubscribed');
  assertEquals(r.redirect_path, '/app');
  assertEquals(r.workspace_mode, 'setup');
  assertEquals(r.gates.tenant_approval, 'approved');
  assertEquals(r.gates.tenant_billing, 'none');
  assertEquals(r.capabilities.can_write_setup_data, true);
  assertEquals(r.capabilities.can_write_operational_data, false);
  assertEquals(r.capabilities.can_invite_members, true);
  assertEquals(r.capabilities.can_start_checkout, true);
});

Deno.test('active + subscription_status active → active /dashboard', () => {
  const r = resolveAccessFromMemberRows([activeTenantRow('active')]);
  assertEquals(r.access_state, 'active');
  assertEquals(r.redirect_path, '/dashboard');
  assertEquals(r.workspace_mode, 'operational');
  assertEquals(r.capabilities.can_write_operational_data, true);
  assertEquals(r.capabilities.can_access_dashboard, true);
});

Deno.test('active + trialing → active /dashboard', () => {
  const r = resolveAccessFromMemberRows([activeTenantRow('trialing')]);
  assertEquals(r.access_state, 'active');
  assertEquals(r.redirect_path, '/dashboard');
});

Deno.test('past_due and canceled → active_unsubscribed', () => {
  const pastDue = resolveAccessFromMemberRows([activeTenantRow('past_due')]);
  assertEquals(pastDue.access_state, 'active_unsubscribed');
  assertEquals(pastDue.redirect_path, '/app');

  const canceled = resolveAccessFromMemberRows([activeTenantRow('canceled', 'm2')]);
  assertEquals(canceled.access_state, 'active_unsubscribed');
});

Deno.test('resolveAccessFromMemberRows — prefers active over pending_review', () => {
  const rows = [
    {
      id: 'm-pending',
      role: 'owner',
      legacy_role: null,
      status: 'pending',
      created_at: '2026-05-29T14:00:00.000Z',
      updated_at: '2026-05-29T14:00:00.000Z',
      tenants: {
        id: 't-pending',
        slug: 'old-co',
        name: 'Old Co',
        status: 'pending_review',
        metadata: {},
        created_at: '2026-05-29T12:00:00.000Z',
        billing_plan_code: null,
        subscription_status: 'none',
      },
    },
    activeTenantRow('active', 'm-active'),
  ];
  const r = resolveAccessFromMemberRows(rows);
  assertEquals(r.access_state, 'active');
  assertEquals(r.tenant?.id, 't-active');
});

Deno.test('accessStatePriority — operational bands', () => {
  assertEquals(accessStatePriority('active'), 50);
  assertEquals(accessStatePriority('active_unsubscribed'), 45);
  assertEquals(accessStatePriority('pending_review'), 30);
  assertEquals(accessStatePriority('active') > accessStatePriority('pending_review'), true);
  assertEquals(
    accessStatePriority('active_unsubscribed') > accessStatePriority('pending_review'),
    true,
  );
});

Deno.test('multi-tenant — Flash pending (newer) loses to John & Fred subscribed', () => {
  const rows = [
    flashPendingRow('2026-05-30T14:00:00.000Z'),
    johnFredRow('active', '2026-05-01T08:00:00.000Z'),
  ];
  assertEquals(compareMemberRowsByAccess(rows[1], rows[0]) > 0, true);
  const r = resolveAccessFromMemberRows(rows);
  assertEquals(r.access_state, 'active');
  assertEquals(r.redirect_path, '/dashboard');
  assertEquals(r.tenant?.slug, 'john-fred');
  assertEquals(r.tenant?.name, 'John & Fred');
});

Deno.test('multi-tenant — Flash pending (newer) loses to John & Fred unsubscribed', () => {
  const rows = [
    flashPendingRow('2026-05-30T14:00:00.000Z'),
    johnFredRow('none', '2026-05-01T08:00:00.000Z'),
  ];
  const r = resolveAccessFromMemberRows(rows);
  assertEquals(r.access_state, 'active_unsubscribed');
  assertEquals(r.redirect_path, '/app');
  assertEquals(r.tenant?.slug, 'john-fred');
});

Deno.test('multi-tenant — subscribed wins over unsubscribed and pending', () => {
  const rows = [
    flashPendingRow('2026-05-30T14:00:00.000Z'),
    activeTenantRow('none', 'm-jf-setup', {
      slug: 'john-fred',
      name: 'John & Fred',
      tenantId: 't-jf-setup',
      created_at: '2026-05-02T08:00:00.000Z',
    }),
    activeTenantRow('active', 'm-jf-billed', {
      slug: 'john-fred-billed',
      name: 'John & Fred Billed',
      tenantId: 't-jf-billed',
      created_at: '2026-05-01T08:00:00.000Z',
    }),
  ];
  const r = resolveAccessFromMemberRows(rows);
  assertEquals(r.access_state, 'active');
  assertEquals(r.tenant?.slug, 'john-fred-billed');
});

Deno.test('multi-tenant — order independent (operational tenant first in array)', () => {
  const r = resolveAccessFromMemberRows([
    johnFredRow('active', '2026-05-01T08:00:00.000Z'),
    flashPendingRow('2026-05-30T14:00:00.000Z'),
  ]);
  assertEquals(r.access_state, 'active');
  assertEquals(r.tenant?.slug, 'john-fred');
});

Deno.test('resolveAccessFromMemberRows — prefers active_unsubscribed over pending', () => {
  const rows = [
    {
      id: 'm-pending',
      role: 'owner',
      legacy_role: null,
      status: 'pending',
      created_at: '2026-05-29T14:00:00.000Z',
      updated_at: '2026-05-29T14:00:00.000Z',
      tenants: {
        id: 't-pending',
        slug: 'old-co',
        name: 'Old Co',
        status: 'pending_review',
        metadata: {},
        created_at: '2026-05-29T12:00:00.000Z',
        billing_plan_code: null,
        subscription_status: 'none',
      },
    },
    activeTenantRow('none', 'm-setup'),
  ];
  const r = resolveAccessFromMemberRows(rows);
  assertEquals(r.access_state, 'active_unsubscribed');
  assertEquals(r.membership?.id, 'm-setup');
});

Deno.test('normalizeSubscriptionStatus — unknown defaults to none', () => {
  assertEquals(normalizeSubscriptionStatus(undefined), 'none');
  assertEquals(normalizeSubscriptionStatus('invalid'), 'none');
});

Deno.test('capabilitiesForState — viewer cannot invite on setup', () => {
  const caps = capabilitiesForState('active_unsubscribed', 'viewer');
  assertEquals(caps.can_write_setup_data, true);
  assertEquals(caps.can_invite_members, false);
  assertEquals(caps.can_start_checkout, false);
});

Deno.test('normalizeAuthMembershipStatus', () => {
  assertEquals(normalizeAuthMembershipStatus('active'), 'active');
  assertEquals(normalizeAuthMembershipStatus('approval_required'), 'pending');
  assertEquals(normalizeAuthMembershipStatus(undefined), 'missing');
});
