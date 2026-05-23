import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mockDrivers } from '@/lib/mock-data';

export function DriversTab() {
  const available = mockDrivers.filter(d => d.availability === 'available');
  const busy = mockDrivers.filter(d => d.availability === 'busy');
  const off = mockDrivers.filter(d => d.availability === 'off');

  return (
    <div className="space-y-5">
      {[
        { label: 'Available', drivers: available, color: 'text-emerald-600', dot: 'bg-emerald-500' },
        { label: 'On Trip / Busy', drivers: busy, color: 'text-amber-600', dot: 'bg-amber-500' },
        { label: 'Off Duty', drivers: off, color: 'text-slate-500', dot: 'bg-slate-400' },
      ].map(group => (
        <div key={group.label}>
          <h3 className={cn('text-sm font-semibold flex items-center gap-2 mb-3', group.color)}>
            <span className={cn('w-2 h-2 rounded-full', group.dot)} />
            {group.label} ({group.drivers.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {group.drivers.map(d => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                  {d.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.assignedVehiclePlate || 'No vehicle'}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <a
                    href={`tel:${d.phone}`}
                    className="p-1.5 hover:bg-muted rounded border border-border transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                  {d.availability === 'available' && (
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                      Assign
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {group.drivers.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 py-2">
                None in this category.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
