/**
 * FleetOS P2.1 — update vehicle (owner/admin).
 */

import {
  parseVehicleInput,
  updateVehicle,
} from '../_shared/fleetos-vehicles.ts';
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

    const parsed = parseVehicleInput(body, true);
    if (!parsed.ok) {
      return json(400, { error: 'validation_error', message: parsed.message }, cors);
    }
    if (Object.keys(parsed.input).length === 0) {
      return json(400, { error: 'validation_error', message: 'No fields to update' }, cors);
    }

    const result = await updateVehicle(admin, sub, tenantId, vehicleId, parsed.input);
    if (!result.ok) {
      return json(result.status, { error: result.error, message: result.message }, cors);
    }

    return json(200, { ok: true, vehicle: result.vehicle }, cors);
  }),
);
