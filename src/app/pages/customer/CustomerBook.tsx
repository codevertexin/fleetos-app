import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, ChevronRight, Search, Star, ArrowLeft, CreditCard, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ServiceType {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  maxPassengers: number;
  icon: string;
}

const serviceTypes: ServiceType[] = [
  { id: 'economy', name: 'Economy', description: 'Affordable · Sedan', basePrice: 8, maxPassengers: 4, icon: '🚗' },
  { id: 'comfort', name: 'Comfort', description: 'Premium Sedan · WiFi', basePrice: 14, maxPassengers: 4, icon: '🚙' },
  { id: 'van', name: 'Van / Group', description: 'Up to 7 passengers', basePrice: 18, maxPassengers: 7, icon: '🚐' },
  { id: 'executive', name: 'Executive', description: 'Luxury · Business travel', basePrice: 25, maxPassengers: 4, icon: '🏎️' },
];

const popularRoutes = [
  { from: 'Airport (LIS)', to: 'City Centre', price: 22, time: 25 },
  { from: 'Airport (OPO)', to: 'Porto Centre', price: 18, time: 20 },
  { from: 'Oriente Station', to: 'Cascais', price: 35, time: 40 },
];

type Step = 'home' | 'type' | 'details' | 'confirm' | 'success';

export default function CustomerBook() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('home');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [form, setForm] = useState({
    pickup: '',
    dropoff: '',
    date: '',
    time: '',
    passengers: 1,
    notes: '',
  });

  const companyName = companySlug ? companySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'FleetOS';

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Booking Confirmed!</h2>
        <p className="text-muted-foreground text-sm mb-1">Your booking has been received.</p>
        <p className="text-muted-foreground text-sm mb-6">Reference: <span className="font-mono font-semibold text-foreground">BK-{Math.random().toString(36).slice(2, 8).toUpperCase()}</span></p>
        <p className="text-xs text-muted-foreground mb-8">A driver will be assigned and you'll receive confirmation. You can track your booking in the Trips section.</p>
        <div className="flex gap-3 w-full max-w-xs">
          <Button variant="outline" className="flex-1" onClick={() => navigate(`/book/${companySlug}/trips`)}>View Trips</Button>
          <Button className="flex-1" onClick={() => { setStep('home'); setForm({ pickup: '', dropoff: '', date: '', time: '', passengers: 1, notes: '' }); }}>New Booking</Button>
        </div>
      </div>
    );
  }

  if (step === 'confirm' && selectedService) {
    const estimatedPrice = selectedService.basePrice + Math.floor(Math.random() * 10) + 15;
    return (
      <div className="space-y-4">
        <button onClick={() => setStep('details')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-lg font-bold text-foreground">Confirm Booking</h2>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <span className="text-2xl">{selectedService.icon}</span>
              <div>
                <p className="font-semibold text-foreground">{selectedService.name}</p>
                <p className="text-xs text-muted-foreground">{selectedService.description}</p>
              </div>
            </div>
            {[
              { label: 'Pickup', value: form.pickup },
              { label: 'Dropoff', value: form.dropoff },
              { label: 'Date & Time', value: `${form.date} at ${form.time}` },
              { label: 'Passengers', value: `${form.passengers}` },
            ].map(f => (
              <div key={f.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-medium text-foreground">{f.value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-3 border-t border-border">
              <span className="font-semibold text-foreground">Estimated Price</span>
              <span className="font-bold text-xl text-primary">€{estimatedPrice}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-muted-foreground">Payment collected by driver. Cash or card accepted.</p>
          </CardContent>
        </Card>
        {form.notes && (
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground">{form.notes}</p>
            </CardContent>
          </Card>
        )}
        <Button className="w-full" size="lg" onClick={() => setStep('success')}>Confirm Booking</Button>
        <Button variant="outline" className="w-full" onClick={() => setStep('details')}>Edit Details</Button>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="space-y-4">
        <button onClick={() => setStep('type')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-lg font-bold text-foreground">Trip Details</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">PICKUP LOCATION</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              <input
                placeholder="Enter pickup address"
                value={form.pickup}
                onChange={e => setForm({ ...form, pickup: e.target.value })}
                className="w-full pl-10 pr-3 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">DROP-OFF LOCATION</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                placeholder="Enter drop-off address"
                value={form.dropoff}
                onChange={e => setForm({ ...form, dropoff: e.target.value })}
                className="w-full pl-10 pr-3 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">DATE</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">TIME</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">PASSENGERS</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setForm({ ...form, passengers: Math.max(1, form.passengers - 1) })}
                className="w-10 h-10 rounded-full border border-border hover:bg-muted flex items-center justify-center text-foreground font-semibold transition-colors">−</button>
              <span className="text-lg font-bold text-foreground w-8 text-center">{form.passengers}</span>
              <button onClick={() => setForm({ ...form, passengers: Math.min(selectedService?.maxPassengers || 4, form.passengers + 1) })}
                className="w-10 h-10 rounded-full border border-border hover:bg-muted flex items-center justify-center text-foreground font-semibold transition-colors">+</button>
              <span className="text-xs text-muted-foreground">Max {selectedService?.maxPassengers || 4}</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">NOTES (OPTIONAL)</label>
            <textarea
              placeholder="Special requests, flight number, etc."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
            />
          </div>
        </div>
        <Button
          className="w-full"
          size="lg"
          disabled={!form.pickup || !form.dropoff || !form.date || !form.time}
          onClick={() => setStep('confirm')}
        >
          Review Booking
        </Button>
      </div>
    );
  }

  if (step === 'type') {
    return (
      <div className="space-y-4">
        <button onClick={() => setStep('home')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-lg font-bold text-foreground">Select Service</h2>
        <div className="space-y-3">
          {serviceTypes.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedService(s); setStep('details'); }}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <span className="text-3xl">{s.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.description} · up to {s.maxPassengers} pax</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">from €{s.basePrice}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Home screen
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Welcome to</p>
        <h1 className="text-2xl font-bold text-foreground">{companyName}</h1>
        <p className="text-sm text-muted-foreground">Professional transport service</p>
      </div>

      {/* Book Now CTA */}
      <button
        onClick={() => setStep('type')}
        className="w-full flex items-center gap-4 p-5 bg-primary rounded-2xl text-white text-left hover:bg-primary/90 transition-colors"
      >
        <div className="flex-1">
          <p className="font-bold text-lg">Book a Ride</p>
          <p className="text-sm text-white/80">Airport, city transfers & more</p>
        </div>
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Popular Routes */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Popular Routes</p>
        <div className="space-y-2">
          {popularRoutes.map((r, i) => (
            <button
              key={i}
              onClick={() => { setForm({ ...form, pickup: r.from, dropoff: r.to }); setStep('type'); }}
              className="w-full flex items-center gap-3 p-3.5 bg-card rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="w-px h-4 bg-border" />
                <div className="w-2 h-2 rounded-full bg-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{r.from}</p>
                <p className="text-xs text-muted-foreground">{r.to}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">from €{r.price}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3" />{r.time} min
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Service Info */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '⭐', label: '4.9 Rating', sub: 'Average' },
          { icon: '🚗', label: '8 Vehicles', sub: 'Available' },
          { icon: '⚡', label: '< 5 min', sub: 'Response' },
        ].map(s => (
          <div key={s.label} className="bg-muted/40 rounded-xl p-3 text-center">
            <span className="text-xl">{s.icon}</span>
            <p className="text-xs font-semibold text-foreground mt-1">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
