import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Car,
  ClipboardList,
  ExternalLink,
  HelpCircle,
  LayoutDashboard,
  Mail,
  RefreshCw,
  Users,
  BarChart3,
  Route,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { readAccessRedirect } from '@/lib/access-routing';
import { getHelpUrl } from '@/lib/platformLinks';
import {
  PREVIEW_DEMO_LABEL,
  previewBookings,
  previewChartMonths,
  previewDispatchSteps,
  previewDrivers,
  previewKpis,
  previewReports,
  previewTutorials,
  previewVehicles,
} from '@/lib/preview-workspace-mock';
import { fetchMyAccess, isGetMyAccessConfigured } from '@/lib/services/fleetos-access.service';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthProvider';

function SampleBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
      {PREVIEW_DEMO_LABEL}
    </span>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[#00B39A]/10 p-2">
              <Icon className="h-4 w-4 text-[#00B39A]" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <SampleBadge />
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export default function PreviewWorkspacePage() {
  const navigate = useNavigate();
  const { user, logout, codevertexEdgeJwt, operationalAccess, patchOperationalAccess } =
    useAuth();
  const dashboardRef = useRef<HTMLElement>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const companyName = operationalAccess?.tenant?.name?.trim() || null;
  const helpUrl = getHelpUrl({ screenCode: 'dashboard', moduleCode: 'fleetos' });

  const scrollToDashboard = useCallback(() => {
    dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleRefreshStatus = useCallback(async () => {
    setStatusMessage(null);
    setStatusError(null);
    const jwt = codevertexEdgeJwt?.trim();
    if (!jwt) {
      setStatusError('Session expired. Please sign in again.');
      return;
    }
    if (!isGetMyAccessConfigured()) {
      setStatusError('Status refresh is not configured for this environment.');
      return;
    }
    setRefreshing(true);
    try {
      const access = await fetchMyAccess(jwt);
      patchOperationalAccess(access);
      if (access.accessState !== 'pending_review') {
        navigate(readAccessRedirect(access), { replace: true });
        return;
      }
      setStatusMessage('Your application is still under review. Explore the demo workspace below.');
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Could not refresh application status.');
    } finally {
      setRefreshing(false);
    }
  }, [codevertexEdgeJwt, navigate, patchOperationalAccess]);

  const maxRevenue = Math.max(...previewChartMonths.map(m => m.revenue), 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="FleetOS" className="h-9 w-9" />
            <div>
              <p className="text-sm font-semibold text-foreground">FleetOS Preview</p>
              <p className="text-xs text-muted-foreground">Simulated workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.email ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div
          className="rounded-xl border border-[#00B39A]/25 bg-gradient-to-br from-[#00B39A]/10 via-background to-amber-500/5 p-5 sm:p-6"
          role="status"
        >
          <div className="flex flex-wrap items-start gap-3">
            <div className="rounded-full bg-amber-500/15 p-2">
              <ClipboardList className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                Application under review
              </h1>
              {companyName ? (
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">Company:</span>{' '}
                  <span className="font-medium">{companyName}</span>
                </p>
              ) : null}
              <p className="max-w-2xl text-sm text-muted-foreground">
                Explore simulated dashboards, sample fleet data, tutorials, and support while we
                review your company application. Nothing on this page is written to your live
                workspace — all figures are clearly marked as demo data.
              </p>
            </div>
            <SampleBadge />
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" size="sm" onClick={scrollToDashboard}>
              <LayoutDashboard className="h-4 w-4" />
              View sample dashboard
            </Button>
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center justify-center gap-2 rounded-lg bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <BookOpen className="h-4 w-4" />
              Learn how FleetOS works
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Mail className="h-4 w-4" />
              Contact support
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={refreshing}
              onClick={() => void handleRefreshStatus()}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh application status
            </Button>
          </div>

          {statusMessage ? (
            <p className="mt-3 text-sm text-[#00B39A]" role="status">
              {statusMessage}
            </p>
          ) : null}
          {statusError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {statusError}
            </p>
          ) : null}
        </div>

        <section id="preview-dashboard" ref={dashboardRef} className="scroll-mt-24">
          <SectionCard
            icon={LayoutDashboard}
            title="Simulated dashboard overview"
            description="Example KPIs and trend — not connected to your tenant."
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Active vehicles', value: String(previewKpis.activeVehicles) },
                { label: 'Active drivers', value: String(previewKpis.activeDrivers) },
                { label: 'Bookings today', value: String(previewKpis.bookingsToday) },
                { label: 'Utilization', value: `${previewKpis.utilizationPct}%` },
              ].map(kpi => (
                <div
                  key={kpi.label}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{kpi.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-dashed border-border p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Revenue trend (demo) — {formatCurrency(previewKpis.monthlyRevenueEur)} latest month
              </p>
              <div className="flex h-24 items-end gap-2">
                {previewChartMonths.map(m => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full max-w-[2.5rem] rounded-t bg-[#00B39A]/70"
                      style={{ height: `${Math.round((m.revenue / maxRevenue) * 100)}%`, minHeight: 8 }}
                      title={formatCurrency(m.revenue)}
                    />
                    <span className="text-[9px] text-muted-foreground">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            icon={Car}
            title="Sample vehicles"
            description="Illustrative fleet units for preview only."
          >
            <ul className="divide-y divide-border">
              {previewVehicles.map(v => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                  <div>
                    <p className="font-medium text-foreground">{v.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.plate} · {v.driver}
                    </p>
                  </div>
                  <StatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            icon={Users}
            title="Sample drivers"
            description="Example roster — no real driver records."
          >
            <ul className="divide-y divide-border">
              {previewDrivers.map(d => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                  <div>
                    <p className="font-medium text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.vehicle} · ★ {d.rating.toFixed(1)} (demo)
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            icon={Route}
            title="Example bookings & dispatch"
            description="How trips flow through FleetOS after approval."
          >
            <ul className="space-y-3">
              {previewBookings.map(b => (
                <li
                  key={b.id}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{b.reference}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 font-medium text-foreground">{b.customer}</p>
                  <p className="text-xs text-muted-foreground">{b.route}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(b.scheduledAt)}
                  </p>
                </li>
              ))}
            </ul>
            <ol className="mt-4 space-y-2 border-t border-border pt-4">
              {previewDispatchSteps.map(s => (
                <li key={s.step} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00B39A]/15 text-xs font-bold text-[#00B39A]">
                    {s.step}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard
            icon={BarChart3}
            title="Reports preview"
            description="Sample analytics — unlock live reports after approval & subscription."
          >
            <ul className="space-y-3">
              {previewReports.map(r => (
                <li
                  key={r.label}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.trend}</p>
                  </div>
                  <p className="text-lg font-bold text-[#00B39A]">{r.value}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            icon={BookOpen}
            title="Tutorials & getting started"
            description="Prepare your team before the workspace goes live."
          >
            <ul className="space-y-3">
              {previewTutorials.map(t => (
                <li key={t.id}>
                  <a
                    href={helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-border px-3 py-3 transition-colors hover:border-[#00B39A]/40 hover:bg-muted/30"
                  >
                    <p className="font-medium text-foreground">{t.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-[#00B39A]">
                      {t.duration} · CodeVertex Help
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            icon={HelpCircle}
            title="Contact support"
            description="Questions about your application or FleetOS setup."
          >
            <p className="text-sm text-muted-foreground">
              Our team can help with onboarding, billing, and technical setup. Use CodeVertex Help
              while your application is reviewed — include your company name
              {companyName ? ` (${companyName})` : ''} for faster routing.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href={helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-[#00B39A] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#009B85]"
              >
                Open help center
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Button type="button" variant="outline" className="sm:flex-1" onClick={scrollToDashboard}>
                Back to demo dashboard
              </Button>
            </div>
          </SectionCard>
        </div>

        <p className="pb-6 text-center text-[10px] text-muted-foreground">
          Protected account access by CodeVertex · Preview workspace (no operational writes)
        </p>
      </main>
    </div>
  );
}
