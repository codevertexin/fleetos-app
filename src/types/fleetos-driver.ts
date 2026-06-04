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
  license_no: string | null;
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
  license_no: string;
  status: FleetosDriverStatus;
  availability: string;
  license_expires_at: string;
  tvde_cert_expires_at: string;
  tax_id: string;
  address: string;
}

/** Payload for fleetos-create-driver (legacy + P2.2 fields). */
export interface FleetosDriverCreateInput {
  full_name: string;
  phone: string | null;
  email: string | null;
  license_no: string;
  status: FleetosDriverStatus;
  availability: FleetosDriverAvailability | null;
  license_expires_at: string;
  tvde_cert_expires_at: string | null;
  tax_id: string | null;
  address: string | null;
  external?: boolean;
  company_user_id?: string | null;
}

export const EMPTY_DRIVER_FORM: FleetosDriverFormValues = {
  full_name: '',
  phone: '',
  email: '',
  license_no: '',
  status: 'active',
  availability: '',
  license_expires_at: '',
  tvde_cert_expires_at: '',
  tax_id: '',
  address: '',
};
