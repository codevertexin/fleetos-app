import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import type { FleetosVehicleFormValues, FleetosVehicleRecord } from '@/types/fleetos-vehicle';
import { EMPTY_VEHICLE_FORM } from '@/types/fleetos-vehicle';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'rented', label: 'Rented' },
  { value: 'inactive', label: 'Inactive' },
] as const;

function recordToForm(v: FleetosVehicleRecord): FleetosVehicleFormValues {
  return {
    plate: v.plate,
    brand: v.brand,
    model: v.model,
    year: v.year != null ? String(v.year) : '',
    status: v.status,
    odometer_km: String(v.odometer_km),
    vin: v.vin ?? '',
    color: v.color ?? '',
    fuel: v.fuel ?? '',
    ownership_type: v.ownership_type,
  };
}

function formToPayload(values: FleetosVehicleFormValues): Record<string, unknown> {
  const yearTrim = values.year.trim();
  return {
    plate: values.plate.trim(),
    brand: values.brand.trim(),
    model: values.model.trim(),
    year: yearTrim ? Number.parseInt(yearTrim, 10) : null,
    status: values.status,
    odometer_km: Number.parseInt(values.odometer_km, 10) || 0,
    vin: values.vin.trim() || null,
    color: values.color.trim() || null,
    fuel: values.fuel.trim() || null,
    ownership_type: values.ownership_type,
  };
}

interface VehicleFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: FleetosVehicleRecord | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  busy?: boolean;
  error?: string | null;
}

export function VehicleFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  busy,
  error,
}: VehicleFormModalProps) {
  const [values, setValues] = useState<FleetosVehicleFormValues>(() =>
    initial ? recordToForm(initial) : { ...EMPTY_VEHICLE_FORM },
  );

  const title = mode === 'create' ? 'Add vehicle' : 'Edit vehicle';

  const set = (key: keyof FleetosVehicleFormValues, value: string) => {
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
            label="Plate"
            value={values.plate}
            onChange={(e) => set('plate', e.target.value)}
            required
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
          <Input
            label="Brand"
            value={values.brand}
            onChange={(e) => set('brand', e.target.value)}
            required
            disabled={busy}
          />
          <Input
            label="Model"
            value={values.model}
            onChange={(e) => set('model', e.target.value)}
            required
            disabled={busy}
          />
          <Input
            label="Year"
            type="number"
            min={1980}
            max={2100}
            value={values.year}
            onChange={(e) => set('year', e.target.value)}
            disabled={busy}
          />
          <Input
            label="Odometer (km)"
            type="number"
            min={0}
            value={values.odometer_km}
            onChange={(e) => set('odometer_km', e.target.value)}
            disabled={busy}
          />
          <Input
            label="Fuel"
            value={values.fuel}
            onChange={(e) => set('fuel', e.target.value)}
            disabled={busy}
          />
          <Input
            label="Color"
            value={values.color}
            onChange={(e) => set('color', e.target.value)}
            disabled={busy}
          />
        </div>
        <Input
          label="VIN"
          value={values.vin}
          onChange={(e) => set('vin', e.target.value)}
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
            {mode === 'create' ? 'Create vehicle' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
