# FleetOS P1.1 — Admin approval smoke tests

## Prerequisites

- Applicant has submitted company (`pending_review`) via `fleetos-submit-company`
- `FLEETOS_ADMIN_SECRET` set on Supabase project
- Functions deployed

```bash
supabase secrets set FLEETOS_ADMIN_SECRET="change-me-in-production" --project-ref <ref>

supabase functions deploy fleetos-admin-list-tenant-applications fleetos-admin-review-tenant --project-ref <ref>
```

## Env

```bash
export SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_ANON_KEY="<anon>"
export ADMIN_SECRET="<same as FLEETOS_ADMIN_SECRET>"
export ORIGIN="http://localhost:4200"
export TENANT_ID="<pending_review tenant uuid>"
export EDGE_JWT="<applicant codevertex_edge_jwt>"
```

## 1. Unauthorized (401)

```bash
curl -sS -o /dev/null -w "%{http_code}" -X POST \
  "$SUPABASE_URL/functions/v1/fleetos-admin-list-tenant-applications" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{}'
```

Expect `401`.

## 2. List queue (200)

```bash
curl -sS -X POST \
  "$SUPABASE_URL/functions/v1/fleetos-admin-list-tenant-applications" \
  -H "X-FleetOS-Admin-Secret: $ADMIN_SECRET" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{"status":"pending_review","limit":10}'
```

Expect `ok: true`, `items[]` with `tenant`, `onboarding`, `submitter_membership`.

## 3. Approve (200)

```bash
curl -sS -X POST \
  "$SUPABASE_URL/functions/v1/fleetos-admin-review-tenant" \
  -H "X-FleetOS-Admin-Secret: $ADMIN_SECRET" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d "{
    \"tenant_id\": \"$TENANT_ID\",
    \"decision\": \"approve\",
    \"review_notes\": \"Smoke approve\",
    \"reviewer_label\": \"smoke-test\"
  }"
```

Expect:

| Field | Value |
|-------|--------|
| `ok` | `true` |
| `decision` | `approve` |
| `tenant.status` | `active` |
| `access_preview.submitter_access_state` | `active_unsubscribed` |
| `access_preview.submitter_redirect_path` | `/app` |

## 4. Approve idempotent (200)

Repeat step 3 → `idempotent: true`.

## 5. Applicant get-my-access after approve

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/fleetos-get-my-access" \
  -H "Authorization: Bearer $EDGE_JWT" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expect `access_state: active_unsubscribed`, `redirect_path: /app`.

## 6. Reject flow (separate tenant)

On a **different** `pending_review` tenant:

```bash
curl -sS -X POST .../fleetos-admin-review-tenant ... \
  -d "{\"tenant_id\":\"$OTHER_TENANT_ID\",\"decision\":\"reject\",\"review_notes\":\"Smoke reject\"}"
```

Expect `tenant.status: revoked`, `access_preview.submitter_redirect_path: /access-revoked`.

## 7. Conflict (409)

After approve, call reject on same tenant → `review_decision_conflict`.

## Deno unit tests

```bash
deno test --allow-read --allow-env supabase/functions/_shared/fleetos-admin-auth.test.ts
deno test --allow-read supabase/functions/_shared/fleetos-admin-review.test.ts
```
