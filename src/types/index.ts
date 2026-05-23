// ============================================================
// FleetOS Types
// ============================================================

export type Role = 'fleet_admin' | 'fleet_manager' | 'finance' | 'driver' | 'owner' | 'dispatcher' | 'operations';

export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'rented' | 'available';
export type DriverStatus = 'active' | 'inactive' | 'on_trip' | 'available' | 'off_duty';
export type BookingStatus = 'pending' | 'assigned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
export type ContractStatus = 'active' | 'expired' | 'pending' | 'terminated';
export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired' | 'missing';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';

// ─── Vehicle Ownership ────────────────────────────────────────────────────────

/** How the vehicle is sourced by the fleet */
export type OwnershipType =
  | 'company_owned'      // owned by our company
  | 'individual_owner'   // rented from a private individual
  | 'external_company'   // rented from an external company
  | 'leasing_partner';   // under a leasing/financing agreement

/** The category of the supplier / external owner */
export type SupplierType = 'individual' | 'company';

export type SupplierStatus = 'active' | 'inactive' | 'pending';

/** Settlement model for vehicle rental / payout calculation */
export type SettlementModel =
  | 'fixed'           // fixed monthly amount
  | 'percent_gross'   // % of gross platform income
  | 'percent_net'     // % of net (income minus deductible expenses)
  | 'hybrid';         // fixed base + percentage

// ─── Supplier / External Owner ───────────────────────────────────────────────

export interface VehicleSupplier {
  id: string;
  name: string;                   // person or company name
  type: SupplierType;             // individual | company
  ownershipType: OwnershipType;   // how this supplier relates to the fleet
  taxId?: string;                 // NIF / NIPC
  email?: string;
  phone?: string;
  address?: string;
  iban?: string;
  companyName?: string;           // if type === 'company'
  contactPerson?: string;         // if type === 'company', main contact
  status: SupplierStatus;
  // Aggregated counts (denormalised for list display)
  vehicleCount: number;
  activeContracts: number;
  pendingPayouts?: number;
  totalPaidOut?: number;
  notes?: string;
  createdAt: string;
}

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  companyId: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  status: VehicleStatus;
  odometer: number;

  // Ownership
  ownershipType: OwnershipType;
  supplierId?: string;            // ref to VehicleSupplier (null if company_owned)
  supplierName?: string;          // denormalised for display
  // Legacy fields kept for backwards compat (driver portal / ops portal)
  ownerId?: string;
  ownerName?: string;

  assignedDriverId?: string;
  assignedDriverName?: string;
  documentStatus: DocumentStatus;
  color: string;
  fuel: string;
  vin: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: DriverStatus;
  availability: 'available' | 'busy' | 'off';
  assignedVehicleId?: string;
  assignedVehiclePlate?: string;
  licenseExpiry: string;
  tvdeCertExpiry: string;
  nif: string;
  address: string;
  avatar?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: string;
  passengerCount: number;
  notes?: string;
  estimatedDuration: number;
  price: number;
  statusHistory: StatusHistoryItem[];
  createdAt: string;
}

export interface StatusHistoryItem {
  status: BookingStatus;
  timestamp: string;
  note?: string;
  userId?: string;
  userName?: string;
}

export interface Contract {
  id: string;
  /** driver = driver service contract; rental = vehicle rental from supplier */
  type: 'rental' | 'driver';
  status: ContractStatus;

  // Driver contract fields
  partyId: string;
  partyName: string;

  // Rental / supplier contract fields
  lessorType?: SupplierType;      // individual | company
  lessorId?: string;              // ref to VehicleSupplier
  lessorName?: string;

  vehicleId?: string;
  vehiclePlate?: string;

  startDate: string;
  endDate: string;

  settlementModel: SettlementModel;
  monthlyFixedAmount?: number;    // for fixed or hybrid
  percentage?: number;            // for percent_gross / percent_net / hybrid
  deductibleExpenses?: string[];  // list of expense types deducted before net calc

  /** Legacy: used for driver contracts — percentage of gross given to driver */
  value: number;

  paymentDay?: number;            // day of month payouts are triggered (1–28)
  contractDocument?: string;      // URL or filename

  notes?: string;
  documents: string[];
  createdAt: string;
}

export interface Assignment {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  startTime: string;
  endTime?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  odometerStart?: number;
  odometerEnd?: number;
  fuelStart?: number;
  fuelEnd?: number;
  checkInState?: 'ok' | 'issue';
  checkOutState?: 'ok' | 'issue';
  damageNotes?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  type: 'fuel' | 'maintenance' | 'toll' | 'fine' | 'insurance' | 'other';
  amount: number;
  date: string;
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  description: string;
  receipt?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Income {
  id: string;
  type: 'platform' | 'rental' | 'other';
  amount: number;
  date: string;
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  description: string;
  reference?: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  /** driver payout | owner = individual owner | supplier = external company / leasing */
  recipientType: 'driver' | 'owner' | 'supplier';
  recipientId: string;
  recipientName: string;
  /** For supplier payouts: the settlement model used */
  settlementModel?: SettlementModel;
  amount: number;
  period: string;
  status: PayoutStatus;
  method: string;
  reference?: string;
  processedAt?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  type: 'insurance' | 'inspection' | 'tvde_cert' | 'iuc' | 'driver_license' | 'owner_contract' | 'driver_contract' | 'rental_contract' | 'other';
  name: string;
  status: DocumentStatus;
  expiryDate?: string;
  entityId: string;
  entityType: 'vehicle' | 'driver' | 'supplier';
  entityName: string;
  fileUrl?: string;
  uploadedAt: string;
}

export interface Alert {
  id: string;
  type: 'document_expiry' | 'maintenance' | 'contract_ending' | 'payout' | 'booking';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  entityId: string;
  entityType: string;
  entityName: string;
  daysUntil?: number;
  isRead: boolean;
  createdAt: string;
}

export interface KPI {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  color?: string;
}
