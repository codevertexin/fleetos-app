/**
 * FleetOS P1.1 — approve / reject pending company applications (admin).
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import {
  normalizeSubscriptionStatus,
  resolveRowAccessState,
  type FleetosAccessState,
} from './fleetos-access.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const OWNER_ADMIN_ROLES = ['owner', 'admin'] as const;

export type ReviewDecision = 'approve' | 'reject';

export type StoredReviewDecision = 'approved' | 'rejected';

export interface ReviewTenantInput {
  tenantId: string;
  decision: ReviewDecision;
  reviewNotes: string | null;
  reviewerLabel: string | null;
  reviewerSource: string;
  reviewedByCodevertexUserId: string | null;
}

export interface MembershipUpdated {
  id: string;
  codevertex_user_id: string;
  role: string;
  status: string;
  is_active: boolean;
}

export interface ReviewTenantSuccess {
  decision: ReviewDecision;
  idempotent: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    subscription_status: string;
  };
  memberships_updated: MembershipUpdated[];
  onboarding_review: Record<string, unknown>;
  access_preview: {
    submitter_access_state: FleetosAccessState;
    submitter_redirect_path: string;
  };
}

export type ReviewTenantResult =
  | { ok: true; data: ReviewTenantSuccess }
  | { ok: false; error: string; message: string; status: number };

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscription_status: string | null;
  metadata: unknown;
}

interface MemberRow {
  id: string;
  role: string;
  status: string;
  codevertex_user_id: string;
  is_active: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function redirectPathForAccessState(state: FleetosAccessState): string {
  switch (state) {
    case 'needs_onboarding':
      return '/onboarding/company';
    case 'pending_review':
      return '/preview';
    case 'active_unsubscribed':
      return '/app';
    case 'active':
      return '/dashboard';
    case 'suspended':
      return '/access-suspended';
    case 'revoked':
      return '/access-revoked';
    default:
      return '/onboarding/company';
  }
}

export function storedDecisionToApi(stored: StoredReviewDecision): ReviewDecision {
  return stored === 'approved' ? 'approve' : 'reject';
}

export function apiDecisionToStored(decision: ReviewDecision): StoredReviewDecision {
  return decision === 'approve' ? 'approved' : 'rejected';
}

export function parseExistingReviewDecision(metadata: unknown): StoredReviewDecision | null {
  if (!isRecord(metadata)) return null;
  const onboarding = metadata.onboarding;
  if (!isRecord(onboarding)) return null;
  const review = onboarding.review;
  if (!isRecord(review)) return null;
  const d = typeof review.decision === 'string' ? review.decision.trim().toLowerCase() : '';
  if (d === 'approved') return 'approved';
  if (d === 'rejected') return 'rejected';
  return null;
}

export function mergeReviewMetadata(
  metadata: unknown,
  input: {
    storedDecision: StoredReviewDecision;
    reviewNotes: string | null;
    reviewedAt: string;
    reviewerSource: string;
    reviewerLabel: string | null;
    reviewedByCodevertexUserId: string | null;
    previousTenantStatus: string;
    previousMembershipStatus: string | null;
  },
): Record<string, unknown> {
  const base = isRecord(metadata) ? { ...metadata } : {};
  const onboarding = isRecord(base.onboarding) ? { ...base.onboarding } : {};

  const reviewBlock = {
    decision: input.storedDecision,
    reviewed_at: input.reviewedAt,
    reviewed_by_codevertex_user_id: input.reviewedByCodevertexUserId,
    reviewer_source: input.reviewerSource,
    reviewer_label: input.reviewerLabel,
    previous_tenant_status: input.previousTenantStatus,
    previous_membership_status: input.previousMembershipStatus,
  };

  onboarding.review = reviewBlock;
  if (input.reviewNotes !== null) {
    onboarding.review_notes = input.reviewNotes;
  }

  base.onboarding = onboarding;
  return base;
}

export function parseReviewTenantBody(body: unknown):
  | { ok: true; input: Omit<ReviewTenantInput, 'reviewerSource' | 'reviewedByCodevertexUserId'> }
  | { ok: false; message: string } {
  if (!isRecord(body)) {
    return { ok: false, message: 'JSON body must be an object' };
  }

  const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id.trim() : '';
  if (!UUID_RE.test(tenantId)) {
    return { ok: false, message: 'tenant_id must be a valid UUID' };
  }

  const decisionRaw = typeof body.decision === 'string' ? body.decision.trim().toLowerCase() : '';
  if (decisionRaw !== 'approve' && decisionRaw !== 'reject') {
    return { ok: false, message: 'decision must be approve or reject' };
  }

  let reviewNotes: string | null = null;
  if (typeof body.review_notes === 'string') {
    const n = body.review_notes.trim();
    if (n.length > 2000) {
      return { ok: false, message: 'review_notes must be at most 2000 characters' };
    }
    reviewNotes = n || null;
  }

  let reviewerLabel: string | null = null;
  if (typeof body.reviewer_label === 'string') {
    const l = body.reviewer_label.trim();
    reviewerLabel = l || null;
  }

  return {
    ok: true,
    input: {
      tenantId,
      decision: decisionRaw,
      reviewNotes,
      reviewerLabel,
    },
  };
}

export function computeAccessPreview(
  tenantStatus: string,
  memberStatus: string,
  subscriptionStatus: string | null,
): ReviewTenantSuccess['access_preview'] {
  const billing = normalizeSubscriptionStatus(subscriptionStatus);
  const access_state = resolveRowAccessState(tenantStatus, memberStatus, billing);
  return {
    submitter_access_state: access_state,
    submitter_redirect_path: redirectPathForAccessState(access_state),
  };
}

export function buildAuthCoreHint(tenantId: string, decision: ReviewDecision): Record<string, unknown> {
  return {
    note: 'Auth Core not updated by FleetOS P1.',
    suggested_membership_status: decision === 'approve' ? 'active' : 'pending',
    fleetos_tenant_id: tenantId,
    fleetos_role: 'owner',
  };
}

function targetTenantStatus(decision: ReviewDecision): string {
  return decision === 'approve' ? 'active' : 'revoked';
}

function isIdempotentState(
  tenant: TenantRow,
  stored: StoredReviewDecision,
  requested: ReviewDecision,
): boolean {
  const apiStored = apiDecisionToStored(requested);
  if (stored !== apiStored) return false;
  if (requested === 'approve') {
    return tenant.status.trim().toLowerCase() === 'active';
  }
  return tenant.status.trim().toLowerCase() === 'revoked';
}

async function loadMembers(admin: SupabaseClient, tenantId: string): Promise<MemberRow[]> {
  const { data, error } = await admin
    .from('tenant_members')
    .select('id, role, status, codevertex_user_id, is_active')
    .eq('tenant_id', tenantId)
    .in('role', [...OWNER_ADMIN_ROLES]);

  if (error) throw new Error(error.message);
  return (data ?? []).map(raw => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r.id),
      role: String(r.role ?? ''),
      status: String(r.status ?? ''),
      codevertex_user_id: String(r.codevertex_user_id ?? ''),
      is_active: Boolean(r.is_active),
    };
  });
}

function pickSubmitter(members: MemberRow[], metadata: unknown): MemberRow | null {
  let submittedBy: string | null = null;
  if (isRecord(metadata) && isRecord(metadata.onboarding)) {
    const v = metadata.onboarding.submitted_by_codevertex_user_id;
    if (typeof v === 'string') submittedBy = v;
  }
  const pending = members.filter(m => m.status === 'pending' || m.status === 'invited');
  if (submittedBy) {
    const m = members.find(x => x.codevertex_user_id === submittedBy);
    if (m) return m;
  }
  return pending[0] ?? members[0] ?? null;
}

function buildSuccessPayload(
  tenant: TenantRow,
  membershipsUpdated: MembershipUpdated[],
  input: ReviewTenantInput,
  idempotent: boolean,
  onboardingReview: Record<string, unknown>,
): ReviewTenantSuccess {
  const submitter = membershipsUpdated[0];
  const memberStatus = submitter?.status ?? 'pending';
  const access_preview = computeAccessPreview(
    tenant.status,
    memberStatus,
    tenant.subscription_status,
  );

  return {
    decision: input.decision,
    idempotent,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      subscription_status: normalizeSubscriptionStatus(tenant.subscription_status),
    },
    memberships_updated: membershipsUpdated,
    onboarding_review: onboardingReview,
    access_preview,
  };
}

export async function reviewTenantApplication(
  admin: SupabaseClient,
  input: ReviewTenantInput,
): Promise<ReviewTenantResult> {
  const { data: tenantRaw, error: te } = await admin
    .from('tenants')
    .select('id, name, slug, status, subscription_status, metadata')
    .eq('id', input.tenantId)
    .maybeSingle();

  if (te) {
    return { ok: false, error: 'database_error', message: te.message, status: 500 };
  }
  if (!tenantRaw?.id) {
    return { ok: false, error: 'tenant_not_found', message: 'Tenant not found', status: 404 };
  }

  const tenant = tenantRaw as TenantRow;
  const existingStored = parseExistingReviewDecision(tenant.metadata);

  if (existingStored) {
    const existingApi = storedDecisionToApi(existingStored);
    if (existingApi !== input.decision) {
      return {
        ok: false,
        error: 'review_decision_conflict',
        message: `Application already ${existingStored}; cannot apply ${input.decision}`,
        status: 409,
      };
    }
    if (isIdempotentState(tenant, existingStored, input.decision)) {
      const members = await loadMembers(admin, tenant.id);
      const submitter = pickSubmitter(members, tenant.metadata);
      const onboardingRoot = isRecord(tenant.metadata) ? tenant.metadata.onboarding : null;
      const onboarding = isRecord(onboardingRoot) && isRecord(onboardingRoot.review)
        ? { ...onboardingRoot.review }
        : {};
      const membershipsUpdated: MembershipUpdated[] = submitter
        ? [{
          id: submitter.id,
          codevertex_user_id: submitter.codevertex_user_id,
          role: submitter.role,
          status: submitter.status,
          is_active: submitter.is_active,
        }]
        : [];
      return {
        ok: true,
        data: buildSuccessPayload(
          tenant,
          membershipsUpdated,
          input,
          true,
          isRecord(onboarding) ? onboarding : {},
        ),
      };
    }
  }

  const status = tenant.status.trim().toLowerCase();
  if (status !== 'pending_review') {
    return {
      ok: false,
      error: 'invalid_state_transition',
      message: `Tenant status is ${tenant.status}; expected pending_review`,
      status: 409,
    };
  }

  const membersBefore = await loadMembers(admin, tenant.id);
  const submitterBefore = pickSubmitter(membersBefore, tenant.metadata);
  const pendingOwners = membersBefore.filter(m =>
    m.status === 'pending' || m.status === 'invited'
  );

  if (input.decision === 'approve' && pendingOwners.length === 0) {
    return {
      ok: false,
      error: 'no_pending_submitter',
      message: 'No pending owner/admin membership to activate',
      status: 409,
    };
  }

  const reviewedAt = new Date().toISOString();
  const storedDecision = apiDecisionToStored(input.decision);
  const newMetadata = mergeReviewMetadata(tenant.metadata, {
    storedDecision,
    reviewNotes: input.reviewNotes,
    reviewedAt,
    reviewerSource: input.reviewerSource,
    reviewerLabel: input.reviewerLabel,
    reviewedByCodevertexUserId: input.reviewedByCodevertexUserId,
    previousTenantStatus: tenant.status,
    previousMembershipStatus: submitterBefore?.status ?? null,
  });

  const newTenantStatus = targetTenantStatus(input.decision);
  const previousMetadata = tenant.metadata;
  const previousTenantStatus = tenant.status;

  const { error: tenantErr } = await admin
    .from('tenants')
    .update({
      status: newTenantStatus,
      metadata: newMetadata,
      updated_at: reviewedAt,
    })
    .eq('id', tenant.id)
    .eq('status', 'pending_review');

  if (tenantErr) {
    return { ok: false, error: 'database_error', message: tenantErr.message, status: 500 };
  }

  tenant.status = newTenantStatus;
  tenant.metadata = newMetadata;

  const memberPatch =
    input.decision === 'approve'
      ? { status: 'active', is_active: true, updated_at: reviewedAt }
      : { status: 'suspended', is_active: false, updated_at: reviewedAt };

  const memberStatusFilter =
    input.decision === 'approve'
      ? ['pending', 'invited']
      : ['pending', 'invited', 'active'];

  const { data: updatedMembers, error: memberErr } = await admin
    .from('tenant_members')
    .update(memberPatch)
    .eq('tenant_id', tenant.id)
    .in('role', [...OWNER_ADMIN_ROLES])
    .in('status', memberStatusFilter)
    .select('id, role, status, codevertex_user_id, is_active');

  if (memberErr) {
    await admin
      .from('tenants')
      .update({
        status: previousTenantStatus,
        metadata: previousMetadata,
        updated_at: reviewedAt,
      })
      .eq('id', tenant.id);
    return { ok: false, error: 'database_error', message: memberErr.message, status: 500 };
  }

  const membershipsUpdated: MembershipUpdated[] = (updatedMembers ?? []).map(raw => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r.id),
      codevertex_user_id: String(r.codevertex_user_id ?? ''),
      role: String(r.role ?? ''),
      status: String(r.status ?? ''),
      is_active: Boolean(r.is_active),
    };
  });

  const onboardingReview =
    isRecord(newMetadata.onboarding) && isRecord(newMetadata.onboarding.review)
      ? { ...newMetadata.onboarding.review }
      : {};

  return {
    ok: true,
    data: buildSuccessPayload(tenant, membershipsUpdated, input, false, onboardingReview),
  };
}

export function buildReviewHttpBody(success: ReviewTenantSuccess): Record<string, unknown> {
  return {
    ok: true,
    decision: success.decision,
    idempotent: success.idempotent,
    tenant: success.tenant,
    memberships_updated: success.memberships_updated,
    onboarding_review: success.onboarding_review,
    access_preview: success.access_preview,
    auth_core: buildAuthCoreHint(success.tenant.id, success.decision),
  };
}
