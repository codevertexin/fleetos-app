import type { Payout } from '../../types';
import { StatusBadge } from './StatusBadge';
import { settlementLabels } from './constants';

interface Props {
  payouts: Payout[];
}

export function PayoutsTab({ payouts }: Props) {
  const total = payouts.reduce((s, p) => s + p.amount, 0);
  const paid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pending = payouts.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-slate-900' },
          { label: 'Paid', value: paid, color: 'text-emerald-700' },
          { label: 'Pending', value: pending, color: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className={`text-xl font-bold ${s.color}`}>€{s.value.toLocaleString()}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {payouts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No payouts recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">
                  Settlement
                </th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">
                  Reference
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">
                  Processed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.period}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell capitalize">
                    {settlementLabels[p.settlementModel ?? ''] ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    €{p.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                    {p.reference ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                    {p.processedAt ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
