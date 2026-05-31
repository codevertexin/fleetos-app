/**
 * P0.2B — unit tests for fleetos-submit-company validation and conflicts.
 * Run: deno test --allow-read supabase/functions/_shared/fleetos-submit-company.test.ts
 */

import {
  buildOnboardingMetadata,
  buildSubmitSuccessBody,
  evaluateSubmitConflicts,
  validateCompanyPayload,
} from './fleetos-submit-company.ts';
import { assertEquals, assertExists } from 'jsr:@std/assert@1';

const validCompany = {
  company: {
    name: 'Acme Transport Lda',
    legal_name: 'Acme Transport Unipessoal Lda',
    slug: 'acme-transport',
    country_code: 'PT',
    tax_id: '123456789',
    locale: 'pt-PT',
    currency: 'EUR',
    timezone: 'Europe/Lisbon',
    primary_color: '#00B39A',
    logo_url: null,
  },
};

Deno.test('validateCompanyPayload — accepts valid PT company', () => {
  const r = validateCompanyPayload(validCompany);
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.company.slug, 'acme-transport');
    assertEquals(r.company.tax_id, '123456789');
  }
});

Deno.test('validateCompanyPayload — rejects invalid slug', () => {
  const r = validateCompanyPayload({
    company: { ...validCompany.company, slug: 'Acme_Transport' },
  });
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertExists(r.fields['company.slug']);
  }
});

Deno.test('validateCompanyPayload — rejects PT tax_id not 9 digits', () => {
  const r = validateCompanyPayload({
    company: { ...validCompany.company, tax_id: '12' },
  });
  assertEquals(r.ok, false);
});

Deno.test('validateCompanyPayload — requires company object', () => {
  const r = validateCompanyPayload({});
  assertEquals(r.ok, false);
});

Deno.test('evaluateSubmitConflicts — active owner blocks', () => {
  const c = evaluateSubmitConflicts([
    {
      id: 'm1',
      role: 'owner',
      status: 'active',
      tenants: { id: 't1', status: 'active' },
    },
  ]);
  assertEquals(c?.kind, 'already_has_active_membership');
});

Deno.test('evaluateSubmitConflicts — pending owner blocks', () => {
  const c = evaluateSubmitConflicts([
    {
      id: 'm1',
      role: 'owner',
      status: 'pending',
      tenants: { id: 't1', status: 'pending_review' },
    },
  ]);
  assertEquals(c?.kind, 'pending_application_exists');
  if (c?.kind === 'pending_application_exists') {
    assertEquals(c.tenant_id, 't1');
  }
});

Deno.test('evaluateSubmitConflicts — viewer active does not block', () => {
  const c = evaluateSubmitConflicts([
    {
      id: 'm1',
      role: 'viewer',
      status: 'active',
      tenants: { id: 't1', status: 'active' },
    },
  ]);
  assertEquals(c, null);
});

Deno.test('evaluateSubmitConflicts — admin pending blocks', () => {
  const c = evaluateSubmitConflicts([
    {
      id: 'm1',
      role: 'admin',
      status: 'pending',
      tenants: { id: 't1', status: 'pending_review' },
    },
  ]);
  assertEquals(c?.kind, 'pending_application_exists');
});

Deno.test('buildOnboardingMetadata — shape', () => {
  const v = validateCompanyPayload(validCompany);
  if (!v.ok) throw new Error('expected valid');
  const meta = buildOnboardingMetadata(v.company, 'a0000000-0000-4000-8000-0000000000c1', '2026-05-29T12:00:00.000Z');
  const onboarding = (meta as { onboarding: Record<string, unknown> }).onboarding;
  assertEquals(onboarding.legal_name, v.company.legal_name);
  assertEquals(onboarding.country_code, 'PT');
  assertEquals(onboarding.submitted_by_codevertex_user_id, 'a0000000-0000-4000-8000-0000000000c1');
});

Deno.test('buildSubmitSuccessBody — pending_review response', () => {
  const body = buildSubmitSuccessBody({
    idempotent: false,
    tenant: {
      id: 't-uuid',
      name: 'Acme',
      slug: 'acme',
      status: 'pending_review',
      submitted_at: '2026-05-29T12:00:00.000Z',
    },
    membership: { id: 'm-uuid', role: 'owner', status: 'pending' },
  });
  assertEquals(body.access_state, 'pending_review');
  assertEquals(body.redirect_path, '/pending-approval');
  assertEquals((body.auth_core as Record<string, string>).fleetos_tenant_id, 't-uuid');
});
