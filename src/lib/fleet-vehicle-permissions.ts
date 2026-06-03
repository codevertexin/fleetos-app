/** Owner/admin (canonical or legacy tenant_admin) may create/edit fleet vehicles. */
export function canManageFleetVehicles(role?: string | null): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  return r === 'owner' || r === 'admin' || r === 'tenant_admin' || r === 'fleet_manager';
}
