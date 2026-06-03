import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import type { FleetosDriverFormValues, FleetosDriverRecord } from '@/types/fleetos-driver';
import { EMPTY_DRIVER_FORM } from '@/types/fleetos-driver';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'available', label: 'Available' },
  { value: 'on_trip', label: 'On trip' },
  { value: 'off_duty', label: 'Off duty' },
  { value: 'inactive', label: 'Inactive' },
] as const;

const AVAILABILITY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'off', label: 'Off' },
] as const;

function recordToForm(d: FleetosDriverRecord): FleetosDriverFormValues {
  return {
    full_name: d.full_name,
    phone: d.phone ?? '',
    email: d.email ?? '',
    status: d.status,
    availability: d.availability ?? '',
    license_expires_at: d.license_expires_at ?? '',
    tvde_cert_expires_at: d.tvde_cert_expires_at ?? '',
    tax_id: d.tax_id ?? '',
    address: d.address ?? '',
  };
}

function formToPayload(values: FleetosDriverFormValues): Record<string, unknown> {
  return {
    full_name: values.full_name.trim(),
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    status: values.status,
    availability: values.availability.trim() || null,
    license_expires_at: values.license_expires_at.trim() || null,
    tvde_cert_expires_at: values.tvde_cert_expires_at.trim() || null,
    tax_id: values.tax_id.trim() || null,
    address: values.address.trim() || null,
  };
}

interface DriverFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: FleetosDriverRecord | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  busy?: boolean;
  error?: string | null;
}

export function DriverFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  busy,
  error,
}: DriverFormModalProps) {
  const [values, setValues] = useState<FleetosDriverFormValues>(() =>
    initial ? recordToForm(initial) : { ...EMPTY_DRIVER_FORM },
  );

  const title = mode === 'create' ? 'Add driver' : 'Edit driver';

  const set = (key: keyof FleetosDriverFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formToPayload(values));
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            value={values.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            required
            disabled={busy}
            className="sm:col-span-2"
          />
          <Input
            label="Phone"
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            disabled={busy}
          />
          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            disabled={busy}
          />
          <Select
            label="Status"
            value={values.status}
            onChange={(e) => set('status', e.target.value)}
            disabled={busy}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Availability"
            value={values.availability}
            onChange={(e) => set('availability', e.target.value)}
            disabled={busy}
          >
            {AVAILABILITY_OPTIONS.map((o) => (
              <option key={o.value || 'none'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="License expires"
            type="date"
            value={values.license_expires_at}
            onChange={(e) => set('license_expires_at', e.target.value)}
            disabled={busy}
          />
          <Input
            label="TVDE cert expires"
            type="date"
            value={values.tvde_cert_expires_at}
            onChange={(e) => set('tvde_cert_expires_at', e.target.value)}
            disabled={busy}
          />
          <Input
            label="Tax ID (NIF)"
            value={values.tax_id}
            onChange={(e) => set('tax_id', e.target.value)}
            disabled={busy}
          />
        </div>
        <Input
          label="Address"
          value={values.address}
          onChange={(e) => set('address', e.target.value)}
          disabled={busy}
        />
        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {mode === 'create' ? 'Create driver' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
