import { cn } from '@/lib/utils';
import { mockTodayTimeline } from '@/lib/mock-data';

export function TimelineTab() {
  return (
    <div className="space-y-0">
      <p className="text-sm text-muted-foreground mb-4">
        {new Date().toLocaleDateString('en-GB', { dateStyle: 'full' })}
      </p>
      <div className="relative">
        <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-border" />
        <div className="space-y-0">
          {mockTodayTimeline.map((event, i) => (
            <div key={i} className="flex gap-4 pb-6">
              <div className="w-16 shrink-0 text-right">
                <span className="text-xs font-mono text-muted-foreground pt-0.5 block">
                  {event.time}
                </span>
              </div>
              <div className="relative flex items-start gap-3 flex-1">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full mt-1.5 shrink-0 z-10 ring-2 ring-background',
                    event.color,
                  )}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground leading-tight">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
