import { mockVehicles } from '@/lib/mock-data';
import type { FleetosVehicleRecord } from '@/types/fleetos-vehicle';

/** DEV-only mock fleet when VITE_FLEETOS_USE_VEHICLE_MOCK=true */
export function listMockFleetVehicles(tenantId: string): FleetosVehicleRecord[] {
  return mockVehicles.map((v) => ({
    id: v.id,
    tenant_id: tenantId,
    plate: v.plate,
    brand: v.brand,
    model: v.model,
    year: v.year,
    status: v.status,
    odometer_km: v.odometer,
    vin: v.vin || null,
    color: v.color || null,
    fuel: v.fuel || null,
    ownership_type: v.ownershipType,
    is_active: v.status !== 'inactive',
    deactivated_at: null,
    created_at: v.createdAt,
    updated_at: v.createdAt,
  }));
}
