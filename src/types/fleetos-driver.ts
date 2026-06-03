/** FleetOS P2.2 — driver records from Edge API. */

export type FleetosDriverStatus =
  | 'active'
  | 'inactive'
  | 'on_trip'
  | 'available'
  | 'off_duty';

export type FleetosDriverAvailability = 'available' | 'busy' | 'off';

export interface FleetosDriverRecord {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  status: FleetosDriverStatus;
  availability: FleetosDriverAvailability | null;
  license_expires_at: string | null;
  tvde_cert_expires_at: string | null;
  tax_id: string | null;
  address: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FleetosDriverFormValues {
  full_name: string;
  phone: string;
  email: string;
  status: FleetosDriverStatus;
  availability: string;
  license_expires_at: string;
  tvde_cert_expires_at: string;
  tax_id: string;
  address: string;
}

export const EMPTY_DRIVER_FORM: FleetosDriverFormValues = {
  full_name: '',
  phone: '',
  email: '',
  status: 'active',
  availability: '',
  license_expires_at: '',
  tvde_cert_expires_at: '',
  tax_id: '',
  address: '',
};
