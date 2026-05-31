# FleetOS P0.2B — `fleetos-submit-company` smoke tests

## Prerequisites

- Migration `20260529130000_fleetos_company_onboarding_p0_schema.sql` applied
- Edge secrets: `CODEVERTEX_JWKS_URI`, `CODEVERTEX_JWT_ISSUER`, `CODEVERTEX_JWT_AUDIENCE`
- JWT for a user **without** owner/admin pending or active membership
- Unique `slug` per run

Deploy:

```bash
supabase functions deploy fleetos-submit-company --project-ref <ref>
```

## Unit tests (local)

```bash
deno test --allow-read supabase/functions/_shared/fleetos-submit-company.test.ts
```

## HTTP smoke — happy path (201)

```bash
curl -sS -X POST \
  "$SUPABASE_URL/functions/v1/fleetos-submit-company" \
  -H "Authorization: Bearer $EDGE_JWT" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{
    "company": {
      "name": "Smoke Test Lda",
      "legal_name": "Smoke Test Unipessoal Lda",
      "slug": "smoke-test-'"$(date +%s)"'",
      "country_code": "PT",
      "tax_id": "123456789"
    }
  }'
```

Expected `201`:

| Field | Value |
|-------|--------|
| `ok` | `true` |
| `access_state` | `pending_review` |
| `redirect_path` | `/pending-approval` |
| `tenant.status` | `pending_review` |
| `membership.role` | `owner` |
| `membership.status` | `pending` |
| `auth_core.recommended_membership_status` | `pending` |

Then verify with `fleetos-get-my-access` → same `access_state` and `redirect_path`.

## Idempotent retry (200)

Repeat the **same** `slug` within 24h with the same user → `200` and existing tenant/membership ids.

## Validation error (400)

```bash
curl -sS -X POST \
  "$SUPABASE_URL/functions/v1/fleetos-submit-company" \
  -H "Authorization: Bearer $EDGE_JWT" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{"company":{"name":"x","slug":"BAD_SLUG","country_code":"PT","tax_id":"1"}}'
```

Expect `validation_error` and `fields` map.

## Conflict (409)

Submit twice with **different** slugs for the same user while first is still `pending_review` → second returns `pending_application_exists` with `tenant_id`.

## Slug taken (409)

Use a slug that belongs to another tenant → `slug_taken`.

## Missing bearer (401)

Same pattern as `FLEETOS_GET_MY_ACCESS_SMOKE.md`.

## Contract reference

`docs/architecture/FLEETOS_COMPANY_ONBOARDING_P0_CONTRACT.md` §9

## Risks

See `docs/integration/FLEETOS_SUBMIT_COMPANY_RISKS.md`.
