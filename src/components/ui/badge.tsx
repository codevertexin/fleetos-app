import { cn } from '@/lib/utils';
import { getStatusColor, formatStatus } from '@/lib/utils';

interface BadgeProps {
  status?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'outline';
}

export function StatusBadge({ status = '', label, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusColor(status), className)}>
      {label ?? formatStatus(status)}
    </span>
  );
}

export function Badge({ children, className, variant = 'default' }: { children: React.ReactNode; className?: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }) {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-white',
    outline: 'border border-border text-foreground',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant as keyof typeof variants] ?? variants.default, className)}>
      {children}
    </span>
  );
}
