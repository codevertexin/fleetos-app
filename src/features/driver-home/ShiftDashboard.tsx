import { MapPin, Clock, Navigation, Phone, CheckCircle, ArrowRight, CircleHelp } from 'lucide-react';
import { getHelpUrl } from '@/lib/platformLinks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mockAssignments, mockBookings } from '@/lib/mock-data';

type ShiftState = 'idle' | 'active' | 'done';

interface Props {
  shiftState: ShiftState;
  onStartShift: () => void;
  onEndShift: () => void;
}

export function ShiftDashboard({ shiftState, onStartShift, onEndShift }: Props) {
  const todayAssignment = mockAssignments[0];
  const activeBooking = mockBookings[0];

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Good morning,</p>
          <h1 className="text-xl font-bold text-foreground">Pedro Costa</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={getHelpUrl('driver_home')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
            aria-label="Driver help"
          >
            <CircleHelp className="w-4 h-4" />
          </a>
          <div className={cn('px-3 py-1.5 rounded-full text-xs font-semibold', {
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300': shiftState === 'idle',
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400': shiftState === 'active',
          'bg-slate-100 text-slate-600': shiftState === 'done',
        })}>
          {shiftState === 'idle' ? '● Off Shift' : shiftState === 'active' ? '● On Shift' : '✓ Shift Ended'}
          </div>
        </div>
      </div>

      {/* Start Shift CTA */}
      {shiftState === 'idle' && (
        <button onClick={onStartShift}
          className="w-full bg-primary text-white rounded-2xl p-5 flex items-center justify-between hover:bg-primary/90 transition-colors">
          <div>
            <p className="font-bold text-lg">Start Shift</p>
            <p className="text-sm text-white/80">Vehicle: {todayAssignment.vehiclePlate}</p>
          </div>
          <ArrowRight className="w-6 h-6" />
        </button>
      )}

      {/* Active stats */}
      {shiftState === 'active' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">4h 32m</p>
            <p className="text-xs text-muted-foreground">On Shift</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">3</p>
            <p className="text-xs text-muted-foreground">Trips Today</p>
          </div>
        </div>
      )}

      {/* Active Trip */}
      {shiftState === 'active' && (
        <Card className="ring-2 ring-primary ring-offset-2 dark:ring-offset-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Active Trip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">{activeBooking.customerName}</p>
              <a href={`tel:${activeBooking.customerPhone}`} className="p-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                <Phone className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                <span className="text-foreground">{activeBooking.pickupAddress}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                <span className="text-muted-foreground">{activeBooking.dropoffAddress}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5"><Navigation className="w-4 h-4" /> Navigate</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">Complete</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Stats */}
      {shiftState === 'active' && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Today's Stats</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-foreground">3</p>
                <p className="text-xs text-muted-foreground">Trips</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">€105</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">142km</p>
                <p className="text-xs text-muted-foreground">Distance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* End Shift */}
      {shiftState === 'active' && (
        <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800/40 dark:hover:bg-red-900/10"
          onClick={onEndShift}>
          End Shift
        </Button>
      )}

      {/* Shift Done */}
      {shiftState === 'done' && (
        <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40">
          <CardContent className="p-5 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="font-bold text-foreground">Shift Complete!</p>
            <p className="text-sm text-muted-foreground mt-1">Great work today.</p>
            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div><p className="font-bold text-foreground">3</p><p className="text-xs text-muted-foreground">Trips</p></div>
              <div><p className="font-bold text-foreground">€105</p><p className="text-xs text-muted-foreground">Revenue</p></div>
              <div><p className="font-bold text-foreground">4.9 ⭐</p><p className="text-xs text-muted-foreground">Rating</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Assignment (idle) */}
      {shiftState === 'idle' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Next Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Today at 14:00</p>
                <p className="text-sm text-muted-foreground">Maria João · 2 pax</p>
                <p className="text-xs text-foreground mt-1.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-500" />Aeroporto de Lisboa → Hotel Bairro Alto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
