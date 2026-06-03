/**
 * FleetOS P2.2 — deactivate driver (owner/admin).
 */

import { deactivateDriver } from '../_shared/fleetos-drivers.ts';
import { isValidUuid } from '../_shared/fleetos-tenant-gate.ts';
import { handleFleetosEdgePost, json } from '../_shared/fleetos-edge-handler.ts';

Deno.serve((req) =>
  handleFleetosEdgePost(req, async (admin, sub, body, cors) => {
    const b = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
    const tenantId = typeof b.tenant_id === 'string' ? b.tenant_id.trim() : '';
    const driverId = typeof b.driver_id === 'string' ? b.driver_id.trim() : '';
    if (!isValidUuid(tenantId)) {
      return json(400, { error: 'validation_error', message: 'tenant_id is required' }, cors);
    }
    if (!isValidUuid(driverId)) {
      return json(400, { error: 'validation_error', message: 'driver_id is required' }, cors);
    }

    const result = await deactivateDriver(admin, sub, tenantId, driverId);
    if (!result.ok) {
      return json(result.status, { error: result.error, message: result.message }, cors);
    }

    return json(200, {
      ok: true,
      driver: result.driver,
      idempotent: result.idempotent,
    }, cors);
  }),
);
