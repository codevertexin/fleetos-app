import type { Vehicle } from '../../types';

interface Props {
  vehicles: Vehicle[];
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  available: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-amber-100 text-amber-800',
  rented: 'bg-purple-100 text-purple-800',
  inactive: 'bg-slate-100 text-slate-600',
};

export function VehiclesTab({ vehicles }: Props) {
  if (vehicles.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
        No vehicles linked to this supplier.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-4 py-3 font-medium text-slate-600">Vehicle</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Driver</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Odometer</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Docs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vehicles.map(v => (
            <tr key={v.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{v.plate}</div>
                <div className="text-xs text-slate-500">
                  {v.brand} {v.model} · {v.year}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-700 hidden md:table-cell">
                {v.assignedDriverName ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-3 text-slate-700 hidden md:table-cell">
                {v.odometer.toLocaleString()} km
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[v.status] ?? 'bg-slate-100'}`}
                >
                  {v.status}
                </span>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    v.documentStatus === 'valid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : v.documentStatus === 'expiring_soon'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {v.documentStatus?.replace('_', ' ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
