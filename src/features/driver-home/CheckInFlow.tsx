import { ArrowRight, Gauge, Camera, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CheckinData {
  odometer: string;
  fuel: string;
}

interface Props {
  screen: string;
  checkinData: CheckinData;
  setCheckinData: (d: CheckinData) => void;
  vehiclePlate: string;
  onBack: (screen: string) => void;
  onNext: (screen: string) => void;
  onConfirm: () => void;
}

export function CheckInFlow({ screen, checkinData, setCheckinData, vehiclePlate, onBack, onNext, onConfirm }: Props) {
  if (screen === 'checkin_odometer') {
    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => onBack('home')} className="text-sm text-muted-foreground mb-3 block">← Cancel</button>
          <h2 className="text-xl font-bold text-foreground">Check-In</h2>
          <p className="text-sm text-muted-foreground">Step 1 of 3 · Odometer Reading</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div className="bg-primary h-1.5 rounded-full w-1/3 transition-all" />
          </div>
        </div>
        <div className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Gauge className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Vehicle: {vehiclePlate}</p>
            <p className="text-xs text-muted-foreground">Last recorded: {(45100).toLocaleString()} km</p>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">CURRENT ODOMETER (KM)</label>
          <input
            type="number"
            placeholder="e.g. 45200"
            value={checkinData.odometer}
            onChange={e => setCheckinData({ ...checkinData, odometer: e.target.value })}
            className="w-full px-4 py-4 text-2xl font-bold bg-muted border-2 border-border rounded-2xl focus:outline-none focus:border-primary text-foreground text-center"
          />
        </div>
        <Button className="w-full" size="lg" disabled={!checkinData.odometer} onClick={() => onNext('checkin_fuel')}>
          Next <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  if (screen === 'checkin_fuel') {
    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => onBack('checkin_odometer')} className="text-sm text-muted-foreground mb-3 block">← Back</button>
          <h2 className="text-xl font-bold text-foreground">Check-In</h2>
          <p className="text-sm text-muted-foreground">Step 2 of 3 · Fuel Level</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div className="bg-primary h-1.5 rounded-full w-2/3 transition-all" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-3">FUEL LEVEL (%)</label>
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map(v => (
              <button key={v} onClick={() => setCheckinData({ ...checkinData, fuel: String(v) })}
                className={cn('py-3 rounded-xl border-2 text-sm font-bold transition-all', checkinData.fuel === String(v) ? 'border-primary bg-primary text-white' : 'border-border bg-muted text-foreground hover:border-primary')}>
                {v}%
              </button>
            ))}
          </div>
          <div className="mt-3">
            <input type="number" min="0" max="100" placeholder="Custom %" value={checkinData.fuel}
              onChange={e => setCheckinData({ ...checkinData, fuel: e.target.value })}
              className="w-full px-4 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-center" />
          </div>
          {checkinData.fuel && (
            <div className="mt-3 bg-muted rounded-full h-4 overflow-hidden">
              <div className={cn('h-4 rounded-full transition-all', parseInt(checkinData.fuel) < 25 ? 'bg-red-500' : parseInt(checkinData.fuel) < 50 ? 'bg-amber-500' : 'bg-emerald-500')}
                style={{ width: `${Math.min(100, parseInt(checkinData.fuel) || 0)}%` }} />
            </div>
          )}
        </div>
        <Button className="w-full" size="lg" disabled={!checkinData.fuel} onClick={() => onNext('checkin_photos')}>
          Next <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  if (screen === 'checkin_photos') {
    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => onBack('checkin_fuel')} className="text-sm text-muted-foreground mb-3 block">← Back</button>
          <h2 className="text-xl font-bold text-foreground">Check-In</h2>
          <p className="text-sm text-muted-foreground">Step 3 of 3 · Vehicle Photos</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div className="bg-primary h-1.5 rounded-full w-full transition-all" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Take photos of all 4 sides of the vehicle before starting your shift.</p>
        <div className="grid grid-cols-2 gap-3">
          {['Front', 'Rear', 'Left Side', 'Right Side'].map(side => (
            <button key={side} className="aspect-square bg-muted rounded-2xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-2 transition-colors">
              <Camera className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{side}</span>
            </button>
          ))}
        </div>
        <Button className="w-full" size="lg" onClick={() => onNext('checkin_confirm')}>
          Complete Check-In
        </Button>
        <Button variant="outline" className="w-full" onClick={() => onNext('checkin_confirm')}>
          Skip Photos
        </Button>
      </div>
    );
  }

  if (screen === 'checkin_confirm') {
    return (
      <div className="space-y-5 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Shift Started!</h2>
          <p className="text-sm text-muted-foreground mt-1">Check-in completed successfully</p>
        </div>
        <Card>
          <CardContent className="p-4 space-y-2 text-left">
            {[
              { label: 'Vehicle', value: vehiclePlate },
              { label: 'Odometer', value: `${parseInt(checkinData.odometer || '45200').toLocaleString()} km` },
              { label: 'Fuel', value: `${checkinData.fuel || 80}%` },
              { label: 'Time', value: new Date().toLocaleTimeString('en-GB', { timeStyle: 'short' }) },
            ].map(f => (
              <div key={f.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-medium text-foreground">{f.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Button className="w-full" size="lg" onClick={onConfirm}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return null;
}
