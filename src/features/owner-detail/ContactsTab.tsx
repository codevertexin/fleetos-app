import { Users } from 'lucide-react';
import type { VehicleSupplier } from '../../types';

interface Props {
  supplier: VehicleSupplier;
}

export function ContactsTab({ supplier }: Props) {
  const contacts =
    supplier.type === 'company'
      ? [
          {
            name: supplier.contactPerson ?? 'Primary Contact',
            role: 'Account Manager',
            email: supplier.email ?? '',
            phone: supplier.phone ?? '',
            primary: true,
          },
          {
            name: 'Billing Department',
            role: 'Finance',
            email: `billing@${(supplier.email ?? '').split('@')[1] ?? 'example.com'}`,
            phone: '',
            primary: false,
          },
        ]
      : [
          {
            name: supplier.name,
            role: 'Owner',
            email: supplier.email ?? '',
            phone: supplier.phone ?? '',
            primary: true,
          },
        ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">People associated with this supplier</p>
        <button className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <Users className="w-4 h-4" /> Add Contact
        </button>
      </div>
      <div className="space-y-3">
        {contacts.map(c => (
          <div
            key={c.name}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-600">
              {c.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{c.name}</span>
                {c.primary && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    Primary
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">{c.role}</div>
            </div>
            <div className="space-y-0.5 text-sm text-right">
              {c.email && <div className="text-slate-600">{c.email}</div>}
              {c.phone && <div className="text-slate-500 text-xs">{c.phone}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
