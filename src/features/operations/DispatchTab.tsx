import { useState } from 'react';
import { Search, AlertTriangle, Clock, UserCheck, Car, Users, Phone, Plus, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mockDispatchBookings } from '@/lib/mock-data';
import type { DispatchBooking } from '@/lib/mock-data';
import { AssignModal } from './AssignModal';

function statusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    confirmed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    in_progress: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    completed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[status] || map.pending;
}

export function DispatchTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigningBooking, setAssigningBooking] = useState<DispatchBooking | null>(null);

  const filtered = mockDispatchBookings.filter(b => {
    const matchSearch =
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.pickupAddress.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending = mockDispatchBookings.filter(b => b.status === 'pending').length;
  const urgent = mockDispatchBookings.filter(b => b.urgent).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: mockDispatchBookings.length, color: 'text-foreground' },
          { label: 'Pending', value: pending, color: 'text-amber-600' },
          { label: 'Urgent', value: urgent, color: 'text-red-600' },
          {
            label: 'Active',
            value: mockDispatchBookings.filter(b => b.status === 'in_progress').length,
            color: 'text-emerald-600',
          },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search customer, address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
        </select>
        <Button size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Quick Book
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.map(b => (
          <Card
            key={b.id}
            className={cn('transition-all', b.urgent && 'border-red-300 dark:border-red-800/50')}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {b.urgent && (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                        <AlertTriangle className="w-3 h-3" />URGENT
                      </span>
                    )}
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor(b.status))}>
                      {b.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />{b.passengerCount} pax
                    </span>
                  </div>
                  <p className="font-semibold text-foreground text-sm">{b.customerName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(b.scheduledAt).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      {b.pickupAddress}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                      {b.dropoffAddress}
                    </p>
                  </div>
                  {(b.driverName || b.vehiclePlate) && (
                    <div className="flex gap-3 mt-2">
                      {b.driverName && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />{b.driverName}
                        </span>
                      )}
                      {b.vehiclePlate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Car className="w-3 h-3" />{b.vehiclePlate}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-semibold text-foreground">€{b.price}</span>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${b.customerPhone}`}
                      className="p-1.5 hover:bg-muted rounded-lg border border-border transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                    {['pending', 'assigned'].includes(b.status) && (
                      <Button size="sm" onClick={() => setAssigningBooking(b)}>
                        {b.status === 'pending' ? 'Assign' : 'Reassign'}
                      </Button>
                    )}
                    {b.status === 'in_progress' && (
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-600">
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No bookings match your filters.</p>
          </div>
        )}
      </div>

      {assigningBooking && (
        <AssignModal booking={assigningBooking} onClose={() => setAssigningBooking(null)} />
      )}
    </div>
  );
}
