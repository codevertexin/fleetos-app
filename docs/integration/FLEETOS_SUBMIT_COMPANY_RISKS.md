# FleetOS P0.2B — `fleetos-submit-company` risks

## Operational

| Risk | Impact | Mitigation (P0) |
|------|--------|------------------|
| **Non-atomic writes** | Tenant created without `tenant_settings` or `tenant_member` if mid-flight failure | Compensating `DELETE` on `tenants` (cascade) on failure after insert; documented; P1 RPC transaction |
| **Race: double submit** | Two parallel requests may both pass conflict check | Unique on `tenants.slug` + unique membership per tenant/user; second request gets `slug_taken` or DB error |
| **Auth Core not updated** | JWT may still show `membership_status: active` while operational state is `pending_review` | Response includes `auth_core` hints; frontend must use `get-my-access` (P0.3); manual Auth runbook |
| **JWKS misconfiguration** | All submits return 401 | Fix `CODEVERTEX_JWKS_URI` (no duplicated `https://`) in Edge secrets |

## Product / data

| Risk | Impact | Mitigation |
|------|--------|------------|
| **No local `profiles` row on submit** | `tenant_members.profile_id` stays `NULL` until `fleetos-sync-identity` (or future profile linker) runs with a valid `auth.users` / `profiles.user_id` | P0 by design: submit writes only `tenants`, `tenant_settings`, `tenant_members` keyed by `codevertex_user_id` (JWT `sub`); do not insert into `profiles` without `user_id` |
| **Viewer with active membership** | User with only `viewer` on another tenant can submit a new company | P0.2B blocks **owner/admin** only; product may want broader block in P1 |
| **Revoked tenant + new company** | User with owner on `revoked` tenant may submit again | Intentional for P0; admin should archive old rows if confusing |
| **PT NIF checksum** | Weak validation (9 digits only) | P1 checksum; document in API |
| **Slug squatting** | Slug reserved at submit | Admin cannot reclaim without DB; approve flow separate |
| **24h idempotency window** | After 24h, same slug returns `slug_taken` not 200 | Client should use new slug or admin cleanup |

## Security

| Risk | Impact | Mitigation |
|------|--------|------------|
| **service_role bypasses RLS** | Only Edge must call writes | No permissive RLS added; function not exposed to anon without JWT |
| **JWT `tenant_id` ignored** | Submit always uses `sub` | By design; prevents cross-user binding |
| **PII in `metadata`** | `tax_id`, `legal_name` in `tenants.metadata` | RLS deny for clients; restrict SQL Editor access |

## Dependencies

- P0.1 migration applied (`pending_review`, `metadata`)
- `tenant_members.profile_id` nullable (Phase 2A.2) — submit leaves it `NULL`
- Does **not** insert or update `public.profiles` on onboarding submit
- Does **not** call `fleetos-sync-identity` (requires active tenant)
- Admin approve (P0 admin / SQL) required before `access_state: active`
