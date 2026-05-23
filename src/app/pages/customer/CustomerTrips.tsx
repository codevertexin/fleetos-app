import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Clock, Star, ChevronRight, Phone, MessageSquare, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Trip {
  id: string;
  status: 'in_progress' | 'completed' | 'cancelled' | 'confirmed' | 'pending';
  serviceType: string;
  driverName?: string;
  vehiclePlate?: string;
  vehicleBrand?: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: string;
  completedAt?: string;
  price: number;
  rating?: number;
  cancellationReason?: string;
}

const mockTrips: Trip[] = [
  { id: 't1', status: 'in_progress', serviceType: 'Comfort', driverName: 'Pedro Costa', vehiclePlate: '00-AA-01', vehicleBrand: 'Toyota Corolla', pickupAddress: 'Aeroporto de Lisboa', dropoffAddress: 'Hotel Bairro Alto', scheduledAt: '2024-06-10T14:00:00', price: 35 },
  { id: 't2', status: 'confirmed', serviceType: 'Economy', driverName: 'Miguel Santos', vehiclePlate: '11-BB-22', vehicleBrand: 'Mercedes E-Class', pickupAddress: 'Hotel Tivoli', dropoffAddress: 'Oceanário de Lisboa', scheduledAt: '2024-06-11T09:00:00', price: 25 },
  { id: 't3', status: 'completed', serviceType: 'Executive', driverName: 'Sofia Lopes', vehiclePlate: '44-EE-55', vehicleBrand: 'Tesla Model 3', pickupAddress: 'Estação de Oriente', dropoffAddress: 'Sintra', scheduledAt: '2024-06-09T10:30:00', completedAt: '2024-06-09T11:45:00', price: 55, rating: 5 },
  { id: 't4', status: 'completed', serviceType: 'Economy', driverName: 'António Rodrigues', vehiclePlate: '66-GG-77', vehicleBrand: 'Audi A6', pickupAddress: 'Porto Airport', dropoffAddress: 'Hotel Infante Sagres', scheduledAt: '2024-06-07T18:00:00', completedAt: '2024-06-07T18:28:00', price: 20, rating: 4 },
  { id: 't5', status: 'cancelled', serviceType: 'Van', pickupAddress: 'Cascais Marina', dropoffAddress: 'Lisboa Chiado', scheduledAt: '2024-06-05T12:00:00', price: 40, cancellationReason: 'Customer request' },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  in_progress: { label: 'In Progress', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <CheckCircle className="w-3 h-3" /> },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock className="w-3 h-3" /> },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: <CheckCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <X className="w-3 h-3" /> },
};

function RatingStars({ rating, interactive = false, onChange }: { rating?: number; interactive?: boolean; onChange?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          disabled={!interactive}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          className={cn('transition-colors', interactive && 'cursor-pointer hover:scale-110')}
        >
          <Star className={cn('w-4 h-4', (hover || rating || 0) >= i ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600')} />
        </button>
      ))}
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const [expanded, setExpanded] = useState(trip.status === 'in_progress');
  const [rating, setRating] = useState(trip.rating);
  const [rated, setRated] = useState(!!trip.rating);
  const s = statusConfig[trip.status];

  return (
    <Card className={cn('overflow-hidden', trip.status === 'in_progress' && 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background')}>
      <CardContent className="p-0">
        <button className="w-full text-left p-4" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', s.color)}>
                  {s.icon} {s.label}
                </span>
                <span className="text-xs text-muted-foreground">{trip.serviceType}</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-sm text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />{trip.pickupAddress}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />{trip.dropoffAddress}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-foreground">€{trip.price}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(trip.scheduledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </p>
              {trip.rating && <RatingStars rating={trip.rating} />}
            </div>
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
            {trip.driverName && (
              <div className="flex items-center justify-between bg-muted/40 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {trip.driverName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{trip.driverName}</p>
                    <p className="text-xs text-muted-foreground">{trip.vehicleBrand} · {trip.vehiclePlate}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 bg-card rounded-xl border border-border hover:bg-muted transition-colors">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button className="p-2 bg-card rounded-xl border border-border hover:bg-muted transition-colors">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="font-medium text-foreground">{new Date(trip.scheduledAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              {trip.completedAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="font-medium text-foreground">{new Date(trip.completedAt).toLocaleTimeString('en-GB', { timeStyle: 'short' })}</p>
                </div>
              )}
            </div>

            {trip.cancellationReason && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">Cancelled: {trip.cancellationReason}</p>
              </div>
            )}

            {trip.status === 'completed' && !rated && (
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs font-medium text-foreground mb-2">Rate this trip</p>
                <RatingStars interactive onChange={r => { setRating(r); setRated(true); }} />
              </div>
            )}
            {rated && trip.status === 'completed' && (
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <CheckCircle className="w-3.5 h-3.5" /> Thank you for rating!
              </div>
            )}

            {trip.status === 'confirmed' && (
              <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800/40 dark:hover:bg-red-900/10">
                Cancel Booking
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomerTrips() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ] as const;

  const filtered = mockTrips.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['in_progress', 'confirmed', 'pending'].includes(t.status);
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'cancelled') return t.status === 'cancelled';
    return true;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">My Trips</h2>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filter === f.id
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(trip => (
          <TripCard key={trip.id} trip={trip} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🚗</p>
            <p className="font-medium text-foreground">No trips here</p>
            <p className="text-sm text-muted-foreground mt-1">Book your first ride to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
