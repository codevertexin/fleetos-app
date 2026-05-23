import { useState } from 'react';
import { MapPin, Clock, Users, Phone, Navigation, ChevronRight, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mockBookings } from '@/lib/mock-data';
import type { Booking } from '@/types/index';

const myBookings = mockBookings.filter(b => b.driverId === 'd1');

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

function AssignmentDetail({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor(booking.status))}>
          {booking.status.replace('_', ' ')}
        </span>
      </div>

      <h2 className="text-xl font-bold text-foreground">Trip #{booking.id.toUpperCase()}</h2>

      {/* Customer */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
              {booking.customerName.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <p className="font-semibold text-foreground">{booking.customerName}</p>
              <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
            </div>
          </div>
          <a href={`tel:${booking.customerPhone}`} className="p-2.5 bg-muted rounded-xl border border-border hover:bg-muted/80 transition-colors">
            <Phone className="w-4 h-4 text-muted-foreground" />
          </a>
        </CardContent>
      </Card>

      {/* Route */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div className="w-px h-8 bg-border" />
              <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-500" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">PICKUP</p>
                <p className="text-sm font-medium text-foreground">{booking.pickupAddress}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">DROP-OFF</p>
                <p className="text-sm font-medium text-foreground">{booking.dropoffAddress}</p>
              </div>
            </div>
          </div>
          <Button className="w-full gap-2" variant="outline">
            <Navigation className="w-4 h-4" /> Open in Maps
          </Button>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-4">
          {[
            { label: 'Scheduled', value: new Date(booking.scheduledAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) },
            { label: 'Passengers', value: `${booking.passengerCount} pax` },
            { label: 'Est. Duration', value: `${booking.estimatedDuration} min` },
            { label: 'Price', value: `€${booking.price}` },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className="text-sm font-semibold text-foreground">{f.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {booking.notes && (
        <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">{booking.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {booking.status === 'confirmed' && (
        <div className="space-y-2">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Start Trip</Button>
          <Button variant="outline" className="w-full text-red-600 border-red-200 dark:border-red-800/40">Cancel Trip</Button>
        </div>
      )}
      {booking.status === 'in_progress' && (
        <Button className="w-full">Complete Trip</Button>
      )}
      {booking.status === 'assigned' && (
        <Button className="w-full">Accept & Confirm</Button>
      )}
    </div>
  );
}

export default function DriverAssignments() {
  const [filter, setFilter] = useState<'upcoming' | 'active' | 'completed'>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filters = [
    { id: 'upcoming' as const, label: 'Upcoming' },
    { id: 'active' as const, label: 'Active' },
    { id: 'completed' as const, label: 'Completed' },
  ];

  const filtered = myBookings.filter(b => {
    if (filter === 'active') return b.status === 'in_progress';
    if (filter === 'completed') return b.status === 'completed';
    return ['assigned', 'confirmed', 'pending'].includes(b.status);
  });

  if (selectedBooking) {
    return <AssignmentDetail booking={selectedBooking} onClose={() => setSelectedBooking(null)} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">My Assignments</h2>

      <div className="flex gap-2">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-colors', filter === f.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(b => (
          <button key={b.id} onClick={() => setSelectedBooking(b)} className="w-full text-left">
            <Card className={cn('transition-all hover:border-primary', b.status === 'in_progress' && 'ring-2 ring-primary ring-offset-1 dark:ring-offset-background')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusColor(b.status))}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(b.scheduledAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <p className="font-semibold text-foreground text-sm">{b.customerName}</p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs text-foreground flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />{b.pickupAddress}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />{b.dropoffAddress}</p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.passengerCount}</span>
                    <span>€{b.price}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-muted-foreground">No {filter} assignments</p>
          </div>
        )}
      </div>
    </div>
  );
}
