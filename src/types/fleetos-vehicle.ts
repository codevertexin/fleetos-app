/** FleetOS P2.1 — vehicle records from Edge API. */

export type FleetosVehicleStatus =
  | 'active'
  | 'inactive'
  | 'maintenance'
  | 'available'
  | 'rented';

export type FleetosVehicleOwnershipType =
  | 'company_owned'
  | 'individual_owner'
  | 'external_company'
  | 'leasing_partner';

export interface FleetosVehicleRecord {
  id: string;
  tenant_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  status: FleetosVehicleStatus;
  odometer_km: number;
  vin: string | null;
  color: string | null;
  fuel: string | null;
  ownership_type: FleetosVehicleOwnershipType;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FleetosVehicleFormValues {
  plate: string;
  brand: string;
  model: string;
  year: string;
  status: FleetosVehicleStatus;
  odometer_km: string;
  vin: string;
  color: string;
  fuel: string;
  ownership_type: FleetosVehicleOwnershipType;
}

export const EMPTY_VEHICLE_FORM: FleetosVehicleFormValues = {
  plate: '',
  brand: '',
  model: '',
  year: '',
  status: 'active',
  odometer_km: '0',
  vin: '',
  color: '',
  fuel: '',
  ownership_type: 'company_owned',
};
