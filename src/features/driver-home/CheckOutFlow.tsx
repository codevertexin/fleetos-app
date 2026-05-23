import { ArrowRight, CheckCircle, AlertTriangle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CheckoutData {
  odometer: string;
  fuel: string;
  damage: string;
  hasDamage: boolean;
}

interface Props {
  screen: string;
  checkoutData: CheckoutData;
  setCheckoutData: (d: CheckoutData) => void;
  checkinOdometer: string;
  onBack: (screen: string) => void;
  onNext: (screen: string) => void;
  onConfirm: () => void;
}

export function CheckOutFlow({ screen, checkoutData, setCheckoutData, checkinOdometer, onBack, onNext, onConfirm }: Props) {
  if (screen === 'checkout_odometer') {
    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => onBack('home')} className="text-sm text-muted-foreground mb-3 block">← Cancel</button>
          <h2 className="text-xl font-bold text-foreground">End Shift</h2>
          <p className="text-sm text-muted-foreground">Step 1 of 3 · Final Odometer</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div className="bg-primary h-1.5 rounded-full w-1/3 transition-all" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">FINAL ODOMETER (KM)</label>
          <input type="number" placeholder={String(parseInt(checkinOdometer || '45200') + 80)}
            value={checkoutData.odometer}
            onChange={e => setCheckoutData({ ...checkoutData, odometer: e.target.value })}
            className="w-full px-4 py-4 text-2xl font-bold bg-muted border-2 border-border rounded-2xl focus:outline-none focus:border-primary text-foreground text-center" />
          {checkoutData.odometer && checkinOdometer && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              Distance: <span className="font-semibold text-foreground">{(parseInt(checkoutData.odometer) - parseInt(checkinOdometer)).toLocaleString()} km</span>
            </p>
          )}
        </div>
        <Button className="w-full" size="lg" disabled={!checkoutData.odometer} onClick={() => onNext('checkout_fuel')}>
          Next <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  if (screen === 'checkout_fuel') {
    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => onBack('checkout_odometer')} className="text-sm text-muted-foreground mb-3 block">← Back</button>
          <h2 className="text-xl font-bold text-foreground">End Shift</h2>
          <p className="text-sm text-muted-foreground">Step 2 of 3 · Remaining Fuel</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div className="bg-primary h-1.5 rounded-full w-2/3 transition-all" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 75, 100].map(v => (
            <button key={v} onClick={() => setCheckoutData({ ...checkoutData, fuel: String(v) })}
              className={cn('py-3 rounded-xl border-2 text-sm font-bold transition-all', checkoutData.fuel === String(v) ? 'border-primary bg-primary text-white' : 'border-border bg-muted text-foreground hover:border-primary')}>
              {v}%
            </button>
          ))}
        </div>
        <input type="number" min="0" max="100" placeholder="Custom %" value={checkoutData.fuel}
          onChange={e => setCheckoutData({ ...checkoutData, fuel: e.target.value })}
          className="w-full px-4 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-center" />
        <Button className="w-full" size="lg" disabled={!checkoutData.fuel} onClick={() => onNext('checkout_damage')}>
          Next <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  if (screen === 'checkout_damage') {
    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => onBack('checkout_fuel')} className="text-sm text-muted-foreground mb-3 block">← Back</button>
          <h2 className="text-xl font-bold text-foreground">End Shift</h2>
          <p className="text-sm text-muted-foreground">Step 3 of 3 · Damage Report</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div className="bg-primary h-1.5 rounded-full w-full transition-all" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Report any damage found during your shift.</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setCheckoutData({ ...checkoutData, hasDamage: false })}
            className={cn('py-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all', !checkoutData.hasDamage ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-border bg-muted')}>
            <CheckCircle className={cn('w-7 h-7', !checkoutData.hasDamage ? 'text-emerald-600' : 'text-muted-foreground')} />
            <span className={cn('text-sm font-semibold', !checkoutData.hasDamage ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>No Damage</span>
          </button>
          <button onClick={() => setCheckoutData({ ...checkoutData, hasDamage: true })}
            className={cn('py-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all', checkoutData.hasDamage ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-border bg-muted')}>
            <AlertTriangle className={cn('w-7 h-7', checkoutData.hasDamage ? 'text-red-600' : 'text-muted-foreground')} />
            <span className={cn('text-sm font-semibold', checkoutData.hasDamage ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground')}>Damage Found</span>
          </button>
        </div>
        {checkoutData.hasDamage && (
          <div className="space-y-3">
            <textarea placeholder="Describe the damage in detail..."
              value={checkoutData.damage}
              onChange={e => setCheckoutData({ ...checkoutData, damage: e.target.value })}
              rows={4}
              className="w-full px-3 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none" />
            <div className="grid grid-cols-2 gap-2">
              {['Front', 'Rear', 'Left', 'Right'].map(side => (
                <button key={side} className="py-3 bg-muted rounded-xl border border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary transition-colors">
                  <Camera className="w-4 h-4" /> {side}
                </button>
              ))}
            </div>
          </div>
        )}
        <Button className="w-full" size="lg" onClick={onConfirm}>
          Complete Check-Out
        </Button>
      </div>
    );
  }

  return null;
}
