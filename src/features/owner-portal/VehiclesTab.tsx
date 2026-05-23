import { Card, CardContent } from '@/components/ui/card';
import { mockOwnerVehicles, mockContracts } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { docStatusBadge } from './badges';

export function VehiclesTab() {
  const ownerContracts = mockContracts.filter(
    c => c.type === 'rental' && mockOwnerVehicles.some(v => v.id === c.vehicleId),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {mockOwnerVehicles.map(v => {
          const contract = ownerContracts.find(c => c.vehicleId === v.id);
          return (
            <Card key={v.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {v.brand} {v.model} {v.year}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {v.plate} · {v.color} · {v.fuel}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {docStatusBadge(v.documentStatus)}
                    <span
                      className={cn('px-2 py-0.5 rounded-full text-xs font-medium', {
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':
                          v.status === 'active',
                        'bg-amber-100 text-amber-700': v.status === 'maintenance',
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400':
                          ['inactive', 'available'].includes(v.status),
                      })}
                    >
                      {v.status}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center bg-muted/40 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {v.odometer.toLocaleString()} km
                    </p>
                    <p className="text-xs text-muted-foreground">Odometer</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {v.assignedDriverName || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Driver</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {contract ? `€${contract.value}/mo` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Contract</p>
                  </div>
                </div>
                {contract && (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Contract: {contract.startDate} → {contract.endDate}
                    </span>
                    <span
                      className={cn('px-2 py-0.5 rounded-full font-medium', {
                        'bg-emerald-100 text-emerald-700': contract.status === 'active',
                        'bg-red-100 text-red-700': contract.status === 'expired',
                      })}
                    >
                      {contract.status}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
