/**
 * FleetOS P2.1 — create vehicle (owner/admin).
 */

import {
  createVehicle,
  parseVehicleInput,
  type VehicleInput,
} from '../_shared/fleetos-vehicles.ts';
import { isValidUuid } from '../_shared/fleetos-tenant-gate.ts';
import { handleFleetosEdgePost, json } from '../_shared/fleetos-edge-handler.ts';

Deno.serve((req) =>
  handleFleetosEdgePost(req, async (admin, sub, body, cors) => {
    const b = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
    const tenantId = typeof b.tenant_id === 'string' ? b.tenant_id.trim() : '';
    if (!isValidUuid(tenantId)) {
      return json(400, { error: 'validation_error', message: 'tenant_id is required' }, cors);
    }

    const parsed = parseVehicleInput(body, false);
    if (!parsed.ok) {
      return json(400, { error: 'validation_error', message: parsed.message }, cors);
    }

    const result = await createVehicle(admin, sub, tenantId, parsed.input as VehicleInput);
    if (!result.ok) {
      return json(result.status, { error: result.error, message: result.message }, cors);
    }

    return json(201, { ok: true, vehicle: result.vehicle }, cors);
  }),
);
