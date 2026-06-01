/**
 * Run: deno test --allow-env supabase/functions/_shared/cors.test.ts
 */

import { assertEquals } from 'jsr:@std/assert@1';
import { corsHeadersForRequest, FLEETOS_DEFAULT_ALLOWED_ORIGINS } from './cors.ts';

Deno.test('default origins include localhost:4200 and production', () => {
  assertEquals(FLEETOS_DEFAULT_ALLOWED_ORIGINS.includes('http://localhost:4200'), true);
  assertEquals(FLEETOS_DEFAULT_ALLOWED_ORIGINS.includes('http://127.0.0.1:4200'), true);
  assertEquals(
    FLEETOS_DEFAULT_ALLOWED_ORIGINS.includes('https://fleetos.codevertex.cc'),
    true,
  );
});

Deno.test('OPTIONS from localhost:4200 returns CORS headers', () => {
  const req = new Request('https://example.com/f', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:4200' },
  });
  const cors = corsHeadersForRequest(req);
  assertEquals(cors?.['Access-Control-Allow-Origin'], 'http://localhost:4200');
  assertEquals(cors?.['Access-Control-Allow-Methods'], 'POST, OPTIONS');
});

Deno.test('unknown origin returns null', () => {
  const req = new Request('https://example.com/f', {
    method: 'POST',
    headers: { Origin: 'https://evil.example' },
  });
  assertEquals(corsHeadersForRequest(req), null);
});
