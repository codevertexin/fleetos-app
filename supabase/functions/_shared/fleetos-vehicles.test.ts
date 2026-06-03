/**
 * P2.1 — vehicles validation (Deno).
 * Run: deno test --allow-read supabase/functions/_shared/fleetos-vehicles.test.ts
 */

import { assertEquals } from 'jsr:@std/assert@1';
import { parseListVehiclesBody, parseVehicleInput } from './fleetos-vehicles.ts';

const TENANT_ID = 'a0000000-0000-4000-8000-000000000001';

Deno.test('parseListVehiclesBody — requires tenant_id', () => {
  const bad = parseListVehiclesBody({});
  assertEquals(bad.ok, false);
  const ok = parseListVehiclesBody({ tenant_id: TENANT_ID });
  assertEquals(ok.ok, true);
  if (ok.ok) assertEquals(ok.limit, 100);
});

Deno.test('parseVehicleInput — full create payload', () => {
  const r = parseVehicleInput(
    {
      plate: 'ab-12-cd',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2022,
      status: 'active',
      odometer_km: 12000,
    },
    false,
  );
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.input.plate, 'AB-12-CD');
    assertEquals(r.input.brand, 'Toyota');
  }
});

Deno.test('parseVehicleInput — reject invalid status', () => {
  const r = parseVehicleInput(
    { plate: 'X', brand: 'A', model: 'B', status: 'flying' },
    false,
  );
  assertEquals(r.ok, false);
});
