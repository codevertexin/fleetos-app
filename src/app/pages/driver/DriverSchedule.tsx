import { useState } from 'react';
import { Clock, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

type AvailabilityMap = Record<string, Record<string, boolean>>;

const initialAvailability: AvailabilityMap = {
  Mon: { '08:00': true, '09:00': true, '10:00': true, '11:00': true, '12:00': true, '14:00': true, '15:00': true, '16:00': true, '17:00': true, '18:00': true },
  Tue: { '08:00': true, '09:00': true, '10:00': true, '14:00': true, '15:00': true, '16:00': true, '17:00': true },
  Wed: { '08:00': true, '09:00': true, '10:00': true, '11:00': true, '12:00': true, '14:00': true, '15:00': true, '16:00': true, '17:00': true, '18:00': true },
  Thu: { '08:00': true, '09:00': true, '10:00': true, '14:00': true, '15:00': true },
  Fri: { '08:00': true, '09:00': true, '10:00': true, '11:00': true, '14:00': true, '15:00': true, '16:00': true, '17:00': true, '18:00': true, '19:00': true },
  Sat: { '10:00': true, '11:00': true, '12:00': true, '13:00': true },
  Sun: {},
};

const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

export default function DriverSchedule() {
  const [availability, setAvailability] = useState<AvailabilityMap>(initialAvailability);
  const [saved, setSaved] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAYS[todayIdx]);

  function toggleSlot(day: string, slot: string) {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], [slot]: !prev[day]?.[slot] }
    }));
    setSaved(false);
  }

  function clearDay(day: string) {
    setAvailability(prev => ({ ...prev, [day]: {} }));
    setSaved(false);
  }

  function setFullDay(day: string) {
    const all: Record<string, boolean> = {};
    SLOTS.forEach(s => { all[s] = true; });
    setAvailability(prev => ({ ...prev, [day]: all }));
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const daySlots = availability[selectedDay] || {};
  const activeCount = Object.values(daySlots).filter(Boolean).length;

  const weekSummary = DAYS.map(d => ({
    day: d,
    hours: Object.values(availability[d] || {}).filter(Boolean).length,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Availability</h2>
        <Button size="sm" onClick={handleSave} className={saved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
          {saved ? <><CheckCircle className="w-3.5 h-3.5 mr-1" />Saved</> : 'Save'}
        </Button>
      </div>

      {/* Week Overview */}
      <div className="grid grid-cols-7 gap-1">
        {weekSummary.map((d, i) => (
          <button key={d.day} onClick={() => setSelectedDay(d.day)}
            className={cn('flex flex-col items-center py-2 px-1 rounded-xl transition-all',
              selectedDay === d.day ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/80',
              i === todayIdx && selectedDay !== d.day && 'ring-2 ring-primary ring-offset-1 dark:ring-offset-background'
            )}>
            <span className={cn('text-xs font-semibold', selectedDay === d.day ? 'text-white' : 'text-foreground')}>{d.day}</span>
            <span className={cn('text-xs mt-0.5', selectedDay === d.day ? 'text-white/80' : 'text-muted-foreground')}>
              {d.hours > 0 ? `${d.hours}h` : '—'}
            </span>
          </button>
        ))}
      </div>

      {/* Day Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{selectedDay} · {activeCount} hour{activeCount !== 1 ? 's' : ''} available</p>
        <div className="flex gap-2">
          <button onClick={() => setFullDay(selectedDay)} className="text-xs text-primary hover:underline">All Day</button>
          <span className="text-muted-foreground">·</span>
          <button onClick={() => clearDay(selectedDay)} className="text-xs text-red-500 hover:underline">Clear</button>
        </div>
      </div>

      {/* Time Slots */}
      <div className="grid grid-cols-3 gap-2">
        {SLOTS.map(slot => (
          <button key={slot} onClick={() => toggleSlot(selectedDay, slot)}
            className={cn('py-2.5 rounded-xl text-sm font-medium border transition-all',
              daySlots[slot]
                ? 'bg-primary text-white border-primary'
                : 'bg-muted text-muted-foreground border-transparent hover:border-primary hover:text-foreground'
            )}>
            {slot}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" /> Available</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-muted border border-border" /> Unavailable</span>
      </div>

      {/* Weekly Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Weekly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{weekSummary.reduce((sum, d) => sum + d.hours, 0)}h</p>
              <p className="text-xs text-muted-foreground">Total Available</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{weekSummary.filter(d => d.hours > 0).length}</p>
              <p className="text-xs text-muted-foreground">Working Days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
