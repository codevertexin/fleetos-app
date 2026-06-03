/**
 * FleetOS P2.1 — list vehicles for tenant (active members).
 */

import {
  listVehiclesForTenant,
  parseListVehiclesBody,
} from '../_shared/fleetos-vehicles.ts';
import { handleFleetosEdgePost, json } from '../_shared/fleetos-edge-handler.ts';

Deno.serve((req) =>
  handleFleetosEdgePost(req, async (admin, sub, body, cors) => {
    const parsed = parseListVehiclesBody(body);
    if (!parsed.ok) {
      return json(400, { error: 'validation_error', message: parsed.message }, cors);
    }

    const result = await listVehiclesForTenant(admin, sub, parsed);
    if (!result.ok) {
      return json(result.status, { error: result.error, message: result.message }, cors);
    }

    return json(200, { ok: true, vehicles: result.vehicles }, cors);
  }),
);
