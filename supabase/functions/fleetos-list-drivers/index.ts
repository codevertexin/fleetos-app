/**
 * FleetOS P2.2 — list drivers for tenant (active members).
 */

import {
  listDriversForTenant,
  parseListDriversBody,
} from '../_shared/fleetos-drivers.ts';
import { handleFleetosEdgePost, json } from '../_shared/fleetos-edge-handler.ts';

Deno.serve((req) =>
  handleFleetosEdgePost(req, async (admin, sub, body, cors) => {
    const parsed = parseListDriversBody(body);
    if (!parsed.ok) {
      return json(400, { error: 'validation_error', message: parsed.message }, cors);
    }

    const result = await listDriversForTenant(admin, sub, parsed);
    if (!result.ok) {
      return json(result.status, { error: result.error, message: result.message }, cors);
    }

    return json(200, { ok: true, drivers: result.drivers }, cors);
  }),
);
