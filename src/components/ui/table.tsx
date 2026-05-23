import { cn } from '@/lib/utils';

export function Table({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full text-sm', className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <thead className={cn('border-b border-border bg-muted/50', className)}>{children}</thead>;
}

export function TableBody({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <tbody className={cn('divide-y divide-border', className)}>{children}</tbody>;
}

export function TableRow({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('hover:bg-muted/30 transition-colors', onClick && 'cursor-pointer', className)}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide', className)}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn('px-4 py-3 text-foreground', className)}>{children}</td>;
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {icon && <div className="text-muted-foreground/40 mb-2">{icon}</div>}
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground max-w-xs">{description}</p>}
    </div>
  );
}
