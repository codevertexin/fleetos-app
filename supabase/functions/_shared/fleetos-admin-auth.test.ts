/**
 * P1.1 — fleetos-admin-auth tests
 * Run: deno test --allow-env supabase/functions/_shared/fleetos-admin-auth.test.ts
 */

import { assertEquals } from 'jsr:@std/assert@1';
import { timingSafeEqualString } from './fleetos-admin-auth.ts';

Deno.test('timingSafeEqualString — equal strings', () => {
  assertEquals(timingSafeEqualString('secret-a', 'secret-a'), true);
});

Deno.test('timingSafeEqualString — different length', () => {
  assertEquals(timingSafeEqualString('short', 'longer'), false);
});

Deno.test('timingSafeEqualString — different content same length', () => {
  assertEquals(timingSafeEqualString('abcdefgh', 'abcdexxx'), false);
});
