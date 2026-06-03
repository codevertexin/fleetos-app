import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Users } from 'lucide-react';
import { DriverFormModal } from '@/components/app/drivers/DriverFormModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  EmptyState,
} from '@/components/ui/table';
import {
  EDGE_SESSION_EXPIRED_MESSAGE,
  isCodevertexEdgeJwtValid,
} from '@/lib/codevertex-edge-jwt';
import { canManageFleetDrivers } from '@/lib/fleet-driver-permissions';
import { listMockFleetDrivers } from '@/lib/driver-mock-adapter';
import {
  createFleetDriver,
  deactivateFleetDriver,
  FleetosDriversError,
  isFleetosDriversConfigured,
  listFleetDrivers,
  shouldUseDriverMockData,
  updateFleetDriver,
} from '@/lib/services/fleetos-drivers.service';
import { formatDateTime, formatStatus } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantProvider';
import type { FleetosDriverRecord } from '@/types/fleetos-driver';

export default function DriversListPage() {
  const { codevertexEdgeJwt, codevertexEdgeJwtExpiresAt } = useAuth();
  const { currentTenant } = useTenant();

  const [drivers, setDrivers] = useState<FleetosDriverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<FleetosDriverRecord | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const tenantId = currentTenant?.id ?? null;
  const canManage = canManageFleetDrivers(currentTenant?.membershipRole);
  const useMock = shouldUseDriverMockData();
  const apiReady = isFleetosDriversConfigured();

  const load = useCallback(async () => {
    if (!tenantId) {
      setDrivers([]);
      setLoadError('No workspace selected.');
      return;
    }

    setLoadError(null);
    if (useMock) {
      setDrivers(listMockFleetDrivers(tenantId));
      return;
    }

    const jwt = codevertexEdgeJwt?.trim();
    if (!jwt || !isCodevertexEdgeJwtValid(jwt, codevertexEdgeJwtExpiresAt)) {
      setLoadError(EDGE_SESSION_EXPIRED_MESSAGE);
      return;
    }
    if (!apiReady) {
      setLoadError('Drivers API is not configured for this environment.');
      return;
    }

    try {
      const rows = await listFleetDrivers(jwt, tenantId, {
        limit: 100,
        expiresAt: codevertexEdgeJwtExpiresAt,
      });
      setDrivers(rows);
    } catch (err) {
      if (
        err instanceof FleetosDriversError &&
        (err.status === 401 || err.code === 'session_expired')
      ) {
        setLoadError(EDGE_SESSION_EXPIRED_MESSAGE);
      } else if (err instanceof FleetosDriversError && err.status === 403) {
        setLoadError('You do not have access to this workspace fleet.');
      } else {
        setLoadError(err instanceof Error ? err.message : 'Could not load drivers.');
      }
    }
  }, [apiReady, codevertexEdgeJwt, codevertexEdgeJwtExpiresAt, tenantId, useMock]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      const hay = `${d.full_name} ${d.phone ?? ''} ${d.email ?? ''} ${d.tax_id ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [drivers, search, statusFilter]);

  const openCreate = () => {
    setFormMode('create');
    setSelected(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (d: FleetosDriverRecord) => {
    setFormMode('edit');
    setSelected(d);
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload: Record<string, unknown>) => {
    if (!tenantId || useMock) {
      setFormError(useMock ? 'Disable mock mode to save to the API.' : 'No tenant selected.');
      return;
    }
    const jwt = codevertexEdgeJwt?.trim();
    if (!jwt || !isCodevertexEdgeJwtValid(jwt, codevertexEdgeJwtExpiresAt)) {
      setFormError(EDGE_SESSION_EXPIRED_MESSAGE);
      return;
    }
    const edgeOpts = { expiresAt: codevertexEdgeJwtExpiresAt };

    setFormBusy(true);
    setFormError(null);
    setActionMessage(null);

    try {
      if (formMode === 'create') {
        const created = await createFleetDriver(jwt, tenantId, payload, edgeOpts);
        setDrivers((prev) => [created, ...prev]);
        setActionMessage(`${created.full_name} created.`);
      } else if (selected) {
        const updated = await updateFleetDriver(jwt, tenantId, selected.id, payload, edgeOpts);
        setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        setActionMessage(`${updated.full_name} updated.`);
      }
      setFormOpen(false);
      setSelected(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.');
      throw err;
    } finally {
      setFormBusy(false);
    }
  };

  const handleDeactivate = async (d: FleetosDriverRecord) => {
    if (!tenantId || useMock) return;
    const jwt = codevertexEdgeJwt?.trim();
    if (!jwt || !isCodevertexEdgeJwtValid(jwt, codevertexEdgeJwtExpiresAt)) {
      setLoadError(EDGE_SESSION_EXPIRED_MESSAGE);
      return;
    }
    if (!window.confirm(`Deactivate ${d.full_name}? They will be removed from the active driver list.`)) {
      return;
    }

    setFormBusy(true);
    setActionMessage(null);
    try {
      const { idempotent } = await deactivateFleetDriver(jwt, tenantId, d.id, {
        expiresAt: codevertexEdgeJwtExpiresAt,
      });
      setDrivers((prev) => prev.filter((row) => row.id !== d.id));
      setActionMessage(
        idempotent ? `${d.full_name} was already deactivated.` : `${d.full_name} deactivated.`,
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Deactivate failed.');
    } finally {
      setFormBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00B39A] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Drivers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} in fleet
            {useMock ? (
              <Badge className="ml-2 bg-amber-500/15 text-amber-800 dark:text-amber-300">
                Mock data
              </Badge>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" loading={refreshing} onClick={() => void handleRefresh()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {canManage ? (
            <Button type="button" size="sm" onClick={openCreate} disabled={useMock || !apiReady}>
              <Plus className="h-4 w-4" />
              Add driver
            </Button>
          ) : null}
        </div>
      </div>

      {actionMessage ? (
        <p className="rounded-lg border border-[#00B39A]/40 bg-[#00B39A]/10 px-3 py-2 text-sm text-[#00B39A]">
          {actionMessage}
        </p>
      ) : null}

      {loadError ? (
        <Card className="p-4 border-destructive/40">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void handleRefresh()}>
            Try again
          </Button>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'available', 'on_trip', 'off_duty', 'inactive'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-[#00B39A] text-white border-[#00B39A]'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {formatStatus(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">No drivers found.</Card>
        ) : (
          filtered.map((d) => (
            <Card key={d.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{d.full_name}</p>
                  <p className="text-sm text-muted-foreground">{d.phone ?? d.email ?? '—'}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {d.availability ? formatStatus(d.availability) : '—'} · {formatDateTime(d.created_at)}
              </p>
              {canManage && !useMock ? (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openEdit(d)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={formBusy}
                    onClick={() => void handleDeactivate(d)}
                  >
                    Deactivate
                  </Button>
                </div>
              ) : null}
            </Card>
          ))
        )}
      </div>

      <Card className="hidden md:block overflow-hidden">
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Contact</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Availability</TableHeaderCell>
              <TableHeaderCell>License</TableHeaderCell>
              <TableHeaderCell>Added</TableHeaderCell>
              {canManage && !useMock ? <TableHeaderCell /> : null}
            </tr>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage && !useMock ? 7 : 6}>
                  <EmptyState
                    icon={<Users className="w-8 h-8" />}
                    title="No drivers found"
                    description="Add your first driver to start building the fleet."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <span className="font-medium">{d.full_name}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.phone ?? '—'}
                    {d.email ? (
                      <>
                        <br />
                        <span className="text-xs">{d.email}</span>
                      </>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell>{d.availability ? formatStatus(d.availability) : '—'}</TableCell>
                  <TableCell className="text-sm">{d.license_expires_at ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {d.created_at ? formatDateTime(d.created_at) : '—'}
                  </TableCell>
                  {canManage && !useMock ? (
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(d)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={formBusy}
                          onClick={() => void handleDeactivate(d)}
                        >
                          Deactivate
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <DriverFormModal
        key={selected?.id ?? 'create'}
        open={formOpen}
        mode={formMode}
        initial={selected}
        onClose={() => {
          if (formBusy) return;
          setFormOpen(false);
          setSelected(null);
          setFormError(null);
        }}
        onSubmit={handleFormSubmit}
        busy={formBusy}
        error={formError}
      />
    </div>
  );
}
