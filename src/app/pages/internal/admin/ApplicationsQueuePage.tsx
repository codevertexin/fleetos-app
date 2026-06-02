import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ClipboardList, RefreshCw } from 'lucide-react';
import { ApplicationReviewModal } from '@/components/internal/admin/ApplicationReviewModal';
import { PlatformAdminShell } from '@/components/internal/admin/PlatformAdminShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import {
  AdminBffError,
  deleteAdminSession,
  fetchAdminSession,
  listAdminApplications,
  reviewAdminTenant,
} from '@/lib/services/fleetos-admin-bff.service';
import type { AdminApplicationItem } from '@/types/fleetos-admin-applications';

function ApplicationCard({
  item,
  onSelect,
}: {
  item: AdminApplicationItem;
  onSelect: (item: AdminApplicationItem) => void;
}) {
  const { tenant, onboarding, submitter_membership: submitter } = item;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-[#00B39A]/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B39A]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-[#00B39A]" />
            <h3 className="font-semibold text-foreground truncate">{tenant.name}</h3>
            <Badge className="bg-amber-500/15 text-amber-200 border border-amber-500/30">
              Pending Review
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">@{tenant.slug}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {tenant.submitted_at ? formatDateTime(tenant.submitted_at) : '—'}
        </span>
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Legal name</dt>
          <dd className="truncate">{onboarding?.legal_name?.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Tax ID</dt>
          <dd className="truncate">{onboarding?.tax_id?.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Country</dt>
          <dd>{onboarding?.country_code?.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Submitter</dt>
          <dd className="truncate font-mono text-xs">
            {submitter?.codevertex_user_id ?? onboarding?.submitted_by_codevertex_user_id ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Member status</dt>
          <dd>{submitter?.status ?? '—'}</dd>
        </div>
      </dl>
    </button>
  );
}

export default function ApplicationsQueuePage() {
  const navigate = useNavigate();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [items, setItems] = useState<AdminApplicationItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminApplicationItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    navigate('/internal/admin/login', { replace: true });
  }, [navigate]);

  const loadApplications = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await listAdminApplications({ status: 'pending_review', limit: 50 });
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (err) {
      if (err instanceof AdminBffError && err.status === 401) {
        redirectToLogin();
        return;
      }
      setLoadError(
        err instanceof AdminBffError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not load applications.',
      );
    }
  }, [redirectToLogin]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await fetchAdminSession();
        if (cancelled) return;
        if (!session.authenticated) {
          redirectToLogin();
          return;
        }
        setAuthChecking(false);
        await loadApplications();
      } catch {
        if (!cancelled) redirectToLogin();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadApplications, redirectToLogin]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  }, [loadApplications]);

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    try {
      await deleteAdminSession();
    } catch {
      // still redirect
    } finally {
      setLogoutLoading(false);
      redirectToLogin();
    }
  }, [redirectToLogin]);

  const openReview = useCallback((item: AdminApplicationItem) => {
    setSelected(item);
    setReviewError(null);
    setReviewSuccess(null);
    setModalOpen(true);
  }, []);

  const closeReview = useCallback(() => {
    if (reviewBusy) return;
    setModalOpen(false);
    setSelected(null);
    setReviewError(null);
    setReviewSuccess(null);
  }, [reviewBusy]);

  const handleReview = useCallback(
    async (decision: 'approve' | 'reject', reviewNotes: string) => {
      if (!selected?.tenant?.id) return { decision, idempotent: false };
      setReviewBusy(true);
      setReviewError(null);
      setReviewSuccess(null);

      try {
        const res = await reviewAdminTenant({
          tenant_id: selected.tenant.id,
          decision,
          review_notes: reviewNotes || undefined,
        });

        const label = decision === 'approve' ? 'approved' : 'rejected';
        const msg = res.idempotent
          ? `Application was already ${label}.`
          : `Application ${label} successfully.`;

        setReviewSuccess(msg);
        setItems((prev) => prev.filter((row) => row.tenant.id !== selected.tenant.id));

        window.setTimeout(() => {
          setModalOpen(false);
          setSelected(null);
          setReviewSuccess(null);
        }, 1200);

        return { idempotent: res.idempotent, decision: res.decision };
      } catch (err) {
        if (err instanceof AdminBffError) {
          if (err.status === 401) {
            redirectToLogin();
            return { decision, idempotent: false };
          }
          if (err.status === 409) {
            setReviewError(
              err.message ||
                'This application was already reviewed with a different decision.',
            );
          } else {
            setReviewError(err.message);
          }
        } else {
          setReviewError(err instanceof Error ? err.message : 'Review failed.');
        }
        throw err;
      } finally {
        setReviewBusy(false);
      }
    },
    [redirectToLogin, selected],
  );

  if (authChecking || loading) {
    return (
      <PlatformAdminShell title="Applications">
        <div className="flex min-h-[40vh] items-center justify-center" role="status">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00B39A] border-t-transparent" />
        </div>
      </PlatformAdminShell>
    );
  }

  return (
    <PlatformAdminShell
      title="Company applications"
      subtitle="Review pending company onboarding requests."
      onLogout={() => void handleLogout()}
      logoutLoading={logoutLoading}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          <span>{items.length} pending</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={refreshing}
          onClick={() => void handleRefresh()}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loadError ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Could not load queue</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={() => void handleRefresh()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No pending applications</CardTitle>
            <CardDescription>
              The review queue is empty. New submissions will appear here after company
              onboarding.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <ApplicationCard
              key={item.tenant.id}
              item={item}
              onSelect={openReview}
            />
          ))}
        </div>
      )}

      <ApplicationReviewModal
        key={selected?.tenant.id ?? 'review-closed'}
        item={selected}
        open={modalOpen}
        onClose={closeReview}
        onReview={handleReview}
        busy={reviewBusy}
        error={reviewError}
        success={reviewSuccess}
      />
    </PlatformAdminShell>
  );
}
