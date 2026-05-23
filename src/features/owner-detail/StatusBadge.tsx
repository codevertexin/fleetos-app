export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-slate-100 text-slate-600',
    suspended: 'bg-red-100 text-red-700',
    paid: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    expired: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {status}
    </span>
  );
}
