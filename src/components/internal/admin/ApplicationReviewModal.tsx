import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import type { AdminApplicationItem } from '@/types/fleetos-admin-applications';

interface ApplicationReviewModalProps {
  item: AdminApplicationItem | null;
  open: boolean;
  onClose: () => void;
  onReview: (
    decision: 'approve' | 'reject',
    reviewNotes: string,
  ) => Promise<{ idempotent?: boolean; decision: string }>;
  busy?: boolean;
  error?: string | null;
  success?: string | null;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground break-all">{value?.trim() || '—'}</dd>
    </div>
  );
}

export function ApplicationReviewModal({
  item,
  open,
  onClose,
  onReview,
  busy,
  error,
  success,
}: ApplicationReviewModalProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const tenant = item?.tenant;
  const onboarding = item?.onboarding;
  const submitter = item?.submitter_membership;

  const handleDecision = async (decision: 'approve' | 'reject') => {
    setLocalError(null);
    const notes = reviewNotes.trim();
    if (decision === 'reject' && !notes) {
      setLocalError('Review notes are required when rejecting an application.');
      return;
    }
    await onReview(decision, notes);
  };

  const displayError = localError || error;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tenant?.name ?? 'Application'}
      description={tenant?.slug ? `@${tenant.slug}` : undefined}
      size="xl"
    >
      {item ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-500/15 text-amber-200 border border-amber-500/30">
              Pending Review
            </Badge>
            {submitter?.status ? (
              <Badge variant="outline">Member: {submitter.status}</Badge>
            ) : null}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name" value={onboarding?.legal_name ?? undefined} />
            <Field label="Tax ID" value={onboarding?.tax_id ?? undefined} />
            <Field label="Country" value={onboarding?.country_code ?? undefined} />
            <Field
              label="Submitted at"
              value={
                tenant?.submitted_at
                  ? formatDateTime(tenant.submitted_at)
                  : onboarding?.submitted_at
                    ? formatDateTime(onboarding.submitted_at)
                    : undefined
              }
            />
            <Field
              label="Submitter (CodeVertex user)"
              value={submitter?.codevertex_user_id ?? onboarding?.submitted_by_codevertex_user_id ?? undefined}
            />
            <Field label="Member role" value={submitter?.role} />
          </dl>

          <Textarea
            label="Review notes"
            placeholder="Optional for approve; required for reject."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={4}
            disabled={busy}
          />

          {displayError ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-lg border border-[#00B39A]/40 bg-[#00B39A]/10 px-3 py-2 text-sm text-[#00B39A]">
              {success}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={busy}
              onClick={() => void handleDecision('reject')}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={busy}
              onClick={() => void handleDecision('approve')}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
