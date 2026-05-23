import type { Contract } from '../../types';
import { settlementLabels } from './constants';

interface Props {
  contracts: Contract[];
}

export function ContractsTab({ contracts }: Props) {
  if (contracts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
        No contracts found for this supplier.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-4 py-3 font-medium text-slate-600">Contract</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Vehicle</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Settlement</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Amount</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Period</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {contracts.map(c => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900 capitalize">{c.type}</div>
                <div className="text-xs text-slate-500">{c.id.toUpperCase()}</div>
              </td>
              <td className="px-4 py-3 text-slate-700">
                {c.vehiclePlate ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-slate-700">
                  {settlementLabels[c.settlementModel] ?? c.settlementModel}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-slate-900 hidden md:table-cell">
                {c.monthlyFixedAmount
                  ? `€${c.monthlyFixedAmount}/mo`
                  : c.percentage
                  ? `${c.percentage}%`
                  : c.value
                  ? `${c.value}%`
                  : '—'}
              </td>
              <td className="px-4 py-3 text-slate-600 text-xs hidden lg:table-cell">
                {c.startDate} → {c.endDate}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    c.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
