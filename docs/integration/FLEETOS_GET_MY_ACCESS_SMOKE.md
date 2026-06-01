# FleetOS P0.2A / P0.2b-2 — `fleetos-get-my-access` smoke tests

## Prerequisites

- Migrations applied:
  - `20260529130000_fleetos_company_onboarding_p0_schema.sql`
  - `20260529140000_fleetos_billing_gate_p0_2b_1_schema.sql`
- Edge secrets: `CODEVERTEX_JWKS_URI`, `CODEVERTEX_JWT_ISSUER`, `CODEVERTEX_JWT_AUDIENCE`
- Valid `codevertex_edge_jwt` from Auth Core `consume-sso-ticket` (FLEETOS)

Deploy:

```bash
supabase functions deploy fleetos-get-my-access --project-ref <ref>
```

## Unit tests (local, no network)

```bash
deno test --allow-read supabase/functions/_shared/fleetos-access.test.ts
```

## HTTP smoke

Replace placeholders:

- `SUPABASE_URL` — e.g. `https://<ref>.supabase.co`
- `SUPABASE_ANON_KEY` — project anon key
- `EDGE_JWT` — fresh `codevertex_edge_jwt`
- `ORIGIN` — allowed CORS origin (e.g. `http://localhost:4200`)

### Happy path

```bash
curl -sS -X POST \
  "$SUPABASE_URL/functions/v1/fleetos-get-my-access" \
  -H "Authorization: Bearer $EDGE_JWT" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{}'
```

Expected `200` body fields:

| Field | Notes |
|-------|--------|
| `ok` | `true` |
| `access_state` | `needs_onboarding` \| `pending_review` \| `active_unsubscribed` \| `active` \| `suspended` \| `revoked` |
| `redirect_path` | `/onboarding/company` \| `/preview` \| `/app` \| `/dashboard` \| gate paths |
| `workspace_mode` | `preview` \| `setup` \| `operational` \| null |
| `gates` | `auth_membership`, `tenant_approval`, `tenant_billing`, `role` |
| `capabilities` | Includes `can_access_preview_workspace`, `can_write_setup_data`, `can_write_operational_data`, `can_invite_members`, `can_start_checkout` |
| `tenant.subscription_status` | `none`, `trialing`, `active`, `past_due`, `canceled` |

### Expected states (P0.2b-2)

| Scenario | `access_state` | `redirect_path` |
|----------|----------------|-----------------|
| No membership | `needs_onboarding` | `/onboarding/company` |
| `pending_review` / member pending | `pending_review` | `/preview` |
| Approved + `subscription_status` none/past_due/canceled | `active_unsubscribed` | `/app` |
| Approved + `active` or `trialing` | `active` | `/dashboard` |

### Missing bearer → 401

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
  "$SUPABASE_URL/functions/v1/fleetos-get-my-access" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{}'
```

Expect `401` and `{ "error": "missing_bearer" }`.

### Invalid token → 401

```bash
curl -sS -X POST \
  "$SUPABASE_URL/functions/v1/fleetos-get-my-access" \
  -H "Authorization: Bearer invalid" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{}'
```

Expect `401` and `{ "error": "invalid_token" }`.

### OPTIONS preflight

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X OPTIONS \
  "$SUPABASE_URL/functions/v1/fleetos-get-my-access" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST"
```

Expect `204`.

## SQL fixtures

See `docs/database/_validate_fleetos_get_my_access.sql` for join checks and optional pending_review seed (commented).

## Contract reference

`docs/architecture/FLEETOS_COMPANY_ONBOARDING_P0_CONTRACT.md` §8
