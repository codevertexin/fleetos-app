import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { mockAlerts } from '@/lib/mock-data';

export function AlertsTab() {
  const unread = mockAlerts.filter(a => !a.isRead);
  const urgent = mockAlerts.filter(a => a.severity === 'high');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm text-muted-foreground">{unread.length} unread</span>
        <span className="text-sm text-red-600 font-medium">{urgent.length} high priority</span>
      </div>
      {mockAlerts.map(a => (
        <Card
          key={a.id}
          className={cn(
            'transition-all',
            !a.isRead && 'border-l-4',
            a.severity === 'high' && !a.isRead && 'border-l-red-500',
            a.severity === 'medium' && !a.isRead && 'border-l-amber-500',
            a.severity === 'low' && !a.isRead && 'border-l-blue-500',
          )}
        >
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle
              className={cn('w-4 h-4 mt-0.5 shrink-0', {
                'text-red-500': a.severity === 'high',
                'text-amber-500': a.severity === 'medium',
                'text-blue-500': a.severity === 'low',
              })}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{a.entityName}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn('px-2 py-0.5 rounded-full text-xs font-medium', {
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400':
                    a.severity === 'high',
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400':
                    a.severity === 'medium',
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400':
                    a.severity === 'low',
                })}
              >
                {a.severity}
              </span>
              {!a.isRead && (
                <button className="text-xs text-primary hover:underline">Mark read</button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
