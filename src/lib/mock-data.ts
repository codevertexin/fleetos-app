import type { Vehicle, Driver, Booking, Contract, Assignment, Expense, Income, Payout, Document, Alert, User, VehicleSupplier, SettlementModel } from '../types';

// ============================================================
// Core Users / Auth
// ============================================================

export const mockUser: User = {
  id: 'u1',
  name: 'Carlos Mendes',
  email: 'carlos@fleetos.app',
  role: 'fleet_admin',
  companyId: 'c1',
};

// ============================================================
// Suppliers & External Owners
// ============================================================

export const mockSuppliers: VehicleSupplier[] = [
  {
    id: 'sup1',
    name: 'João Silva',
    type: 'individual',
    ownershipType: 'individual_owner',
    taxId: '123456789',
    email: 'joao.silva@example.com',
    phone: '+351 912 000 001',
    address: 'Rua das Flores 42, 1200-001 Lisboa',
    iban: 'PT50 0010 0000 1234 5678 9015 4',
    status: 'active',
    vehicleCount: 2,
    activeContracts: 1,
    pendingPayouts: 1,
    totalPaidOut: 12450,
    notes: 'Long-term partner, 2 vehicles in fleet since 2023.',
    createdAt: '2023-01-15',
  },
  {
    id: 'sup2',
    name: 'Ana Ferreira',
    type: 'individual',
    ownershipType: 'individual_owner',
    taxId: '987654321',
    email: 'ana.ferreira@example.com',
    phone: '+351 913 000 002',
    address: 'Av. da Liberdade 88, 1250-142 Lisboa',
    iban: 'PT50 0010 0000 9876 5432 1015 2',
    status: 'active',
    vehicleCount: 2,
    activeContracts: 1,
    pendingPayouts: 1,
    totalPaidOut: 9800,
    createdAt: '2023-02-20',
  },
  {
    id: 'sup3',
    name: 'AutoRent Lda',
    type: 'company',
    ownershipType: 'external_company',
    taxId: '508123456',
    email: 'geral@autorent.pt',
    phone: '+351 210 123 456',
    address: 'Zona Industrial de Alfragide, Lote 12, Amadora',
    iban: 'PT50 0033 0000 4567 8901 2340 5',
    status: 'active',
    vehicleCount: 2,
    activeContracts: 2,
    pendingPayouts: 0,
    totalPaidOut: 18600,
    contactPerson: 'Rui Baptista',
    notes: 'External fleet operator. Fixed monthly fee per vehicle.',
    createdAt: '2022-06-01',
  },
  {
    id: 'sup4',
    name: 'LeasePlan Portugal',
    type: 'company',
    ownershipType: 'leasing_partner',
    taxId: '500987654',
    email: 'fleet@leaseplan.pt',
    phone: '+351 218 500 600',
    address: 'Edifício Atrium Saldanha, Praça Duque de Saldanha 1, Lisboa',
    iban: 'PT50 0018 0000 1111 2222 3333 4',
    status: 'active',
    vehicleCount: 2,
    activeContracts: 2,
    pendingPayouts: 0,
    totalPaidOut: 5400,
    contactPerson: 'Carla Neves',
    notes: 'Operating lease — fixed monthly rental, no ownership transfer.',
    createdAt: '2023-05-15',
  },
];

// ============================================================
// Vehicles (with ownership fields)
// ============================================================

export const mockVehicles: Vehicle[] = [
  {
    id: 'v1', plate: '00-AA-01', brand: 'Toyota', model: 'Corolla', year: 2022, status: 'active',
    odometer: 45200, ownerId: 'o1', ownerName: 'João Silva', assignedDriverId: 'd1',
    assignedDriverName: 'Pedro Costa', documentStatus: 'valid', color: 'White', fuel: 'Hybrid',
    vin: 'VIN123456789', createdAt: '2023-01-15',
    ownershipType: 'individual_owner', supplierId: 'sup1', supplierName: 'João Silva',
  },
  {
    id: 'v2', plate: '11-BB-22', brand: 'Mercedes', model: 'E-Class', year: 2021, status: 'active',
    odometer: 82100, ownerId: 'o2', ownerName: 'Ana Ferreira', assignedDriverId: 'd2',
    assignedDriverName: 'Miguel Santos', documentStatus: 'expiring_soon', color: 'Black', fuel: 'Diesel',
    vin: 'VIN987654321', createdAt: '2023-02-20',
    ownershipType: 'individual_owner', supplierId: 'sup2', supplierName: 'Ana Ferreira',
  },
  {
    id: 'v3', plate: '22-CC-33', brand: 'BMW', model: '5 Series', year: 2023, status: 'available',
    odometer: 12400, ownerId: 'o1', ownerName: 'João Silva', documentStatus: 'valid', color: 'Grey',
    fuel: 'Petrol', vin: 'VIN111222333', createdAt: '2023-03-10',
    ownershipType: 'individual_owner', supplierId: 'sup1', supplierName: 'João Silva',
  },
  {
    id: 'v4', plate: '33-DD-44', brand: 'Volkswagen', model: 'Passat', year: 2020, status: 'maintenance',
    odometer: 134500, ownerId: 'o3', ownerName: 'AutoRent Lda', documentStatus: 'expired', color: 'Blue',
    fuel: 'Diesel', vin: 'VIN444555666', createdAt: '2022-06-01',
    ownershipType: 'external_company', supplierId: 'sup3', supplierName: 'AutoRent Lda',
  },
  {
    id: 'v5', plate: '44-EE-55', brand: 'Tesla', model: 'Model 3', year: 2023, status: 'active',
    odometer: 28900, ownerId: 'o2', ownerName: 'Ana Ferreira', assignedDriverId: 'd3',
    assignedDriverName: 'Sofia Lopes', documentStatus: 'valid', color: 'Red', fuel: 'Electric',
    vin: 'VIN777888999', createdAt: '2023-04-05',
    ownershipType: 'individual_owner', supplierId: 'sup2', supplierName: 'Ana Ferreira',
  },
  {
    id: 'v6', plate: '55-FF-66', brand: 'Skoda', model: 'Octavia', year: 2021, status: 'available',
    odometer: 67300, ownerId: 'o3', ownerName: 'AutoRent Lda', documentStatus: 'valid', color: 'White',
    fuel: 'Diesel', vin: 'VIN000111222', createdAt: '2023-01-28',
    ownershipType: 'external_company', supplierId: 'sup3', supplierName: 'AutoRent Lda',
  },
  {
    id: 'v7', plate: '66-GG-77', brand: 'Audi', model: 'A6', year: 2022, status: 'rented',
    odometer: 53800, ownerId: 'o4', ownerName: 'LeasePlan Portugal', assignedDriverId: 'd4',
    assignedDriverName: 'António Rodrigues', documentStatus: 'valid', color: 'Silver', fuel: 'Petrol',
    vin: 'VIN333444555', createdAt: '2023-05-15',
    ownershipType: 'leasing_partner', supplierId: 'sup4', supplierName: 'LeasePlan Portugal',
  },
  {
    id: 'v8', plate: '77-HH-88', brand: 'Ford', model: 'Mondeo', year: 2019, status: 'inactive',
    odometer: 189200, ownerId: 'o4', ownerName: 'LeasePlan Portugal', documentStatus: 'expired', color: 'Grey',
    fuel: 'Diesel', vin: 'VIN666777888', createdAt: '2022-01-10',
    ownershipType: 'leasing_partner', supplierId: 'sup4', supplierName: 'LeasePlan Portugal',
  },
  {
    id: 'v9', plate: '88-II-99', brand: 'Renault', model: 'Kangoo', year: 2022, status: 'active',
    odometer: 34600, documentStatus: 'valid', color: 'White', fuel: 'Electric',
    vin: 'VIN999000111', createdAt: '2022-09-01',
    ownershipType: 'company_owned',
  },
  {
    id: 'v10', plate: '99-JJ-00', brand: 'Peugeot', model: '308', year: 2023, status: 'available',
    odometer: 8900, documentStatus: 'valid', color: 'Blue', fuel: 'Hybrid',
    vin: 'VIN111000999', createdAt: '2023-08-15',
    ownershipType: 'company_owned',
  },
];

// ============================================================
// Drivers
// ============================================================

export const mockDrivers: Driver[] = [
  { id: 'd1', name: 'Pedro Costa', phone: '+351 912 345 678', email: 'pedro@example.com', status: 'on_trip', availability: 'busy', assignedVehicleId: 'v1', assignedVehiclePlate: '00-AA-01', licenseExpiry: '2026-08-15', tvdeCertExpiry: '2025-12-31', nif: '123456789', address: 'Rua das Flores 10, Lisboa', createdAt: '2023-01-15' },
  { id: 'd2', name: 'Miguel Santos', phone: '+351 913 456 789', email: 'miguel@example.com', status: 'active', availability: 'available', assignedVehicleId: 'v2', assignedVehiclePlate: '11-BB-22', licenseExpiry: '2025-06-30', tvdeCertExpiry: '2025-09-15', nif: '987654321', address: 'Av. da Liberdade 25, Lisboa', createdAt: '2023-02-20' },
  { id: 'd3', name: 'Sofia Lopes', phone: '+351 914 567 890', email: 'sofia@example.com', status: 'active', availability: 'busy', assignedVehicleId: 'v5', assignedVehiclePlate: '44-EE-55', licenseExpiry: '2027-03-20', tvdeCertExpiry: '2026-05-10', nif: '456789123', address: 'Rua do Ouro 8, Porto', createdAt: '2023-03-10' },
  { id: 'd4', name: 'António Rodrigues', phone: '+351 915 678 901', email: 'antonio@example.com', status: 'on_trip', availability: 'busy', assignedVehicleId: 'v7', assignedVehiclePlate: '66-GG-77', licenseExpiry: '2026-11-25', tvdeCertExpiry: '2025-08-20', nif: '789123456', address: 'Praça do Comércio 1, Lisboa', createdAt: '2023-04-05' },
  { id: 'd5', name: 'Luísa Carvalho', phone: '+351 916 789 012', email: 'luisa@example.com', status: 'available', availability: 'available', licenseExpiry: '2028-01-10', tvdeCertExpiry: '2027-04-30', nif: '321654987', address: 'Rua Garrett 15, Lisboa', createdAt: '2023-05-15' },
  { id: 'd6', name: 'Fernando Alves', phone: '+351 917 890 123', email: 'fernando@example.com', status: 'off_duty', availability: 'off', licenseExpiry: '2025-04-15', tvdeCertExpiry: '2025-03-01', nif: '654987321', address: 'Rua Santa Catarina 20, Porto', createdAt: '2023-06-01' },
];

// ============================================================
// Bookings
// ============================================================

export const mockBookings: Booking[] = [
  {
    id: 'b1', status: 'in_progress', customerId: 'cu1', customerName: 'Maria João', customerPhone: '+351 920 111 222', customerEmail: 'maria@example.com',
    driverId: 'd1', driverName: 'Pedro Costa', vehicleId: 'v1', vehiclePlate: '00-AA-01',
    pickupAddress: 'Aeroporto de Lisboa, Terminal 1', dropoffAddress: 'Hotel Bairro Alto, Rua da Rosa 10',
    scheduledAt: '2024-06-10T14:00:00', passengerCount: 2, price: 35, estimatedDuration: 40, notes: 'VIP client',
    statusHistory: [
      { status: 'pending', timestamp: '2024-06-10T10:00:00', userName: 'System' },
      { status: 'assigned', timestamp: '2024-06-10T10:15:00', userName: 'Carlos Mendes' },
      { status: 'confirmed', timestamp: '2024-06-10T10:30:00', userName: 'Pedro Costa' },
      { status: 'in_progress', timestamp: '2024-06-10T14:05:00', userName: 'Pedro Costa' },
    ],
    createdAt: '2024-06-10T10:00:00',
  },
  {
    id: 'b2', status: 'pending', customerId: 'cu2', customerName: 'Robert Smith', customerPhone: '+44 7911 123456', customerEmail: 'robert@example.com',
    pickupAddress: 'Hotel Tivoli, Av. da Liberdade', dropoffAddress: 'Oceanário de Lisboa',
    scheduledAt: '2024-06-11T09:00:00', passengerCount: 4, price: 25, estimatedDuration: 25,
    statusHistory: [{ status: 'pending', timestamp: '2024-06-10T15:00:00', userName: 'System' }],
    createdAt: '2024-06-10T15:00:00',
  },
  {
    id: 'b3', status: 'confirmed', customerId: 'cu3', customerName: 'Ana Silva', customerPhone: '+351 930 222 333', customerEmail: 'ana.s@example.com',
    driverId: 'd2', driverName: 'Miguel Santos', vehicleId: 'v2', vehiclePlate: '11-BB-22',
    pickupAddress: 'Estação de Oriente', dropoffAddress: 'Sintra, Palácio Nacional',
    scheduledAt: '2024-06-12T10:30:00', passengerCount: 3, price: 55, estimatedDuration: 60,
    statusHistory: [
      { status: 'pending', timestamp: '2024-06-10T08:00:00', userName: 'System' },
      { status: 'assigned', timestamp: '2024-06-10T08:30:00', userName: 'Carlos Mendes' },
      { status: 'confirmed', timestamp: '2024-06-10T09:00:00', userName: 'Miguel Santos' },
    ],
    createdAt: '2024-06-10T08:00:00',
  },
  {
    id: 'b4', status: 'completed', customerId: 'cu4', customerName: 'Paulo Bento', customerPhone: '+351 940 333 444', customerEmail: 'paulo@example.com',
    driverId: 'd3', driverName: 'Sofia Lopes', vehicleId: 'v5', vehiclePlate: '44-EE-55',
    pickupAddress: 'Porto, Aeroporto Francisco Sá Carneiro', dropoffAddress: 'Hotel Infante Sagres, Porto',
    scheduledAt: '2024-06-09T18:00:00', passengerCount: 1, price: 20, estimatedDuration: 25,
    statusHistory: [
      { status: 'pending', timestamp: '2024-06-09T14:00:00', userName: 'System' },
      { status: 'assigned', timestamp: '2024-06-09T14:15:00', userName: 'Carlos Mendes' },
      { status: 'confirmed', timestamp: '2024-06-09T14:30:00', userName: 'Sofia Lopes' },
      { status: 'in_progress', timestamp: '2024-06-09T18:05:00', userName: 'Sofia Lopes' },
      { status: 'completed', timestamp: '2024-06-09T18:32:00', userName: 'Sofia Lopes' },
    ],
    createdAt: '2024-06-09T14:00:00',
  },
  {
    id: 'b5', status: 'cancelled', customerId: 'cu5', customerName: 'Laura Mendes', customerPhone: '+351 950 444 555', customerEmail: 'laura@example.com',
    pickupAddress: 'Cascais Marina', dropoffAddress: 'Lisboa, Chiado',
    scheduledAt: '2024-06-10T12:00:00', passengerCount: 2, price: 40, estimatedDuration: 45,
    statusHistory: [
      { status: 'pending', timestamp: '2024-06-09T20:00:00', userName: 'System' },
      { status: 'cancelled', timestamp: '2024-06-09T22:00:00', note: 'Customer request', userName: 'Customer' },
    ],
    createdAt: '2024-06-09T20:00:00',
  },
  {
    id: 'b6', status: 'assigned', customerId: 'cu6', customerName: 'Thomas Müller', customerPhone: '+49 171 1234567', customerEmail: 'thomas@example.com',
    driverId: 'd4', driverName: 'António Rodrigues', vehicleId: 'v7', vehiclePlate: '66-GG-77',
    pickupAddress: 'Intercontinental Lisbon', dropoffAddress: 'Palácio de Queluz',
    scheduledAt: '2024-06-11T14:00:00', passengerCount: 2, price: 45, estimatedDuration: 35,
    statusHistory: [
      { status: 'pending', timestamp: '2024-06-10T11:00:00', userName: 'System' },
      { status: 'assigned', timestamp: '2024-06-10T11:30:00', userName: 'Carlos Mendes' },
    ],
    createdAt: '2024-06-10T11:00:00',
  },
];

// ============================================================
// Contracts (updated with supplier/lessor fields)
// ============================================================

export const mockContracts: Contract[] = [
  {
    id: 'c1', type: 'driver', status: 'active', partyId: 'd1', partyName: 'Pedro Costa',
    startDate: '2024-01-01', endDate: '2024-12-31',
    settlementModel: 'percent_gross' as SettlementModel, value: 70,
    documents: [], createdAt: '2023-12-20',
  },
  {
    id: 'c2', type: 'rental', status: 'active', partyId: 'sup2', partyName: 'Ana Ferreira',
    vehicleId: 'v2', vehiclePlate: '11-BB-22',
    startDate: '2024-03-01', endDate: '2025-02-28',
    settlementModel: 'fixed' as SettlementModel, value: 450,
    lessorId: 'sup2', lessorName: 'Ana Ferreira', lessorType: 'individual',
    monthlyFixedAmount: 450, paymentDay: 1,
    documents: [], createdAt: '2024-02-20',
  },
  {
    id: 'c3', type: 'driver', status: 'active', partyId: 'd2', partyName: 'Miguel Santos',
    startDate: '2024-02-01', endDate: '2024-07-31',
    settlementModel: 'hybrid' as SettlementModel, value: 65,
    documents: [], createdAt: '2024-01-25',
  },
  {
    id: 'c4', type: 'rental', status: 'expired', partyId: 'sup3', partyName: 'AutoRent Lda',
    vehicleId: 'v4', vehiclePlate: '33-DD-44',
    startDate: '2023-01-01', endDate: '2024-01-01',
    settlementModel: 'fixed' as SettlementModel, value: 380,
    lessorId: 'sup3', lessorName: 'AutoRent Lda', lessorType: 'company',
    monthlyFixedAmount: 380, paymentDay: 1,
    documents: [], createdAt: '2022-12-15',
  },
  {
    id: 'c5', type: 'driver', status: 'pending', partyId: 'd5', partyName: 'Luísa Carvalho',
    startDate: '2024-07-01', endDate: '2025-06-30',
    settlementModel: 'percent_gross' as SettlementModel, value: 72,
    documents: [], createdAt: '2024-06-01',
  },
  {
    id: 'c6', type: 'rental', status: 'active', partyId: 'sup3', partyName: 'AutoRent Lda',
    vehicleId: 'v6', vehiclePlate: '55-FF-66',
    startDate: '2024-01-01', endDate: '2024-12-31',
    settlementModel: 'fixed' as SettlementModel, value: 420,
    lessorId: 'sup3', lessorName: 'AutoRent Lda', lessorType: 'company',
    monthlyFixedAmount: 420, paymentDay: 5,
    documents: [], createdAt: '2023-12-20',
  },
  {
    id: 'c7', type: 'rental', status: 'active', partyId: 'sup4', partyName: 'LeasePlan Portugal',
    vehicleId: 'v7', vehiclePlate: '66-GG-77',
    startDate: '2023-05-15', endDate: '2026-05-14',
    settlementModel: 'fixed' as SettlementModel, value: 680,
    lessorId: 'sup4', lessorName: 'LeasePlan Portugal', lessorType: 'company',
    monthlyFixedAmount: 680, paymentDay: 15,
    documents: [], createdAt: '2023-05-10',
  },
  {
    id: 'c8', type: 'rental', status: 'active', partyId: 'sup4', partyName: 'LeasePlan Portugal',
    vehicleId: 'v8', vehiclePlate: '77-HH-88',
    startDate: '2022-01-10', endDate: '2025-01-09',
    settlementModel: 'fixed' as SettlementModel, value: 590,
    lessorId: 'sup4', lessorName: 'LeasePlan Portugal', lessorType: 'company',
    monthlyFixedAmount: 590, paymentDay: 10,
    documents: [], createdAt: '2022-01-05',
  },
  {
    id: 'c9', type: 'rental', status: 'active', partyId: 'sup1', partyName: 'João Silva',
    vehicleId: 'v1', vehiclePlate: '00-AA-01',
    startDate: '2023-01-15', endDate: '2025-01-14',
    settlementModel: 'percent_net' as SettlementModel, value: 30, percentage: 30,
    lessorId: 'sup1', lessorName: 'João Silva', lessorType: 'individual',
    paymentDay: 5,
    documents: [], createdAt: '2023-01-10',
  },
];

// ============================================================
// Assignments
// ============================================================

export const mockAssignments: Assignment[] = [
  { id: 'a1', vehicleId: 'v1', vehiclePlate: '00-AA-01', driverId: 'd1', driverName: 'Pedro Costa', startTime: '2024-06-10T08:00:00', status: 'active', odometerStart: 45100, fuelStart: 80, checkInState: 'ok', createdAt: '2024-06-10T07:30:00' },
  { id: 'a2', vehicleId: 'v2', vehiclePlate: '11-BB-22', driverId: 'd2', driverName: 'Miguel Santos', startTime: '2024-06-10T07:00:00', status: 'active', odometerStart: 81900, fuelStart: 60, checkInState: 'ok', createdAt: '2024-06-10T06:45:00' },
  { id: 'a3', vehicleId: 'v5', vehiclePlate: '44-EE-55', driverId: 'd3', driverName: 'Sofia Lopes', startTime: '2024-06-10T09:00:00', status: 'scheduled', createdAt: '2024-06-09T18:00:00' },
  { id: 'a4', vehicleId: 'v7', vehiclePlate: '66-GG-77', driverId: 'd4', driverName: 'António Rodrigues', startTime: '2024-06-09T08:00:00', endTime: '2024-06-09T20:00:00', status: 'completed', odometerStart: 53200, odometerEnd: 53800, fuelStart: 70, fuelEnd: 45, checkInState: 'ok', checkOutState: 'ok', createdAt: '2024-06-09T07:30:00' },
];

// ============================================================
// Expenses & Income
// ============================================================

export const mockExpenses: Expense[] = [
  { id: 'e1', type: 'fuel', amount: 65.50, date: '2024-06-10', vehicleId: 'v1', vehiclePlate: '00-AA-01', description: 'Full tank at Galp', status: 'approved', createdAt: '2024-06-10T10:00:00' },
  { id: 'e2', type: 'maintenance', amount: 320, date: '2024-06-08', vehicleId: 'v4', vehiclePlate: '33-DD-44', description: 'Oil change and brake inspection', status: 'approved', createdAt: '2024-06-08T14:00:00' },
  { id: 'e3', type: 'toll', amount: 8.20, date: '2024-06-10', vehicleId: 'v2', vehiclePlate: '11-BB-22', driverId: 'd2', driverName: 'Miguel Santos', description: 'Via Verde charges June 10', status: 'pending', createdAt: '2024-06-10T18:00:00' },
  { id: 'e4', type: 'fine', amount: 60, date: '2024-06-05', vehicleId: 'v3', vehiclePlate: '22-CC-33', description: 'Parking fine Rua Augusta', status: 'pending', createdAt: '2024-06-05T12:00:00' },
  { id: 'e5', type: 'insurance', amount: 890, date: '2024-06-01', vehicleId: 'v5', vehiclePlate: '44-EE-55', description: 'Annual insurance premium', status: 'approved', createdAt: '2024-06-01T09:00:00' },
  { id: 'e6', type: 'fuel', amount: 72.30, date: '2024-06-09', vehicleId: 'v7', vehiclePlate: '66-GG-77', description: 'Repsol station', status: 'approved', createdAt: '2024-06-09T11:00:00' },
];

export const mockIncomes: Income[] = [
  { id: 'i1', type: 'platform', amount: 1240.50, date: '2024-06-10', vehicleId: 'v1', vehiclePlate: '00-AA-01', driverId: 'd1', driverName: 'Pedro Costa', description: 'Uber earnings June 10', createdAt: '2024-06-10T23:00:00' },
  { id: 'i2', type: 'platform', amount: 980.20, date: '2024-06-10', vehicleId: 'v2', vehiclePlate: '11-BB-22', driverId: 'd2', driverName: 'Miguel Santos', description: 'Bolt earnings June 10', createdAt: '2024-06-10T23:00:00' },
  { id: 'i3', type: 'rental', amount: 450, date: '2024-06-01', vehicleId: 'v2', vehiclePlate: '11-BB-22', description: 'Monthly rental payment Ana Ferreira', reference: 'INV-2024-06-001', createdAt: '2024-06-01T10:00:00' },
  { id: 'i4', type: 'platform', amount: 1560, date: '2024-06-09', vehicleId: 'v5', vehiclePlate: '44-EE-55', driverId: 'd3', driverName: 'Sofia Lopes', description: 'Uber earnings June 9', createdAt: '2024-06-09T23:00:00' },
];

// ============================================================
// Payouts (drivers + owners + suppliers)
// ============================================================

export const mockPayouts: Payout[] = [
  {
    id: 'p1', recipientType: 'driver', recipientId: 'd1', recipientName: 'Pedro Costa',
    amount: 868, period: '2024-06', status: 'pending', method: 'Bank Transfer',
    settlementModel: 'percent_gross', createdAt: '2024-06-10',
  },
  {
    id: 'p2', recipientType: 'driver', recipientId: 'd2', recipientName: 'Miguel Santos',
    amount: 637.13, period: '2024-06', status: 'pending', method: 'Bank Transfer',
    settlementModel: 'hybrid', createdAt: '2024-06-10',
  },
  {
    id: 'p3', recipientType: 'owner', recipientId: 'sup1', recipientName: 'João Silva',
    amount: 372.50, period: '2024-05', status: 'paid', method: 'Bank Transfer',
    reference: 'PAY-2024-05-001', processedAt: '2024-06-05',
    settlementModel: 'percent_net', createdAt: '2024-06-01',
  },
  {
    id: 'p4', recipientType: 'driver', recipientId: 'd3', recipientName: 'Sofia Lopes',
    amount: 1123.20, period: '2024-05', status: 'paid', method: 'Bank Transfer',
    reference: 'PAY-2024-05-002', processedAt: '2024-06-05',
    settlementModel: 'percent_gross', createdAt: '2024-06-01',
  },
  {
    id: 'p5', recipientType: 'owner', recipientId: 'sup2', recipientName: 'Ana Ferreira',
    amount: 890, period: '2024-06', status: 'processing', method: 'Bank Transfer',
    settlementModel: 'fixed', createdAt: '2024-06-10',
  },
  {
    id: 'p6', recipientType: 'supplier', recipientId: 'sup3', recipientName: 'AutoRent Lda',
    amount: 800, period: '2024-06', status: 'paid', method: 'Bank Transfer',
    reference: 'PAY-SUP-2024-06-001', processedAt: '2024-06-05',
    settlementModel: 'fixed', createdAt: '2024-06-01',
  },
  {
    id: 'p7', recipientType: 'supplier', recipientId: 'sup4', recipientName: 'LeasePlan Portugal',
    amount: 1270, period: '2024-06', status: 'paid', method: 'Bank Transfer',
    reference: 'PAY-SUP-2024-06-002', processedAt: '2024-06-15',
    settlementModel: 'fixed', createdAt: '2024-06-01',
  },
  {
    id: 'p8', recipientType: 'supplier', recipientId: 'sup3', recipientName: 'AutoRent Lda',
    amount: 800, period: '2024-05', status: 'paid', method: 'Bank Transfer',
    reference: 'PAY-SUP-2024-05-001', processedAt: '2024-05-05',
    settlementModel: 'fixed', createdAt: '2024-05-01',
  },
  {
    id: 'p9', recipientType: 'supplier', recipientId: 'sup4', recipientName: 'LeasePlan Portugal',
    amount: 1270, period: '2024-05', status: 'paid', method: 'Bank Transfer',
    reference: 'PAY-SUP-2024-05-002', processedAt: '2024-05-15',
    settlementModel: 'fixed', createdAt: '2024-05-01',
  },
  {
    id: 'p10', recipientType: 'owner', recipientId: 'sup1', recipientName: 'João Silva',
    amount: 356, period: '2024-06', status: 'pending', method: 'Bank Transfer',
    settlementModel: 'percent_net', createdAt: '2024-06-30',
  },
];

// ============================================================
// Documents
// ============================================================

export const mockDocuments: Document[] = [
  { id: 'doc1', type: 'insurance', name: 'Vehicle Insurance 00-AA-01', status: 'valid', expiryDate: '2025-01-15', entityId: 'v1', entityType: 'vehicle', entityName: '00-AA-01', uploadedAt: '2024-01-15' },
  { id: 'doc2', type: 'inspection', name: 'IPO 11-BB-22', status: 'expiring_soon', expiryDate: '2024-07-01', entityId: 'v2', entityType: 'vehicle', entityName: '11-BB-22', uploadedAt: '2023-07-01' },
  { id: 'doc3', type: 'tvde_cert', name: 'TVDE Certificate Pedro Costa', status: 'valid', expiryDate: '2025-12-31', entityId: 'd1', entityType: 'driver', entityName: 'Pedro Costa', uploadedAt: '2024-01-01' },
  { id: 'doc4', type: 'driver_license', name: 'License Miguel Santos', status: 'expiring_soon', expiryDate: '2025-06-30', entityId: 'd2', entityType: 'driver', entityName: 'Miguel Santos', uploadedAt: '2019-06-30' },
  { id: 'doc5', type: 'iuc', name: 'IUC 33-DD-44', status: 'expired', expiryDate: '2024-05-01', entityId: 'v4', entityType: 'vehicle', entityName: '33-DD-44', uploadedAt: '2023-05-01' },
  { id: 'doc6', type: 'tvde_cert', name: 'TVDE Fernando Alves', status: 'expired', expiryDate: '2024-03-01', entityId: 'd6', entityType: 'driver', entityName: 'Fernando Alves', uploadedAt: '2023-03-01' },
  { id: 'doc7', type: 'insurance', name: 'Vehicle Insurance 44-EE-55', status: 'valid', expiryDate: '2025-04-05', entityId: 'v5', entityType: 'vehicle', entityName: '44-EE-55', uploadedAt: '2024-04-05' },
  { id: 'doc8', type: 'driver_license', name: 'License Fernando Alves', status: 'expiring_soon', expiryDate: '2025-04-15', entityId: 'd6', entityType: 'driver', entityName: 'Fernando Alves', uploadedAt: '2019-04-15' },
];

// ============================================================
// Alerts
// ============================================================

export const mockAlerts: Alert[] = [
  { id: 'al1', type: 'document_expiry', severity: 'high', title: 'IUC Expired', description: 'Vehicle 33-DD-44 IUC has expired. Renewal required immediately.', entityId: 'v4', entityType: 'vehicle', entityName: '33-DD-44', daysUntil: -40, isRead: false, createdAt: '2024-06-01' },
  { id: 'al2', type: 'document_expiry', severity: 'high', title: 'TVDE Certificate Expired', description: 'Driver Fernando Alves TVDE certificate has expired.', entityId: 'd6', entityType: 'driver', entityName: 'Fernando Alves', daysUntil: -100, isRead: false, createdAt: '2024-06-01' },
  { id: 'al3', type: 'document_expiry', severity: 'medium', title: 'IPO Expiring Soon', description: 'Vehicle 11-BB-22 inspection due in 21 days.', entityId: 'v2', entityType: 'vehicle', entityName: '11-BB-22', daysUntil: 21, isRead: false, createdAt: '2024-06-01' },
  { id: 'al4', type: 'document_expiry', severity: 'medium', title: 'Driver License Expiring', description: 'Miguel Santos license expires in 20 days.', entityId: 'd2', entityType: 'driver', entityName: 'Miguel Santos', daysUntil: 20, isRead: true, createdAt: '2024-06-01' },
  { id: 'al5', type: 'contract_ending', severity: 'medium', title: 'Contract Ending Soon', description: 'Driver contract for Miguel Santos ends in 51 days.', entityId: 'c3', entityType: 'contract', entityName: 'Miguel Santos', daysUntil: 51, isRead: false, createdAt: '2024-06-01' },
  { id: 'al6', type: 'payout', severity: 'low', title: 'Payouts Pending', description: '2 driver payouts pending for period 2024-06.', entityId: '', entityType: 'payout', entityName: 'June 2024', isRead: false, createdAt: '2024-06-10' },
];

// ============================================================
// Charts: Core Analytics
// ============================================================

export const mockMonthlyRevenue = [
  { month: 'Jan', revenue: 12400, expenses: 4200, profit: 8200 },
  { month: 'Feb', revenue: 14800, expenses: 4800, profit: 10000 },
  { month: 'Mar', revenue: 13200, expenses: 5100, profit: 8100 },
  { month: 'Apr', revenue: 16500, expenses: 5400, profit: 11100 },
  { month: 'May', revenue: 15800, expenses: 4900, profit: 10900 },
  { month: 'Jun', revenue: 18200, expenses: 5800, profit: 12400 },
];

export const mockBookingsByStatus = [
  { name: 'Completed', value: 142, color: '#00B39A' },
  { name: 'In Progress', value: 8, color: '#22C7D8' },
  { name: 'Confirmed', value: 23, color: '#1F6A8A' },
  { name: 'Pending', value: 14, color: '#F59E0B' },
  { name: 'Cancelled', value: 18, color: '#EF4444' },
];

export const mockFleetUtilization = [
  { vehicle: 'v1', plate: '00-AA-01', utilization: 88 },
  { vehicle: 'v2', plate: '11-BB-22', utilization: 72 },
  { vehicle: 'v3', plate: '22-CC-33', utilization: 45 },
  { vehicle: 'v5', plate: '44-EE-55', utilization: 91 },
  { vehicle: 'v6', plate: '55-FF-66', utilization: 38 },
  { vehicle: 'v7', plate: '66-GG-77', utilization: 80 },
];

export const mockDriverPerformance = [
  { driver: 'Pedro Costa', trips: 45, revenue: 1580, rating: 4.9 },
  { driver: 'Miguel Santos', trips: 38, revenue: 1240, rating: 4.7 },
  { driver: 'Sofia Lopes', trips: 52, revenue: 1860, rating: 4.8 },
  { driver: 'António Rodrigues', trips: 41, revenue: 1450, rating: 4.6 },
];

// ============================================================
// Charts: Ownership & Supplier Analytics
// ============================================================

export const mockProfitByOwnershipType = [
  { month: 'Jan', company_owned: 3200, individual_owner: 2800, external_company: 1600, leasing_partner: 600 },
  { month: 'Feb', company_owned: 3800, individual_owner: 3100, external_company: 1900, leasing_partner: 1200 },
  { month: 'Mar', company_owned: 3400, individual_owner: 2700, external_company: 1700, leasing_partner: 300 },
  { month: 'Apr', company_owned: 4200, individual_owner: 3400, external_company: 2100, leasing_partner: 1400 },
  { month: 'May', company_owned: 4100, individual_owner: 3200, external_company: 2200, leasing_partner: 1400 },
  { month: 'Jun', company_owned: 4800, individual_owner: 3900, external_company: 2500, leasing_partner: 1200 },
];

export const mockPayoutsBySupplier = [
  { name: 'João Silva', paid: 12450, pending: 728.50, type: 'individual' },
  { name: 'Ana Ferreira', paid: 9800, pending: 890, type: 'individual' },
  { name: 'AutoRent Lda', paid: 18600, pending: 0, type: 'company' },
  { name: 'LeasePlan Portugal', paid: 5400, pending: 0, type: 'leasing' },
];

export const mockVehiclesByOwnershipType = [
  { name: 'Company Owned', value: 2, color: '#00B39A' },
  { name: 'Individual Owner', value: 4, color: '#22C7D8' },
  { name: 'External Company', value: 2, color: '#1F6A8A' },
  { name: 'Leasing Partner', value: 2, color: '#F59E0B' },
];

export const mockExternalFleetCost = [
  { month: 'Jan', autorent: 760, leaseplan: 1270, total: 2030 },
  { month: 'Feb', autorent: 800, leaseplan: 1270, total: 2070 },
  { month: 'Mar', autorent: 800, leaseplan: 1270, total: 2070 },
  { month: 'Apr', autorent: 800, leaseplan: 1270, total: 2070 },
  { month: 'May', autorent: 800, leaseplan: 1270, total: 2070 },
  { month: 'Jun', autorent: 800, leaseplan: 1270, total: 2070 },
];

// ============================================================
// Owner Portal Mock Data
// ============================================================

export interface OwnerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  nif: string;
  iban: string;
  address: string;
  companyName?: string;
}

export interface OwnerStatement {
  id: string;
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  payoutAmount: number;
  payoutStatus: 'pending' | 'processing' | 'paid';
  pdfUrl?: string;
  createdAt: string;
}

export interface OwnerPayout {
  id: string;
  period: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  method: string;
  reference?: string;
  processedAt?: string;
  createdAt: string;
}

export const mockOwnerProfile: OwnerProfile = {
  id: 'o1',
  name: 'João Silva',
  email: 'joao.silva@example.com',
  phone: '+351 912 000 001',
  nif: '123456789',
  iban: 'PT50 0010 0000 1234 5678 9015 4',
  address: 'Rua das Flores 42, 1200-001 Lisboa',
  companyName: 'JS Automóveis Lda',
};

export const mockOwnerStatements: OwnerStatement[] = [
  { id: 'st1', period: '2024-06', totalIncome: 4820, totalExpenses: 1240, netProfit: 3580, payoutAmount: 2866, payoutStatus: 'pending', createdAt: '2024-06-30' },
  { id: 'st2', period: '2024-05', totalIncome: 4450, totalExpenses: 1080, netProfit: 3370, payoutAmount: 2696, payoutStatus: 'paid', pdfUrl: '#', createdAt: '2024-05-31' },
  { id: 'st3', period: '2024-04', totalIncome: 4100, totalExpenses: 920, netProfit: 3180, payoutAmount: 2544, payoutStatus: 'paid', pdfUrl: '#', createdAt: '2024-04-30' },
  { id: 'st4', period: '2024-03', totalIncome: 3900, totalExpenses: 1100, netProfit: 2800, payoutAmount: 2240, payoutStatus: 'paid', pdfUrl: '#', createdAt: '2024-03-31' },
  { id: 'st5', period: '2024-02', totalIncome: 3600, totalExpenses: 880, netProfit: 2720, payoutAmount: 2176, payoutStatus: 'paid', pdfUrl: '#', createdAt: '2024-02-29' },
  { id: 'st6', period: '2024-01', totalIncome: 3200, totalExpenses: 750, netProfit: 2450, payoutAmount: 1960, payoutStatus: 'paid', pdfUrl: '#', createdAt: '2024-01-31' },
];

export const mockOwnerPayouts: OwnerPayout[] = [
  { id: 'op1', period: '2024-06', amount: 2866, status: 'pending', method: 'Bank Transfer', createdAt: '2024-07-01' },
  { id: 'op2', period: '2024-05', amount: 2696, status: 'paid', method: 'Bank Transfer', reference: 'OWN-PAY-2024-05-001', processedAt: '2024-06-05', createdAt: '2024-06-01' },
  { id: 'op3', period: '2024-04', amount: 2544, status: 'paid', method: 'Bank Transfer', reference: 'OWN-PAY-2024-04-001', processedAt: '2024-05-05', createdAt: '2024-05-01' },
  { id: 'op4', period: '2024-03', amount: 2240, status: 'paid', method: 'Bank Transfer', reference: 'OWN-PAY-2024-03-001', processedAt: '2024-04-05', createdAt: '2024-04-01' },
];

export const mockOwnerVehicles = mockVehicles.filter(v => v.ownerId === 'o1');

// ============================================================
// Operations Portal Mock Data
// ============================================================

export interface DispatchBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: string;
  status: string;
  driverName?: string;
  vehiclePlate?: string;
  passengerCount: number;
  price: number;
  urgent?: boolean;
}

export interface TimelineEvent {
  time: string;
  type: 'booking_start' | 'booking_end' | 'driver_checkin' | 'driver_checkout' | 'alert';
  title: string;
  subtitle: string;
  driverName?: string;
  vehiclePlate?: string;
  color: string;
}

export const mockDispatchBookings: DispatchBooking[] = [
  { id: 'b1', customerName: 'Maria João', customerPhone: '+351 920 111 222', pickupAddress: 'Aeroporto de Lisboa', dropoffAddress: 'Hotel Bairro Alto', scheduledAt: '2024-06-10T14:00:00', status: 'in_progress', driverName: 'Pedro Costa', vehiclePlate: '00-AA-01', passengerCount: 2, price: 35 },
  { id: 'b2', customerName: 'Robert Smith', customerPhone: '+44 7911 123456', pickupAddress: 'Hotel Tivoli', dropoffAddress: 'Oceanário de Lisboa', scheduledAt: '2024-06-11T09:00:00', status: 'pending', passengerCount: 4, price: 25, urgent: true },
  { id: 'b3', customerName: 'Ana Silva', customerPhone: '+351 930 222 333', pickupAddress: 'Estação de Oriente', dropoffAddress: 'Sintra', scheduledAt: '2024-06-12T10:30:00', status: 'confirmed', driverName: 'Miguel Santos', vehiclePlate: '11-BB-22', passengerCount: 3, price: 55 },
  { id: 'b6', customerName: 'Thomas Müller', customerPhone: '+49 171 1234567', pickupAddress: 'Intercontinental Lisbon', dropoffAddress: 'Palácio de Queluz', scheduledAt: '2024-06-11T14:00:00', status: 'assigned', driverName: 'António Rodrigues', vehiclePlate: '66-GG-77', passengerCount: 2, price: 45 },
  { id: 'b7', customerName: 'Claire Dupont', customerPhone: '+33 6 12 34 56 78', pickupAddress: 'Lisboa Santa Apolónia', dropoffAddress: 'Cascais', scheduledAt: '2024-06-10T16:30:00', status: 'pending', passengerCount: 2, price: 60, urgent: true },
];

export const mockTodayTimeline: TimelineEvent[] = [
  { time: '07:00', type: 'driver_checkin', title: 'Miguel Santos checked in', subtitle: 'Vehicle 11-BB-22 · Odometer 81,900 km', driverName: 'Miguel Santos', vehiclePlate: '11-BB-22', color: 'bg-emerald-500' },
  { time: '08:00', type: 'driver_checkin', title: 'Pedro Costa checked in', subtitle: 'Vehicle 00-AA-01 · Odometer 45,100 km', driverName: 'Pedro Costa', vehiclePlate: '00-AA-01', color: 'bg-emerald-500' },
  { time: '09:00', type: 'booking_start', title: 'Sofia Lopes — Assignment started', subtitle: 'Vehicle 44-EE-55', vehiclePlate: '44-EE-55', color: 'bg-blue-500' },
  { time: '10:30', type: 'booking_start', title: 'Booking b3 confirmed', subtitle: 'Ana Silva → Sintra with Miguel Santos', driverName: 'Miguel Santos', vehiclePlate: '11-BB-22', color: 'bg-blue-500' },
  { time: '14:00', type: 'booking_start', title: 'Booking b1 started', subtitle: 'Maria João → Hotel Bairro Alto with Pedro Costa', driverName: 'Pedro Costa', vehiclePlate: '00-AA-01', color: 'bg-blue-500' },
  { time: '14:05', type: 'alert', title: 'Unassigned booking — Urgent', subtitle: 'Robert Smith needs driver for 09:00 tomorrow', color: 'bg-red-500' },
  { time: '16:30', type: 'alert', title: 'Unassigned booking — Urgent', subtitle: 'Claire Dupont needs driver for 16:30 today', color: 'bg-red-500' },
  { time: '20:00', type: 'driver_checkout', title: 'António Rodrigues checked out', subtitle: 'Vehicle 66-GG-77 · 600km driven today', driverName: 'António Rodrigues', vehiclePlate: '66-GG-77', color: 'bg-slate-400' },
];
