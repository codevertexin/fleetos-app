import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Car } from 'lucide-react';
import { VehicleFormModal } from '@/components/app/vehicles/VehicleFormModal';
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
import { canManageFleetVehicles } from '@/lib/fleet-vehicle-permissions';
import { listMockFleetVehicles } from '@/lib/vehicle-mock-adapter';
import {
  createFleetVehicle,
  deactivateFleetVehicle,
  FleetosVehiclesError,
  isFleetosVehiclesConfigured,
  listFleetVehicles,
  shouldUseVehicleMockData,
  updateFleetVehicle,
} from '@/lib/services/fleetos-vehicles.service';
import { formatDateTime, formatStatus } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantProvider';
import type { FleetosVehicleRecord } from '@/types/fleetos-vehicle';

export default function VehiclesListPage() {
  const { codevertexEdgeJwt } = useAuth();
  const { currentTenant } = useTenant();

  const [vehicles, setVehicles] = useState<FleetosVehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<FleetosVehicleRecord | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const tenantId = currentTenant?.id ?? null;
  const canManage = canManageFleetVehicles(currentTenant?.membershipRole);
  const useMock = shouldUseVehicleMockData();
  const apiReady = isFleetosVehiclesConfigured();

  const load = useCallback(async () => {
    if (!tenantId) {
      setVehicles([]);
      setLoadError('No workspace selected.');
      return;
    }

    setLoadError(null);
    if (useMock) {
      setVehicles(listMockFleetVehicles(tenantId));
      return;
    }

    const jwt = codevertexEdgeJwt?.trim();
    if (!jwt) {
      setLoadError('Session expired. Please sign in again.');
      return;
    }
    if (!apiReady) {
      setLoadError('Vehicles API is not configured for this environment.');
      return;
    }

    try {
      const rows = await listFleetVehicles(jwt, tenantId, { limit: 100 });
      setVehicles(rows);
    } catch (err) {
      if (err instanceof FleetosVehiclesError && err.status === 401) {
        setLoadError('Unauthorized. Please sign in again.');
      } else if (err instanceof FleetosVehiclesError && err.status === 403) {
        setLoadError('You do not have access to this workspace fleet.');
      } else {
        setLoadError(err instanceof Error ? err.message : 'Could not load vehicles.');
      }
    }
  }, [apiReady, codevertexEdgeJwt, tenantId, useMock]);

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
    return vehicles.filter((v) => {
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      const hay = `${v.plate} ${v.brand} ${v.model} ${v.vin ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [vehicles, search, statusFilter]);

  const openCreate = () => {
    setFormMode('create');
    setSelected(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (v: FleetosVehicleRecord) => {
    setFormMode('edit');
    setSelected(v);
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload: Record<string, unknown>) => {
    if (!tenantId || useMock) {
      setFormError(useMock ? 'Disable mock mode to save to the API.' : 'No tenant selected.');
      return;
    }
    const jwt = codevertexEdgeJwt?.trim();
    if (!jwt) {
      setFormError('Session expired.');
      return;
    }

    setFormBusy(true);
    setFormError(null);
    setActionMessage(null);

    try {
      if (formMode === 'create') {
        const created = await createFleetVehicle(jwt, tenantId, payload);
        setVehicles((prev) => [created, ...prev]);
        setActionMessage(`Vehicle ${created.plate} created.`);
      } else if (selected) {
        const updated = await updateFleetVehicle(jwt, tenantId, selected.id, payload);
        setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        setActionMessage(`Vehicle ${updated.plate} updated.`);
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

  const handleDeactivate = async (v: FleetosVehicleRecord) => {
    if (!tenantId || useMock) return;
    const jwt = codevertexEdgeJwt?.trim();
    if (!jwt) return;
    if (!window.confirm(`Deactivate ${v.plate}? It will be removed from the active fleet list.`)) {
      return;
    }

    setFormBusy(true);
    setActionMessage(null);
    try {
      const { idempotent } = await deactivateFleetVehicle(jwt, tenantId, v.id);
      setVehicles((prev) => prev.filter((row) => row.id !== v.id));
      setActionMessage(
        idempotent ? `${v.plate} was already deactivated.` : `${v.plate} deactivated.`,
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
          <h1 className="text-xl sm:text-2xl font-bold">Vehicles</h1>
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
              Add vehicle
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
            placeholder="Search plate, brand, model…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'available', 'maintenance', 'rented', 'inactive'].map((s) => (
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

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">No vehicles found.</Card>
        ) : (
          filtered.map((v) => (
            <Card key={v.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono font-semibold">{v.plate}</p>
                  <p className="text-sm text-muted-foreground">
                    {v.brand} {v.model}
                    {v.year ? ` · ${v.year}` : ''}
                  </p>
                </div>
                <StatusBadge status={v.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {v.odometer_km.toLocaleString()} km · {formatDateTime(v.created_at)}
              </p>
              {canManage && !useMock ? (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openEdit(v)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={formBusy}
                    onClick={() => void handleDeactivate(v)}
                  >
                    Deactivate
                  </Button>
                </div>
              ) : null}
            </Card>
          ))
        )}
      </div>

      {/* Tablet/desktop table */}
      <Card className="hidden md:block overflow-hidden">
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Plate</TableHeaderCell>
              <TableHeaderCell>Vehicle</TableHeaderCell>
              <TableHeaderCell>Year</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Odometer</TableHeaderCell>
              <TableHeaderCell>Added</TableHeaderCell>
              {canManage && !useMock ? <TableHeaderCell /> : null}
            </tr>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage && !useMock ? 7 : 6}>
                  <EmptyState
                    icon={<Car className="w-8 h-8" />}
                    title="No vehicles found"
                    description="Add your first vehicle to start building the fleet."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <span className="font-mono font-medium">{v.plate}</span>
                  </TableCell>
                  <TableCell>
                    {v.brand} {v.model}
                  </TableCell>
                  <TableCell>{v.year ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell>{v.odometer_km.toLocaleString()} km</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {v.created_at ? formatDateTime(v.created_at) : '—'}
                  </TableCell>
                  {canManage && !useMock ? (
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(v)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={formBusy}
                          onClick={() => void handleDeactivate(v)}
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

      <VehicleFormModal
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
