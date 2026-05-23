import { Download } from 'lucide-react';
import type { VehicleSupplier } from '../../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  supplier: VehicleSupplier;
}

const MOCK_MONTHS = ['2024-06', '2024-05', '2024-04', '2024-03', '2024-02', '2024-01'];

export function StatementsTab({ supplier: _ }: Props) {
  const mockRows = MOCK_MONTHS.map((m, i) => ({
    period: m,
    income: 4820 - i * 250,
    expenses: 1240 - i * 80,
    net: 3580 - i * 170,
    payout: Math.round((3580 - i * 170) * 0.8),
    status: i === 0 ? 'pending' : 'paid',
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="font-medium text-slate-900">Monthly Statements</h3>
        <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <Download className="w-4 h-4" /> Export All
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
            <th className="text-right px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Income</th>
            <th className="text-right px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Expenses</th>
            <th className="text-right px-4 py-3 font-medium text-slate-600">Net</th>
            <th className="text-right px-4 py-3 font-medium text-slate-600">Payout</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {mockRows.map(row => (
            <tr key={row.period} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{row.period}</td>
              <td className="px-4 py-3 text-right text-slate-700 hidden md:table-cell">
                €{row.income.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right text-red-600 hidden md:table-cell">
                −€{row.expenses.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-medium text-slate-900">
                €{row.net.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                €{row.payout.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3">
                <button className="text-slate-400 hover:text-slate-700">
                  <Download className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
