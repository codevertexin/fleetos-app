import { Hash, CreditCard, MapPin, Calendar } from 'lucide-react';
import type { VehicleSupplier } from '../../types';
import { ownershipTypeLabels } from './constants';

interface Props {
  supplier: VehicleSupplier;
  totalPaid: number;
  totalPending: number;
}

export function OverviewTab({ supplier, totalPaid, totalPending }: Props) {
  const infoRows = [
    { label: 'Tax ID / NIF', value: supplier.taxId, icon: Hash },
    { label: 'IBAN', value: supplier.iban, icon: CreditCard },
    { label: 'Address', value: supplier.address, icon: MapPin },
    {
      label: 'Member Since',
      value: supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString('pt-PT') : '—',
      icon: Calendar,
    },
  ].filter(r => r.value);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Details</h3>
        {infoRows.map(row => (
          <div key={row.label} className="flex items-start gap-3">
            <row.icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-slate-500">{row.label}</div>
              <div className="text-sm text-slate-900">{row.value}</div>
            </div>
          </div>
        ))}
        {supplier.notes && (
          <div className="mt-2 pt-4 border-t border-slate-100 text-sm text-slate-600 italic">
            {supplier.notes}
          </div>
        )}
      </div>

      {/* Financial summary */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Paid Out (all time)</span>
              <span className="font-semibold text-slate-900">€{(supplier.totalPaidOut ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Paid (selected payouts)</span>
              <span className="font-medium text-emerald-700">€{totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Pending / Processing</span>
              <span className="font-medium text-amber-700">€{totalPending.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Quick Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Type</span>
              <span className="font-medium capitalize">{supplier.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ownership Category</span>
              <span className="font-medium">{ownershipTypeLabels[supplier.ownershipType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vehicles in Fleet</span>
              <span className="font-medium">{supplier.vehicleCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Contracts</span>
              <span className="font-medium">{supplier.activeContracts}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
