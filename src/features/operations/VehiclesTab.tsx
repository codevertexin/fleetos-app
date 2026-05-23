import { Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mockVehicles } from '@/lib/mock-data';

export function VehiclesTab() {
  const available = mockVehicles.filter(v => v.status === 'available');
  const active = mockVehicles.filter(v => v.status === 'active');
  const maintenance = mockVehicles.filter(v => v.status === 'maintenance');
  const inactive = mockVehicles.filter(v => ['inactive', 'rented'].includes(v.status));

  return (
    <div className="space-y-5">
      {[
        { label: 'Available', vehicles: available, dot: 'bg-emerald-500' },
        { label: 'Active / On Trip', vehicles: active, dot: 'bg-blue-500' },
        { label: 'Maintenance', vehicles: maintenance, dot: 'bg-amber-500' },
        { label: 'Inactive / Rented', vehicles: inactive, dot: 'bg-slate-400' },
      ]
        .filter(g => g.vehicles.length > 0)
        .map(group => (
          <div key={group.label}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-foreground">
              <span className={cn('w-2 h-2 rounded-full', group.dot)} />
              {group.label} ({group.vehicles.length})
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {group.vehicles.map(v => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                >
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {v.brand} {v.model} · {v.plate}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {v.assignedDriverName || 'No driver'} · {v.odometer.toLocaleString()} km
                    </p>
                  </div>
                  {group.label === 'Available' && (
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2 shrink-0">
                      Assign
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
