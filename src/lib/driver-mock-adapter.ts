import { mockDrivers } from '@/lib/mock-data';
import type { FleetosDriverRecord } from '@/types/fleetos-driver';

/** DEV-only mock fleet when VITE_FLEETOS_USE_DRIVER_MOCK=true */
export function listMockFleetDrivers(tenantId: string): FleetosDriverRecord[] {
  return mockDrivers.map((d) => ({
    id: d.id,
    tenant_id: tenantId,
    full_name: d.name,
    phone: d.phone || null,
    email: d.email || null,
    status: d.status,
    availability: d.availability,
    license_expires_at: d.licenseExpiry || null,
    tvde_cert_expires_at: d.tvdeCertExpiry || null,
    tax_id: d.nif || null,
    address: d.address || null,
    is_active: d.status !== 'inactive',
    deactivated_at: null,
    created_at: d.createdAt,
    updated_at: d.createdAt,
  }));
}
