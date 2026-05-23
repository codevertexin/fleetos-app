import { useState } from 'react';
import { mockUser } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      />
    </div>
  );
}

export function CompanyPanel() {
  const [company, setCompany] = useState({
    name: 'FleetOS Demo Company',
    nif: '501234567',
    address: 'Av. da Liberdade 100, Lisboa',
    phone: '+351 210 000 000',
    email: 'info@fleetos.app',
    slug: 'fleetos-demo',
    website: 'https://fleetos.app',
    country: 'Portugal',
    currency: 'EUR',
    timezone: 'Europe/Lisbon',
  });

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-foreground">Company Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Company Name"
          value={company.name}
          onChange={v => setCompany(c => ({ ...c, name: v }))}
        />
        <InputField
          label="NIF / Tax ID"
          value={company.nif}
          onChange={v => setCompany(c => ({ ...c, nif: v }))}
        />
        <InputField
          label="Phone"
          value={company.phone}
          onChange={v => setCompany(c => ({ ...c, phone: v }))}
        />
        <InputField
          label="Email"
          value={company.email}
          onChange={v => setCompany(c => ({ ...c, email: v }))}
          type="email"
        />
        <div className="sm:col-span-2">
          <InputField
            label="Address"
            value={company.address}
            onChange={v => setCompany(c => ({ ...c, address: v }))}
          />
        </div>
        <InputField
          label="Website"
          value={company.website}
          onChange={v => setCompany(c => ({ ...c, website: v }))}
        />
        <InputField
          label="Booking Slug"
          value={company.slug}
          onChange={v => setCompany(c => ({ ...c, slug: v }))}
        />
      </div>

      <hr className="border-border" />
      <h2 className="text-base font-semibold text-foreground">Regional Settings</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Country',
            key: 'country' as const,
            options: ['Portugal', 'Spain', 'France', 'United Kingdom'],
          },
          { label: 'Currency', key: 'currency' as const, options: ['EUR', 'GBP', 'USD'] },
          {
            label: 'Timezone',
            key: 'timezone' as const,
            options: [
              'Europe/Lisbon',
              'Europe/Madrid',
              'Europe/London',
              'Europe/Paris',
            ],
          },
        ].map(f => (
          <div key={f.label} className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {f.label}
            </label>
            <select
              value={company[f.key]}
              onChange={e => setCompany(c => ({ ...c, [f.key]: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {f.options.map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <hr className="border-border" />
      <h2 className="text-base font-semibold text-foreground">Your Account</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Your Name" value={mockUser.name} disabled />
        <InputField label="Your Email" value={mockUser.email} disabled />
        <InputField label="Role" value="Fleet Admin" disabled />
        <InputField label="Company ID" value={mockUser.companyId} disabled />
      </div>
    </div>
  );
}
