/**
 * P1.1 — fleetos-admin-review unit tests
 * Run: deno test --allow-read supabase/functions/_shared/fleetos-admin-review.test.ts
 */

import { assertEquals, assertExists } from 'jsr:@std/assert@1';
import {
  apiDecisionToStored,
  computeAccessPreview,
  mergeReviewMetadata,
  parseExistingReviewDecision,
  parseReviewTenantBody,
  storedDecisionToApi,
} from './fleetos-admin-review.ts';

Deno.test('parseReviewTenantBody — accepts approve', () => {
  const r = parseReviewTenantBody({
    tenant_id: 'a0000000-0000-4000-8000-0000000000c1',
    decision: 'approve',
    review_notes: 'OK',
  });
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.input.decision, 'approve');
    assertEquals(r.input.reviewNotes, 'OK');
  }
});

Deno.test('parseReviewTenantBody — rejects invalid decision', () => {
  const r = parseReviewTenantBody({
    tenant_id: 'a0000000-0000-4000-8000-0000000000c1',
    decision: 'maybe',
  });
  assertEquals(r.ok, false);
});

Deno.test('parseExistingReviewDecision — reads approved/rejected', () => {
  assertEquals(
    parseExistingReviewDecision({
      onboarding: { review: { decision: 'approved' } },
    }),
    'approved',
  );
  assertEquals(
    parseExistingReviewDecision({
      onboarding: { review: { decision: 'rejected' } },
    }),
    'rejected',
  );
  assertEquals(parseExistingReviewDecision({ onboarding: {} }), null);
});

Deno.test('apiDecisionToStored roundtrip', () => {
  assertEquals(storedDecisionToApi(apiDecisionToStored('approve')), 'approve');
  assertEquals(storedDecisionToApi(apiDecisionToStored('reject')), 'reject');
});

Deno.test('mergeReviewMetadata — sets review block and notes', () => {
  const merged = mergeReviewMetadata(
    {
      onboarding: {
        legal_name: 'Acme',
        submitted_at: '2026-05-29T12:00:00.000Z',
      },
    },
    {
      storedDecision: 'approved',
      reviewNotes: 'Verified',
      reviewedAt: '2026-05-30T09:00:00.000Z',
      reviewerSource: 'fleetos_admin_secret',
      reviewerLabel: 'ops@test',
      reviewedByCodevertexUserId: null,
      previousTenantStatus: 'pending_review',
      previousMembershipStatus: 'pending',
    },
  );
  const onboarding = (merged as { onboarding: Record<string, unknown> }).onboarding;
  assertEquals(onboarding.review_notes, 'Verified');
  const review = onboarding.review as Record<string, unknown>;
  assertEquals(review.decision, 'approved');
  assertEquals(review.reviewer_source, 'fleetos_admin_secret');
  assertEquals(review.previous_tenant_status, 'pending_review');
});

Deno.test('computeAccessPreview — approve → active_unsubscribed /app', () => {
  const p = computeAccessPreview('active', 'active', 'none');
  assertEquals(p.submitter_access_state, 'active_unsubscribed');
  assertEquals(p.submitter_redirect_path, '/app');
});

Deno.test('computeAccessPreview — reject → revoked', () => {
  const p = computeAccessPreview('revoked', 'suspended', 'none');
  assertEquals(p.submitter_access_state, 'revoked');
  assertEquals(p.submitter_redirect_path, '/access-revoked');
});

Deno.test('computeAccessPreview — billing active → dashboard', () => {
  const p = computeAccessPreview('active', 'active', 'active');
  assertEquals(p.submitter_access_state, 'active');
  assertEquals(p.submitter_redirect_path, '/dashboard');
});

Deno.test('parseReviewTenantBody — requires UUID tenant_id', () => {
  const r = parseReviewTenantBody({ tenant_id: 'not-uuid', decision: 'approve' });
  assertEquals(r.ok, false);
  if (!r.ok) assertExists(r.message);
});
