# FleetOS P1.1 — Admin approval runbook

Operator guide for `fleetos-admin-list-tenant-applications` and `fleetos-admin-review-tenant`.

**Contract:** `docs/architecture/FLEETOS_ADMIN_APPROVAL_P1_CONTRACT.md`

---

## Prerequisites

1. Migration P0.1 applied (`tenants.status` includes `pending_review`, `metadata` jsonb).
2. Edge functions deployed (see smoke doc).
3. Secret set on project:

```bash
supabase secrets set FLEETOS_ADMIN_SECRET="your-long-random-secret" --project-ref <ref>
```

4. **Never** put `FLEETOS_ADMIN_SECRET` in the frontend or commit to git.

---

## Deploy

```bash
supabase functions deploy fleetos-admin-list-tenant-applications fleetos-admin-review-tenant --project-ref <ref>
```

---

## List pending applications

```bash
export SUPABASE_URL="https://<ref>.supabase.co"
export ADMIN_SECRET="..."
export ORIGIN="http://localhost:4200"

curl -sS -X POST \
  "$SUPABASE_URL/functions/v1/fleetos-admin-list-tenant-applications" \
  -H "X-FleetOS-Admin-Secret: $ADMIN_SECRET" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{"status":"pending_review","limit":50}'
```

Detail for one tenant:

```bash
curl -sS -X POST ... \
  -d '{"tenant_id":"<tenant-uuid>","status":"pending_review"}'
```

---

## Approve application

```bash
curl -sS -X POST \
  "$SUPABASE_URL/functions/v1/fleetos-admin-review-tenant" \
  -H "X-FleetOS-Admin-Secret: $ADMIN_SECRET" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{
    "tenant_id": "<tenant-uuid>",
    "decision": "approve",
    "review_notes": "Documents verified",
    "reviewer_label": "ops@codevertex.cc"
  }'
```

**DB effect:**

- `tenants.status` → `active`
- `subscription_status` unchanged (`none`)
- owner/admin `pending`/`invited` → `active`, `is_active = true`
- `metadata.onboarding.review.decision` → `approved`

**Applicant:** `fleetos-get-my-access` → `active_unsubscribed`, `/app`

**Auth Core:** not updated by FleetOS P1.1

---

## Reject application

```bash
curl -sS -X POST ... \
  -d '{
    "tenant_id": "<tenant-uuid>",
    "decision": "reject",
    "review_notes": "Incomplete documentation",
    "reviewer_label": "ops@codevertex.cc"
  }'
```

**DB effect:**

- `tenants.status` → `revoked`
- owner/admin → `suspended`, `is_active = false`
- `metadata.onboarding.review.decision` → `rejected`

**Applicant:** `/access-revoked`

---

## Idempotency

Repeat the **same** `decision` → `200`, `"idempotent": true`.

Opposite decision → `409` `review_decision_conflict`.

---

## Verify applicant routing

```bash
# As applicant (Bearer codevertex_edge_jwt)
curl -sS -X POST "$SUPABASE_URL/functions/v1/fleetos-get-my-access" \
  -H "Authorization: Bearer $EDGE_JWT" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

After approve: `access_state` = `active_unsubscribed`, `redirect_path` = `/app`.

---

## Break-glass SQL (emergency only)

If Edge fails mid-review, inspect:

```sql
SELECT t.id, t.status, t.subscription_status, t.metadata->'onboarding' AS onboarding,
       tm.id, tm.role, tm.status, tm.is_active, tm.codevertex_user_id
FROM tenants t
LEFT JOIN tenant_members tm ON tm.tenant_id = t.id AND tm.role IN ('owner','admin')
WHERE t.id = '<tenant_id>';
```

Manual approve (same as P0 runbook):

```sql
BEGIN;
UPDATE tenants SET status = 'active', updated_at = now()
WHERE id = '<tenant_id>' AND status = 'pending_review';
UPDATE tenant_members SET status = 'active', is_active = true, updated_at = now()
WHERE tenant_id = '<tenant_id>' AND role IN ('owner','admin') AND status IN ('pending','invited');
COMMIT;
```

---

## Transaction model (P1.1)

Edge uses **sequential updates with compensating rollback** (tenant update reverted if member update fails). P1.2 may add a Postgres RPC for single atomic transaction.

---

## Unit tests

```bash
deno test --allow-read --allow-env supabase/functions/_shared/fleetos-admin-auth.test.ts
deno test --allow-read supabase/functions/_shared/fleetos-admin-review.test.ts
```
