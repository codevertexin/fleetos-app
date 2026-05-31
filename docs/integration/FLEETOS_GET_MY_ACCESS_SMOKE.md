# FleetOS P0.2A — `fleetos-get-my-access` smoke tests

## Prerequisites

- Migration `20260529130000_fleetos_company_onboarding_p0_schema.sql` applied
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
- `ORIGIN` — allowed CORS origin (e.g. `http://localhost:5173`)

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
| `access_state` | `needs_onboarding` \| `pending_review` \| `active` \| `suspended` \| `revoked` |
| `auth_membership_status` | From JWT `membership_status` (normalized) |
| `codevertex_user_id` | JWT `sub` |
| `redirect_path` | Matches contract §8.4 |
| `capabilities` | `can_submit_company`, `can_access_dashboard`, `can_access_operational_shell` |
| `tenant` / `membership` | `null` when `needs_onboarding` |

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
