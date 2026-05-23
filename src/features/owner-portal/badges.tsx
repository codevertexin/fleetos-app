import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function payoutStatusBadge(status: string) {
  const map: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const icons: Record<string, React.ReactNode> = {
    paid: <CheckCircle className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
    processing: <Clock className="w-3 h-3" />,
    failed: <AlertCircle className="w-3 h-3" />,
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        map[status] || map.pending,
      )}
    >
      {icons[status]}{' '}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function docStatusBadge(status: string) {
  const map: Record<string, string> = {
    valid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    expiring_soon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    missing: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', map[status] || map.missing)}>
      {status.replace('_', ' ')}
    </span>
  );
}
