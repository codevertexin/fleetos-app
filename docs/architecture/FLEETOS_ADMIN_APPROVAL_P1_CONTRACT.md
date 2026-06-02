# FleetOS P1 — Admin Approval Flow (Technical Contract)

**Status:** Design only — **no implementation** in this deliverable  
**Date:** 2026-05-29  
**Depends on:** P0 complete (`fleetos-submit-company`, `fleetos-get-my-access`, Preview `/preview`, Setup `/app`, Operations `/dashboard`)  
**Supersedes (partially):** P0 contract §10 `fleetos-admin-approve-tenant` sketch — renamed/unified as `fleetos-admin-review-tenant`

---

## 1. Purpose

Replace **manual SQL approval** with an auditable **platform admin** flow to:

1. **List** company applications in `pending_review`.
2. **Read** application detail (tenant, onboarding metadata, submitting owner).
3. **Approve** → operational setup workspace (`active_unsubscribed` → `/app`).
4. **Reject** → permanent denial for that tenant application (`revoked` → `/access-revoked`).

**Out of scope P1:** Billing Core webhooks, invite runtime, Auth Core membership automation, public self-service re-apply UX (may follow in P1.2+).

---

## 2. Principles

| # | Principle |
|---|-----------|
| 1 | **FleetOS owns operational approval** — tenant + `tenant_members` are source of truth for Preview → Setup → Operations. |
| 2 | **Auth Core is identity + app gate only** — P1 **does not** call Auth Core to set `app_membership` on approve/reject (see §7). |
| 3 | **No client writes to Postgres** — admin UI / tools call Edge only; Edge uses `service_role` internally. |
| 4 | **No profile creation on approve** — same as P0 submit fix; `profile_id` may stay `NULL` until `fleetos-sync-identity` at operational tier. |
| 5 | **Billing unchanged on approve** — `subscription_status` remains `none` until Billing Core / checkout (user lands on `/app`). |
| 6 | **Idempotent reviews** — repeating the same decision on the same tenant returns **200** with current snapshot (no double-write). |

---

## 3. Actors

| Actor | Description |
|-------|-------------|
| **Applicant** | CodeVertex user (`codevertex_user_id` = JWT `sub`) who submitted via `fleetos-submit-company`. |
| **Platform reviewer** | CodeVertex/FleetOS internal operator with permission to call admin Edge functions. |
| **FleetOS Edge** | Validates admin auth, performs transactional DB updates via `service_role`. |
| **Auth Core** | SSO + `codevertex_edge_jwt` for applicants only in P1; **not** updated by review endpoints. |

### 3.1 Who may approve (P1 decision)

| Option | P1.1 (recommended first) | P1.2 (hardening) |
|--------|--------------------------|------------------|
| **Platform admin** | Shared secret `FLEETOS_ADMIN_SECRET` in `X-FleetOS-Admin-Secret` header (operator CLI / internal BFF) | Same secret **or** migration to JWT claim |
| **FleetOS tenant admin** | **No** — tenant `owner` must not approve their own application | Still **no** |
| **Auth Core global admin** | **No direct DB** — may use FleetOS Edge if given secret | Optional: Auth issues `codevertex_edge_jwt` with `platform_roles` including `fleetos_platform_reviewer` |

**Canonical P1 reviewer identity for audit:**

- When using **secret auth:** `reviewed_by_codevertex_user_id` = `null` and `reviewer_source = "fleetos_admin_secret"`, plus optional `reviewer_label` from request body (display name / email for humans).
- When using **JWT auth (P1.2):** `reviewed_by_codevertex_user_id` = verified JWT `sub`, `reviewer_source = "codevertex_platform_jwt"`.

**Not in P1:** Per-reviewer RBAC table in Postgres (use env allowlist `FLEETOS_ADMIN_REVIEWER_SUBS` optional in P1.2).

---

## 4. State model

### 4.1 Tenant statuses (existing CHECK)

`pending_review` | `active` | `inactive` | `suspended` | `revoked` | `archived`

### 4.2 Membership statuses (existing CHECK)

`invited` | `pending` | `active` | `suspended` | `removed`

### 4.3 Approve vs reject (canonical writes)

| Decision | `tenants.status` | `tenants.subscription_status` | Owner `tenant_members` | Other pending members on tenant |
|----------|------------------|-------------------------------|-------------------------|-------------------------------|
| **approve** | `active` | **unchanged** (typically `none`) | `status=active`, `is_active=true` | **P1.1:** only `role IN ('owner','admin')` with `status IN ('pending','invited')` → `active` / `is_active=true`. **P1.2:** configurable policy for co-applicants. |
| **reject** | `revoked` | unchanged | `status=suspended`, `is_active=false` | Same roles: `suspended`, `is_active=false` |

#### Why not `archived` on reject?

- **`archived`** = historical retention / decommissioned workspace, not “application denied.”
- **`revoked`** = explicit permanent disable; maps to `gates.tenant_approval = revoked` and `/access-revoked` in `fleetos-get-my-access`.

#### Why not `removed` on reject (P1.1)?

- `fleetos-get-my-access` **excludes** `tenant_members.status = removed` from resolution.
- If member were `removed`, applicant could appear as `needs_onboarding` and **submit again** without seeing rejection.
- **P1.1:** keep member row visible with `tenant.status = revoked` and member `suspended` (tenant revocation wins in `resolveTenantApproval`).
- **P1.2 (optional):** add `application_rejected` access state or load `removed` members when `tenants.status = revoked`.

#### Why member `suspended` and not `pending` on reject?

- `pending` + `tenant.revoked` still resolves to `revoked` today, but `suspended` signals admin action and blocks invite/activation paths consistently with lifecycle docs.

### 4.4 Expected applicant `access_state` after review

| After | `fleetos-get-my-access` | `redirect_path` |
|-------|-------------------------|-----------------|
| **approve** (`subscription_status = none`) | `active_unsubscribed` | `/app` |
| **approve** (`subscription_status ∈ {active,trialing}`)* | `active` | `/dashboard` |
| **reject** | `revoked` | `/access-revoked` |

\*Unusual immediately after approve; documented for manual SQL / billing race. P1 approve MUST NOT set subscription.

### 4.5 State transition matrix (admin actions)

| From tenant status | Admin action | To tenant | To owner member | Applicant access |
|--------------------|--------------|-----------|-----------------|------------------|
| `pending_review` | **approve** | `active` | `active` | `/app` |
| `pending_review` | **reject** | `revoked` | `suspended` | `/access-revoked` |
| `active` | approve (idempotent) | `active` | `active` | `/app` or `/dashboard` |
| `revoked` | reject (idempotent) | `revoked` | `suspended` | `/access-revoked` |
| `active` | reject | **409** `invalid_state_transition` | — | — |
| `suspended` | approve/reject | **409** | — | — |

**Re-apply after reject:** `fleetos-submit-company` conflict rules only block when an owner/admin has **pending** membership on **`pending_review`** tenant. A **revoked** tenant does **not** block a **new** application (new slug). Product may add cooldown in P2.

---

## 5. Onboarding metadata & audit trail

### 5.1 Existing shape (P0 submit)

```json
{
  "onboarding": {
    "legal_name": "Acme Transport Unipessoal Lda",
    "tax_id": "123456789",
    "country_code": "PT",
    "submitted_at": "2026-05-29T12:00:00.000Z",
    "submitted_by_codevertex_user_id": "a0000000-0000-4000-8000-0000000000c1",
    "review_notes": null
  }
}
```

### 5.2 P1 review block (merge, do not replace onboarding)

```json
{
  "onboarding": {
    "legal_name": "...",
    "tax_id": "...",
    "country_code": "PT",
    "submitted_at": "2026-05-29T12:00:00.000Z",
    "submitted_by_codevertex_user_id": "a0000000-0000-4000-8000-0000000000c1",
    "review_notes": "Documents verified. Welcome to FleetOS.",
    "review": {
      "decision": "approved",
      "reviewed_at": "2026-05-30T09:15:00.000Z",
      "reviewed_by_codevertex_user_id": null,
      "reviewer_source": "fleetos_admin_secret",
      "reviewer_label": "ops@codevertex.cc",
      "previous_tenant_status": "pending_review",
      "previous_membership_status": "pending"
    }
  }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `review.decision` | Yes on review | `approved` \| `rejected` |
| `review.reviewed_at` | Yes | ISO-8601 UTC |
| `review.reviewed_by_codevertex_user_id` | No | UUID when JWT reviewer (P1.2) |
| `review.reviewer_source` | Yes | `fleetos_admin_secret` \| `codevertex_platform_jwt` \| `sql_manual` |
| `review.reviewer_label` | No | Human-readable operator id |
| `review_notes` (top-level) | Recommended | Duplicated for backward compatibility with P0 readers |

**Immutability:** Once `review.decision` is set, P1 **forbids** changing decision without `force: true` header (P1.2 only) or manual SQL break-glass.

---

## 6. Auth Core coordination (explicit non-goal)

### 6.1 User preference (accepted)

**P1 does NOT call Auth Core** to update `app_membership` / `fleetos_tenant_id` / `fleetos_role` on approve or reject.

| Layer | Responsibility |
|-------|----------------|
| **Auth Core** | Identity, SSO, `codevertex_edge_jwt`, coarse app access (`membership_status` in JWT may remain `pending` or `active` independently) |
| **FleetOS DB + get-my-access** | Company approval, Preview/Setup/Operations routing |

### 6.2 Implications

| Topic | Behavior |
|-------|----------|
| Applicant JWT `membership_status` | May still be `pending` after FleetOS approve — **router must use `fleetos-get-my-access`**, not JWT alone (P0.3A already does). |
| Response `auth_core` hints | **Optional informational object only** — same pattern as `fleetos-submit-company`; **no Edge outbound call**. |
| Manual ops | Runbook may still document optional Auth Core update for support dashboards — **not automated in P1**. |

### 6.3 Example informational hint (not an API call)

```json
{
  "auth_core": {
    "note": "FleetOS approval recorded. Auth Core membership is not updated by this endpoint.",
    "suggested_membership_status": "active",
    "fleetos_tenant_id": "t-uuid",
    "fleetos_role": "owner"
  }
}
```

---

## 7. Security

### 7.1 Threat model

| Risk | Mitigation |
|------|------------|
| Public internet calls admin Edge | `verify_jwt = false` on function but **require** `X-FleetOS-Admin-Secret`; reject missing/invalid secret before DB |
| Secret leakage | Rotate `FLEETOS_ADMIN_SECRET`; never in frontend bundle; BFF or operator vault only |
| Applicant approves own company | Admin endpoints **do not** accept applicant `codevertex_edge_jwt` as sole auth in P1.1 |
| service_role exposure | Only inside Deno Edge; never returned to client |
| CORS abuse | Same `cors.ts` allowlist as other FleetOS functions; admin tools may use curl from CI |

### 7.2 Authentication modes

| Mode | Header | P1.1 | Validation |
|------|--------|------|------------|
| **A — Shared secret (default)** | `X-FleetOS-Admin-Secret: <secret>` | **Yes** | Timing-safe compare vs `FLEETOS_ADMIN_SECRET` env |
| **B — Platform JWT** | `Authorization: Bearer <jwt>` | P1.2 | Verify RS256 + claim `platform_role` or `fleetos_admin` in allowlist |
| **C — Supabase user JWT** | — | **No** | RLS not defined for admin queue in P1 |

**Dual auth (P1.2):** Accept **either** valid secret **or** valid platform JWT.

### 7.3 Authorization

| Rule | Detail |
|------|--------|
| List/review | Requires admin auth only |
| Cross-tenant read | Allowed for platform reviewer (all `pending_review` tenants) |
| Writes | Only `approve` / `reject` paths; no arbitrary SQL |

### 7.4 Rate limiting (P1.2)

- Optional: Cloudflare / Supabase platform limits; document 429 policy later.

---

## 8. Endpoints

Base URL: `{SUPABASE_URL}/functions/v1`

| Function | Method | Auth |
|----------|--------|------|
| `fleetos-admin-list-tenant-applications` | `POST` | Admin secret (P1.1) |
| `fleetos-admin-review-tenant` | `POST` | Admin secret (P1.1) |

**Why POST for list:** Consistent with other FleetOS Edge functions; supports filter body without query-string limits.

---

## 9. `fleetos-admin-list-tenant-applications`

### 9.1 Purpose

Paginated queue of company applications awaiting review.

### 9.2 Request

```http
POST /functions/v1/fleetos-admin-list-tenant-applications
X-FleetOS-Admin-Secret: <secret>
Content-Type: application/json
```

```json
{
  "status": "pending_review",
  "limit": 50,
  "cursor": null,
  "sort": "submitted_at_asc",
  "filters": {
    "country_code": null,
    "submitted_after": null,
    "submitted_before": null,
    "q": null
  }
}
```

| Field | Default | Rules |
|-------|---------|-------|
| `status` | `pending_review` | P1.1 only allows `pending_review`; P1.2 may add `revoked` / `active` for history |
| `limit` | `50` | 1–100 |
| `cursor` | `null` | Opaque cursor from previous response |
| `sort` | `submitted_at_asc` | `submitted_at_asc` \| `submitted_at_desc` |
| `filters.q` | — | Optional ILIKE on `tenants.name`, `tenants.slug`, `metadata.onboarding.legal_name` |

### 9.3 Success response `200`

```json
{
  "ok": true,
  "items": [
    {
      "tenant": {
        "id": "t-uuid",
        "name": "Acme Transport Lda",
        "slug": "acme-transport",
        "status": "pending_review",
        "locale": "pt-PT",
        "currency": "EUR",
        "timezone": "Europe/Lisbon",
        "subscription_status": "none",
        "billing_plan_code": null,
        "created_at": "2026-05-29T12:00:00.000Z",
        "submitted_at": "2026-05-29T12:00:00.000Z"
      },
      "onboarding": {
        "legal_name": "Acme Transport Unipessoal Lda",
        "tax_id": "123456789",
        "country_code": "PT",
        "submitted_at": "2026-05-29T12:00:00.000Z",
        "submitted_by_codevertex_user_id": "a0000000-0000-4000-8000-0000000000c1",
        "review_notes": null,
        "review": null
      },
      "submitter_membership": {
        "id": "m-uuid",
        "role": "owner",
        "status": "pending",
        "codevertex_user_id": "a0000000-0000-4000-8000-0000000000c1",
        "profile_id": null,
        "is_active": false
      },
      "counts": {
        "pending_members": 1
      }
    }
  ],
  "page": {
    "limit": 50,
    "next_cursor": null,
    "total_estimate": 1
  }
}
```

### 9.4 Data loading rules

```sql
-- Conceptual (Edge uses service_role)
SELECT t.*, tm.*
FROM tenants t
JOIN tenant_members tm ON tm.tenant_id = t.id
WHERE t.status = 'pending_review'
  AND tm.role IN ('owner', 'admin')
  AND tm.status IN ('pending', 'invited')
ORDER BY (t.metadata->'onboarding'->>'submitted_at') ASC NULLS LAST;
```

- **One list row per tenant**; prefer submitter = `metadata.onboarding.submitted_by_codevertex_user_id` match, else oldest owner `pending`.
- **Do not** return full `metadata` blob in list (only `onboarding` subtree).

### 9.5 Errors

| HTTP | `error` | When |
|------|---------|------|
| 401 | `admin_unauthorized` | Missing/invalid secret |
| 400 | `validation_error` | Bad limit/sort |
| 500 | `database_error` | Query failed |

---

## 10. `fleetos-admin-get-tenant-application` (optional P1.1 / recommended P1.1)

If list payload is insufficient, add thin detail endpoint (same auth):

```http
POST /functions/v1/fleetos-admin-get-tenant-application
```

```json
{ "tenant_id": "t-uuid" }
```

Response: single item shape from §9.3 + `tenant_settings` snapshot + all `tenant_members` rows (read-only).  

**If scope must stay at two endpoints only:** embed detail via `GET` semantics inside **list** with `tenant_id` filter:

```json
{ "tenant_id": "t-uuid", "status": "pending_review" }
```

→ returns `items` length 0 or 1. **P1.1 recommendation:** use **list with `tenant_id`** to avoid a third function.

---

## 11. `fleetos-admin-review-tenant`

### 11.1 Purpose

Approve or reject one `pending_review` application atomically.

### 11.2 Request

```http
POST /functions/v1/fleetos-admin-review-tenant
X-FleetOS-Admin-Secret: <secret>
Content-Type: application/json
```

```json
{
  "tenant_id": "t-uuid",
  "decision": "approve",
  "review_notes": "Verified NIF and company registration.",
  "reviewer_label": "ops@codevertex.cc"
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `tenant_id` | Yes | UUID |
| `decision` | Yes | `approve` \| `reject` |
| `review_notes` | No | 0–2000 chars; required for `reject` in P1.2 (optional P1.1) |
| `reviewer_label` | No | Operator display string |

### 11.3 Success response `200` (or `201` first review)

```json
{
  "ok": true,
  "decision": "approve",
  "idempotent": false,
  "tenant": {
    "id": "t-uuid",
    "name": "Acme Transport Lda",
    "slug": "acme-transport",
    "status": "active",
    "subscription_status": "none"
  },
  "memberships_updated": [
    {
      "id": "m-uuid",
      "codevertex_user_id": "a0000000-0000-4000-8000-0000000000c1",
      "role": "owner",
      "status": "active",
      "is_active": true
    }
  ],
  "onboarding_review": {
    "decision": "approved",
    "reviewed_at": "2026-05-30T09:15:00.000Z",
    "reviewed_by_codevertex_user_id": null,
    "reviewer_source": "fleetos_admin_secret",
    "review_notes": "Verified NIF and company registration."
  },
  "access_preview": {
    "submitter_access_state": "active_unsubscribed",
    "submitter_redirect_path": "/app"
  },
  "auth_core": {
    "note": "Auth Core not updated by FleetOS P1.",
    "suggested_membership_status": "active",
    "fleetos_tenant_id": "t-uuid",
    "fleetos_role": "owner"
  }
}
```

**Reject** response: same shape with `decision: "reject"`, `tenant.status: "revoked"`, membership `suspended`, `access_preview.submitter_access_state: "revoked"`, `submitter_redirect_path: "/access-revoked"`.

`access_preview` is computed in Edge via shared `fleetos-access` helpers (no extra HTTP) for operator confidence — **not** a substitute for applicant calling `fleetos-get-my-access`.

### 11.4 Idempotency

| Condition | HTTP | Body |
|-----------|------|------|
| Same `decision` already applied (per `metadata.onboarding.review.decision`) | `200` | `idempotent: true`, current snapshot |
| Opposite decision requested | `409` | `error: review_decision_conflict` |
| Tenant not `pending_review` and no prior review | `409` | `invalid_state_transition` |

### 11.5 Database transaction (approve)

```txt
BEGIN;
  SELECT id, status, metadata, subscription_status
  FROM tenants WHERE id = :tenant_id FOR UPDATE;

  -- Preconditions: status = pending_review (or idempotent already active)

  UPDATE tenants SET
    status = 'active',
    metadata = jsonb_set(metadata, '{onboarding,review}', :review_block),
    metadata = jsonb_set(metadata, '{onboarding,review_notes}', :review_notes_json),
    updated_at = now()
  WHERE id = :tenant_id;
  -- subscription_status NOT updated

  UPDATE tenant_members SET
    status = 'active',
    is_active = true,
    updated_at = now()
  WHERE tenant_id = :tenant_id
    AND role IN ('owner', 'admin')
    AND status IN ('pending', 'invited');

  -- Do NOT insert/update profiles
COMMIT;
```

### 11.6 Database transaction (reject)

```txt
BEGIN;
  SELECT ... FOR UPDATE;

  UPDATE tenants SET
    status = 'revoked',
    metadata = ... review block decision rejected ...,
    updated_at = now()
  WHERE id = :tenant_id;

  UPDATE tenant_members SET
    status = 'suspended',
    is_active = false,
    updated_at = now()
  WHERE tenant_id = :tenant_id
    AND role IN ('owner', 'admin')
    AND status IN ('pending', 'invited', 'active');  -- active: only if erroneous pre-approve

COMMIT;
```

### 11.7 Validations (hard failures)

| # | Validation | HTTP |
|---|------------|------|
| V1 | Tenant exists | 404 `tenant_not_found` |
| V2 | `tenants.status = pending_review` (unless idempotent) | 409 `invalid_state_transition` |
| V3 | ≥1 owner/admin member in `pending` or `invited` | 409 `no_pending_submitter` |
| V4 | `metadata.onboarding.submitted_at` present (warn if missing, don't block) | — |
| V5 | `decision` enum | 400 |
| V6 | On approve: no other `active` tenant for same submitter with conflicting slug policy | 409 `submitter_already_active_elsewhere` (optional P1.2) |

### 11.8 Rollback & failure

| Failure point | Action |
|---------------|--------|
| After tenant UPDATE, member UPDATE fails | **ROLLBACK** entire transaction |
| Metadata JSON merge fails | **ROLLBACK**; 500 `metadata_update_failed` |
| Partial member updates | Prevented by single transaction |
| Edge timeout mid-flight | Postgres rolls back; client retries idempotent read |

**Compensating manual runbook** (break-glass): document reverse SQL in `docs/integration/FLEETOS_ADMIN_APPROVAL_RUNBOOK.md` (P1.1 deliverable, not P1 code).

### 11.9 Errors

| HTTP | `error` | When |
|------|---------|------|
| 400 | `validation_error` | Body |
| 401 | `admin_unauthorized` | Secret |
| 404 | `tenant_not_found` | UUID |
| 409 | `invalid_state_transition` | Wrong tenant status |
| 409 | `review_decision_conflict` | Opposite decision |
| 409 | `no_pending_submitter` | No pending owner/admin |
| 500 | `database_error` | DB |

---

## 12. Shared module layout (implementation guide)

```
supabase/functions/_shared/
  fleetos-admin-auth.ts      # secret + optional JWT platform role (P1.2)
  fleetos-admin-applications.ts  # list + detail query builders
  fleetos-admin-review.ts    # approve/reject transactions + metadata merge
  fleetos-admin-review.test.ts
```

Handlers (thin):

```
supabase/functions/fleetos-admin-list-tenant-applications/index.ts
supabase/functions/fleetos-admin-review-tenant/index.ts
```

`config.toml`: `verify_jwt = false` (admin uses secret header, not Supabase JWT).

---

## 13. Frontend / operator UX (contract only)

| Surface | P1.1 | P1.2 |
|---------|------|------|
| curl / Postman / CI | **Yes** | Yes |
| Internal admin web app (`admin.fleetos…`) | No | **Yes** — calls Edge via server-side proxy holding secret |
| FleetOS main app `/dashboard` | No | No |

Applicant UX after approve: existing **Refresh application status** on `/preview` → `get-my-access` → redirect `/app` (P0.3C).

---

## 14. Observability

| Event | Log field |
|-------|-----------|
| List | `admin_list_tenants`, `count`, `reviewer_source` |
| Review approve/reject | `admin_review_tenant`, `tenant_id`, `decision`, `idempotent`, `reviewer_label` |

No PII in logs beyond `tenant_id` / `codevertex_user_id` UUIDs.

---

## 15. Phased delivery plan

### P1.1 — Edge + operator tools (MVP)

| Item | Deliverable |
|------|-------------|
| Shared admin auth | `FLEETOS_ADMIN_SECRET` validation |
| `fleetos-admin-list-tenant-applications` | Queue listing + `tenant_id` filter |
| `fleetos-admin-review-tenant` | approve + reject transactions |
| Tests | Deno unit tests for metadata merge, transition guards, idempotency |
| Docs | This contract + `FLEETOS_ADMIN_APPROVAL_RUNBOOK.md` + smoke curl |
| Deploy | Supabase secrets: `FLEETOS_ADMIN_SECRET` |

**Explicitly not P1.1:** Admin UI, Auth Core webhooks, email notifications, `profiles` upsert.

### P1.2 — Hardening & UI

| Item | Deliverable |
|------|-------------|
| Platform JWT auth | Claim-based reviewer `sub` in audit |
| Internal Admin UI | List, detail drawer, approve/reject with notes |
| get-my-access | Optional `application_rejected` clarity; safe handling if member `removed` |
| Notifications | Email to submitter on approve/reject |
| Re-apply policy | Cooldown / link old `revoked` tenant |
| Review history endpoint | List reviewed tenants |

### P1.3 — Automation (future)

| Item | Notes |
|------|-------|
| Billing → auto operational | Webhook sets `subscription_status` |
| Auth Core read-only sync | Optional display only |
| NIF / KYB integrations | External verification before approve |

---

## 16. Comparison with P0 manual SQL

| P0 manual | P1 contract |
|-----------|-------------|
| `UPDATE tenants SET status='active'` | Same + audit metadata |
| `UPDATE tenant_members SET active` | Same + `is_active=true` |
| Optional Auth Core update | **Still manual / out of band** |
| No reject standard | `revoked` + `suspended` + notes |
| No list queue | `fleetos-admin-list-tenant-applications` |

---

## 17. Open decisions (resolved for P1)

| # | Question | **Decision** |
|---|----------|----------------|
| 1 | Reject: `revoked` vs `archived`? | **`revoked`** |
| 2 | Reject: member `removed` vs `suspended`? | **`suspended`** (P1.1) — keeps row for access resolution |
| 3 | Update Auth Core on approve? | **No** (operational approval is FleetOS-only) |
| 4 | Admin auth P1.1? | **`X-FleetOS-Admin-Secret`** |
| 5 | Approve sets billing? | **No** — `subscription_status` stays `none` |
| 6 | Create `profiles` on approve? | **No** |
| 7 | Third endpoint for detail? | **List with `tenant_id` filter** (no third function P1.1) |
| 8 | Endpoint naming | **`fleetos-admin-review-tenant`** (approve + reject) |

---

## 18. References

- `docs/architecture/FLEETOS_COMPANY_ONBOARDING_P0_CONTRACT.md`
- `docs/architecture/FLEETOS_MEMBERSHIP_LIFECYCLE.md`
- `docs/integration/FLEETOS_SUBMIT_COMPANY_RISKS.md`
- `supabase/migrations/20260529130000_fleetos_company_onboarding_p0_schema.sql`
- `supabase/migrations/20260528150000_phase2a_tenant_members_foundation.sql`
- `supabase/functions/_shared/fleetos-access.ts`

---

## 19. Changelog

| Date | Change |
|------|--------|
| 2026-05-29 | Initial P1 admin approval contract (design only) |
