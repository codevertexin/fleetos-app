/**
 * FleetOS P2.1 — deactivate vehicle (soft delete, owner/admin).
 */

import { deactivateVehicle } from '../_shared/fleetos-vehicles.ts';
import { isValidUuid } from '../_shared/fleetos-tenant-gate.ts';
import { handleFleetosEdgePost, json } from '../_shared/fleetos-edge-handler.ts';

Deno.serve((req) =>
  handleFleetosEdgePost(req, async (admin, sub, body, cors) => {
    const b = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
    const tenantId = typeof b.tenant_id === 'string' ? b.tenant_id.trim() : '';
    const vehicleId = typeof b.vehicle_id === 'string' ? b.vehicle_id.trim() : '';
    if (!isValidUuid(tenantId)) {
      return json(400, { error: 'validation_error', message: 'tenant_id is required' }, cors);
    }
    if (!isValidUuid(vehicleId)) {
      return json(400, { error: 'validation_error', message: 'vehicle_id is required' }, cors);
    }

    const result = await deactivateVehicle(admin, sub, tenantId, vehicleId);
    if (!result.ok) {
      return json(result.status, { error: result.error, message: result.message }, cors);
    }

    return json(200, {
      ok: true,
      vehicle: result.vehicle,
      idempotent: result.idempotent,
    }, cors);
  }),
);
