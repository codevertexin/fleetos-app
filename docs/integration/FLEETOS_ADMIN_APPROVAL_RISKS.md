# FleetOS P1.1 — Admin approval risks

## Security

| Risk | Impact | Mitigation |
|------|--------|------------|
| `FLEETOS_ADMIN_SECRET` leaked | Anyone can approve/reject tenants | Rotate secret; never in client; vault/CI only |
| Secret brute force | Unauthorized reviews | Long random secret; timing-safe compare; rate limit at gateway (P1.2) |
| CORS + secret in browser | Secret exposed if used from SPA | **Do not** call admin Edge from frontend; curl/BFF only |
| `service_role` in Edge only | DB bypass if function compromised | Minimal handlers; no user input in raw SQL |

## Data integrity

| Risk | Impact | Mitigation |
|------|--------|------------|
| Non-atomic tenant + member update | Tenant `active` without active member | Compensating rollback on member failure; P1.2 RPC |
| Race: two reviewers same tenant | Second may get 409 or 0-row tenant update | `.eq('status','pending_review')` on update; idempotency |
| Approve without pending member | Orphan `pending_review` tenant | `409 no_pending_submitter` |
| Reject uses `suspended` not `removed` | Member still visible to get-my-access | Intentional — `revoked` tenant drives `/access-revoked` |

## Product / Auth

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth Core JWT still `pending` after approve | User confusion if router ignores get-my-access | Documented; frontend uses get-my-access only |
| No Auth Core update | Support tools may show stale membership | Manual Auth runbook optional |
| Re-apply after reject | New slug allowed | Product may add cooldown P1.2 |
| `subscription_status` unchanged on approve | User lands on `/app` not `/dashboard` | By design (billing gate) |

## Operations

| Risk | Impact | Mitigation |
|------|--------|------------|
| List without `Origin` header | `403 cors_origin_not_allowed` | Pass `Origin: http://localhost:4200` or allowed prod origin |
| Large queue in memory | Slow list | P1.1 caps limit 100; P1.2 DB-side sort/pagination |
| PII in logs | Compliance | Log tenant_id UUIDs only |

## Dependencies

- `FLEETOS_ADMIN_SECRET` Edge secret
- P0 schema (`pending_review`, `metadata`, `subscription_status`)
- Does **not** create `profiles`
- Does **not** call Auth Core
