/**
 * P0.2A — unit/smoke tests for operational access resolution (Deno).
 * Run: deno test --allow-read supabase/functions/_shared/fleetos-access.test.ts
 */

import {
  emptyAccessResolution,
  normalizeAuthMembershipStatus,
  resolveAccessFromMemberRows,
  resolveRowAccessState,
} from './fleetos-access.ts';
import { assertEquals } from 'jsr:@std/assert@1';

Deno.test('resolveRowAccessState — active when tenant and member active', () => {
  assertEquals(resolveRowAccessState('active', 'active'), 'active');
});

Deno.test('resolveRowAccessState — pending_review variants', () => {
  assertEquals(resolveRowAccessState('pending_review', 'pending'), 'pending_review');
  assertEquals(resolveRowAccessState('active', 'pending'), 'pending_review');
  assertEquals(resolveRowAccessState('active', 'invited'), 'pending_review');
});

Deno.test('resolveRowAccessState — suspended', () => {
  assertEquals(resolveRowAccessState('suspended', 'active'), 'suspended');
  assertEquals(resolveRowAccessState('active', 'suspended'), 'suspended');
});

Deno.test('resolveRowAccessState — revoked tenant lifecycle', () => {
  assertEquals(resolveRowAccessState('revoked', 'active'), 'revoked');
  assertEquals(resolveRowAccessState('archived', 'active'), 'revoked');
  assertEquals(resolveRowAccessState('inactive', 'active'), 'revoked');
});

Deno.test('emptyAccessResolution — needs_onboarding', () => {
  const r = emptyAccessResolution();
  assertEquals(r.access_state, 'needs_onboarding');
  assertEquals(r.redirect_path, '/onboarding/company');
  assertEquals(r.capabilities.can_submit_company, true);
  assertEquals(r.tenant, null);
  assertEquals(r.membership, null);
});

Deno.test('resolveAccessFromMemberRows — prefers active over pending', () => {
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
      },
    },
    {
      id: 'm-active',
      role: 'owner',
      legacy_role: null,
      status: 'active',
      created_at: '2026-05-28T10:00:00.000Z',
      updated_at: '2026-05-28T10:00:00.000Z',
      tenants: {
        id: 't-active',
        slug: 'acme',
        name: 'Acme',
        status: 'active',
        metadata: { onboarding: { submitted_at: '2026-05-28T09:00:00.000Z' } },
        created_at: '2026-05-28T08:00:00.000Z',
      },
    },
  ];
  const r = resolveAccessFromMemberRows(rows);
  assertEquals(r.access_state, 'active');
  assertEquals(r.tenant?.id, 't-active');
  assertEquals(r.tenant?.submitted_at, '2026-05-28T09:00:00.000Z');
  assertEquals(r.redirect_path, '/dashboard');
  assertEquals(r.capabilities.can_access_operational_shell, true);
});

Deno.test('resolveAccessFromMemberRows — tie-break by most recent created_at', () => {
  const rows = [
    {
      id: 'm-old',
      role: 'owner',
      legacy_role: null,
      status: 'pending',
      created_at: '2026-05-20T10:00:00.000Z',
      updated_at: '2026-05-20T10:00:00.000Z',
      tenants: {
        id: 't-old',
        slug: 'old',
        name: 'Old',
        status: 'pending_review',
        metadata: {},
        created_at: '2026-05-20T08:00:00.000Z',
      },
    },
    {
      id: 'm-new',
      role: 'owner',
      legacy_role: null,
      status: 'pending',
      created_at: '2026-05-29T10:00:00.000Z',
      updated_at: '2026-05-29T10:00:00.000Z',
      tenants: {
        id: 't-new',
        slug: 'new',
        name: 'New',
        status: 'pending_review',
        metadata: {},
        created_at: '2026-05-29T08:00:00.000Z',
      },
    },
  ];
  const r = resolveAccessFromMemberRows(rows);
  assertEquals(r.access_state, 'pending_review');
  assertEquals(r.membership?.id, 'm-new');
});

Deno.test('normalizeAuthMembershipStatus', () => {
  assertEquals(normalizeAuthMembershipStatus('active'), 'active');
  assertEquals(normalizeAuthMembershipStatus('approval_required'), 'pending');
  assertEquals(normalizeAuthMembershipStatus('approved'), 'active');
  assertEquals(normalizeAuthMembershipStatus(undefined), 'missing');
});
