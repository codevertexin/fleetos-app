# FleetOS Phase 6 — Edge-verified operational identity sync

This document describes how FleetOS consumes Auth Core’s **Option A** contract (**RS256 JWT + JWKS**) for operational identity sync and tenant listing, without trusting browser-supplied `codevertex_user_id` or `tenant_id` for authorization.

## Auth Core contract (consume-sso-ticket, `app_code=FLEETOS`)

After a successful SSO ticket consume, Auth Core returns (among other fields):

| Field | Purpose |
| --- | --- |
| `codevertex_edge_jwt` | Short-lived RS256 JWT for FleetOS Supabase Edge only |
| `codevertex_edge_jwt_expires_at` | Absolute expiry for the edge JWT |
| `codevertex_edge_jwt_alg` | `RS256` |
| `codevertex_edge_jwt_kid` | Key id for JWKS selection |
| `codevertex_jwks_uri` | JWKS endpoint (mirrored in Edge secret `CODEVERTEX_JWKS_URI`) |

### JWT claims (verified on Edge)

- `iss`, `aud`, `iat`, `exp`
- `sub` — CodeVertex user id (UUID)
- `app_code` — must be `FLEETOS`
- `ecosystem_code` — must be `codevertex`
- `token_use` — must be `fleetos_edge_verify`
- `membership_status` — `active` \| `pending` \| `suspended` \| `revoked` \| `none` (plus structural validation)
- `tenant_id` — UUID string or null
- `jti` — present in token (structurally available to validators via `jose`)
- Optional `role` — mapped into `tenant_users.role` on sync when allowed

Issuer / audience are enforced against secrets `CODEVERTEX_JWT_ISSUER` and `CODEVERTEX_JWT_AUDIENCE`.

## Edge functions

| Function | Method | Auth | Behaviour |
| --- | --- | --- | --- |
| `fleetos-sync-identity` | `POST` | `Authorization: Bearer <codevertex_edge_jwt>` + `apikey: <VITE_SUPABASE_ANON_KEY>` | Verifies JWT (JWKS), requires `membership_status === active`, valid `tenant_id` UUID, tenant row exists and is `active` in `public.tenants`, then upserts `profiles.codevertex_user_id` and `tenant_users`. Does **not** create `tenant_users` for non-active memberships (those requests are rejected before writes). |
| `fleetos-list-tenants` | `POST` | Same as above | Verifies JWT; lists active tenants from `tenant_users` for JWT `sub` only. If `membership_status === active` and `tenant_id` claim is set, merges that tenant when it exists and is active (covers post-consume listing before sync row exists). |

Shared verifier: `supabase/functions/_shared/codevertex-edge-jwt.ts` (`jose` `createRemoteJWKSet` + `jwtVerify`).

**Supabase gateway:** `verify_jwt = false` for both functions in `supabase/config.toml` so the platform does not reject non-Supabase JWTs in `Authorization`; all trust is established inside the function via JWKS.

## Security checks (Edge)

- RS256 only; key resolved via JWKS from `CODEVERTEX_JWKS_URI`
- `iss` / `aud` match configured secrets
- `sub` is a UUID
- `app_code`, `ecosystem_code`, `token_use` fixed strings
- `tenant_id` claim, when non-null, must be a UUID string
- CORS: `Origin` must appear in comma-separated `FLEETOS_ALLOWED_ORIGINS` (no wildcard)
- `SUPABASE_SERVICE_ROLE_KEY` is used **only** inside Edge to upsert/query Postgres — never exposed to the browser

## Rejected / non-sync paths

| Condition | `fleetos-sync-identity` |
| --- | --- |
| Invalid / expired JWT | `401` |
| `membership_status !== active` | `403` `membership_not_active` — **no** `tenant_users` upsert |
| Missing `tenant_id` in claims | `422` |
| Tenant missing or not `active` in `public.tenants` | `409` |
| CORS origin not allowed | `403` |

`pending`, `suspended`, `revoked`, and `none` are not allowed to pass the sync gate (no operational row creation on that path).

`fleetos-list-tenants` still verifies the token for any membership state but only **adds** the JWT `tenant_id` slice when membership is `active`.

## Frontend behaviour

- After consume, the app stores `codevertex_edge_jwt` (+ expiry) on the in-browser session object only as a **short-lived Edge token** (alongside the normal Auth Core access token).
- `fleetos-sync-identity` is called with **only** `Authorization: Bearer <codevertex_edge_jwt>` and `apikey` — **no** `codevertex_user_id` or `tenant_id` in the JSON body.
- On `200` + `{ ok: true }`, the client stores `operationalProfileId` and `operationalPrimaryTenantId` from the response.
- `TenantProvider` loads tenants via `fleetos-list-tenants` with the same bearer pattern when the edge JWT is still valid; it does **not** call RPC and does **not** use the mock tenant list while a valid edge JWT is present.

### Multi-tenant UX (temporary)

If more than one tenant is returned and `localStorage` / session hints do not resolve a tenant, the shell temporarily selects the first tenant. A dedicated selector UI is deferred (see TODO in `TenantProvider.tsx`).

## Environment variables

### Vite (`.env` / `.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes (for Edge URLs) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Sent as `apikey` when invoking Edge Functions |
| `VITE_FLEETOS_SYNC_IDENTITY_URL` | No | Override sync function URL |
| `VITE_FLEETOS_LIST_TENANTS_URL` | No | Override list function URL |

### Supabase Edge secrets (Dashboard)

| Secret | Purpose |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin Supabase client inside Edge only |
| `CODEVERTEX_JWKS_URI` | JWKS URL for Auth Core signing keys |
| `CODEVERTEX_JWT_ISSUER` | Expected JWT `iss` |
| `CODEVERTEX_JWT_AUDIENCE` | Expected JWT `aud` |
| `FLEETOS_ALLOWED_ORIGINS` | Comma-separated allowed browser origins for CORS |

`SUPABASE_URL` is provided automatically by the Supabase Edge runtime.

## Testing steps

1. Configure Vite env and deploy both Edge functions with secrets above; confirm `verify_jwt = false` in `supabase/config.toml` for each function.
2. Ensure `FLEETOS_ALLOWED_ORIGINS` includes your app origin (for example `http://localhost:5173`).
3. Complete real SSO against Auth Core so `consume-sso-ticket` returns `codevertex_edge_jwt`.
4. Confirm network: `POST .../fleetos-sync-identity` returns `200` with `ok`, `profile_id`, `tenant_id`, `tenants`.
5. Reload app (session restored): `POST .../fleetos-list-tenants` returns tenant array for the same user.
6. Run locally: `npm run build` and `npm run lint`.

## Remaining limitations

- No automatic refresh of `codevertex_edge_jwt` when it expires while the Auth Core session is still valid; listing falls back to mock tenants until the user re-authenticates and receives a new edge JWT.
- No dedicated multi-tenant picker UI yet (first-tenant fallback + TODO).
- RLS and operational data mocks are unchanged in this phase (by design).
- Billing / Stripe untouched.
