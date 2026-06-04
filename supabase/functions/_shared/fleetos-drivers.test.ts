/**
 * P2.2 — drivers validation (Deno).
 * Run: deno test --allow-read supabase/functions/_shared/fleetos-drivers.test.ts
 */

import { assertEquals } from 'jsr:@std/assert@1';
import { parseDriverInput, parseListDriversBody } from './fleetos-drivers.ts';

const TENANT_ID = 'a0000000-0000-4000-8000-000000000001';

Deno.test('parseListDriversBody — requires tenant_id', () => {
  const bad = parseListDriversBody({});
  assertEquals(bad.ok, false);
  const ok = parseListDriversBody({ tenant_id: TENANT_ID });
  assertEquals(ok.ok, true);
  if (ok.ok) assertEquals(ok.limit, 100);
});

Deno.test('parseDriverInput — full create payload', () => {
  const r = parseDriverInput(
    {
      full_name: 'Pedro Costa',
      phone: '+351 912 345 678',
      email: 'pedro@example.com',
      license_no: 'AB-123456',
      status: 'active',
      availability: 'available',
      license_expires_at: '2026-08-15',
    },
    false,
  );
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.input.full_name, 'Pedro Costa');
    assertEquals(r.input.license_no, 'AB-123456');
    assertEquals(r.input.license_expires_at, '2026-08-15');
    assertEquals(r.input.external, false);
  }
});

Deno.test('parseDriverInput — reject missing license_no on create', () => {
  const r = parseDriverInput(
    {
      full_name: 'Pedro',
      license_expires_at: '2026-08-15',
      status: 'active',
    },
    false,
  );
  assertEquals(r.ok, false);
});

Deno.test('parseDriverInput — accept legacy name field', () => {
  const r = parseDriverInput({
    name: 'Miguel Santos',
    license_no: 'XY-99',
    license_expires_at: '2027-01-01',
    status: 'active',
  }, false);
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.input.full_name, 'Miguel Santos');
});

Deno.test('parseDriverInput — reject invalid status', () => {
  const r = parseDriverInput(
    { full_name: 'X', status: 'flying' },
    false,
  );
  assertEquals(r.ok, false);
});
