# FleetOS — Company Onboarding P0 (Technical Contract)

**Status:** Design only — no implementation in this document  
**Date:** 2026-05-29 (rev. P0.2b-2 — Preview Workspace vs Setup vs Operations)  
**Based on:** Company onboarding audit (2026-05-29)  
**Scope:** Auth Core SSO → company submit → **Preview Workspace** (pending) → approval → **Setup app** (unsubscribed) → **full operations** (subscription)

---

## 1. Purpose

Define the **P0** contract for FleetOS-managed company onboarding:

- Auth Core owns **identity** and **app-level FLEETOS membership** (`app_membership`).
- FleetOS owns **tenant**, **tenant_members**, **approval lifecycle**, and **billing gate** (read from tenant + Billing Core).
- No `tenant_applications` table in P0 — lifecycle is driven by `tenants.status` + `tenant_members.status` + subscription fields.
- **`pending_review`** → **Preview Workspace** (`/preview`): simulated product experience (mock dashboards, sample fleet, tutorials). **No real operational data** and **no invites**.
- **`active_unsubscribed`** → **Setup app** (`/app`): company **approved**, subscription **not** active. **Real setup data** allowed (company config, vehicles, drivers, team invites). **Billable / premium operations blocked**.
- **`active`** → **Operational mode** (`/dashboard`): approved + `subscription_status` in (`active`, `trialing`). Full fleet operations per role.

---

## 2. Target user journey (P0)

```txt
Auth Core login/register
  → FleetOS /sso/callback (consume ticket)
  → fleetos-get-my-access
  → [no tenant] /onboarding/company
  → fleetos-submit-company
  → tenants.status = pending_review, tenant_members (owner, pending)
  → /preview  (Preview Workspace — while awaiting approval)
       · simulated dashboards, sample vehicles/drivers/reports (MOCK)
       · tutorials, application status, pricing preview, support
       · NO real DB fleet data, NO invites, NO operations
  → [admin] fleetos-admin-approve-tenant OR manual SQL
  → tenants.active + tenant_members.active
  → fleetos-get-my-access → active_unsubscribed (subscription_status = none)
  → /app  (Setup app — approved, not subscribed)
       · REAL: company settings, vehicles, drivers, team invites, onboarding checklist
       · BLOCKED: bookings, dispatch, assignments, billable trips, payouts, customer ops
  → [Billing Core] subscription_status → active | trialing
  → fleetos-get-my-access → active
  → /dashboard (full operational shell)
```

**Invited users (driver, admin, …):**

| Phase | Behaviour |
|-------|-----------|
| Tenant `pending_review` | **Cannot** accept invites (no invite runtime P0; if added, block until approved) |
| Tenant `active_unsubscribed` | May join as member; **setup** allowed per role; **operations** blocked until tenant billing active |
| Tenant `active` | Full access per role |

---

## 3. Out of scope (P0)

| Area | Notes |
|------|--------|
| `tenant_invites` runtime | Schema exists; P1+ (invite accept still subject to billing gate when implemented) |
| Stripe / Billing Core **implementation** | Contract defines gate + URLs; checkout webhooks P1 |
| `tenant_customers` | Not part of onboarding |
| Booking / trip model | No real operational data in Demo Area |
| Advanced RBAC UI | Single owner role on create; role matrix documented for guards |
| `tenant_applications` table | Explicitly excluded |
| Multi-tenant selector UX | First tenant only |
| Email delivery for invites | N/A in P0 |
| Auth Core admin UI inside FleetOS | Approve via Edge or SQL runbook |

**In scope (contract only):** Preview Workspace routes, setup vs operational write tiers, billing gate, `access_state` / `capabilities`, Edge P0.2b-2 contract, future guards.

---

## 3.1 Preview vs setup vs operational data (definitions)

FleetOS uses **three data tiers**. Guards and API clients MUST tag requests with the intended tier (or infer from route + `access_state`).

| Tier | `access_state` | Storage | Examples | User perception |
|------|----------------|---------|----------|-----------------|
| **Preview (mock)** | `pending_review` | **No** tenant-scoped operational rows. UI uses fixtures, static JSON, or isolated `preview_*` namespace if ever persisted | Sample dashboard KPIs, demo vehicles on map, tutorial bookings | “This is how FleetOS will look” |
| **Setup (real)** | `active_unsubscribed` | **Yes** — real rows in `tenants`, `tenant_settings`, `vehicles`, `drivers`, `tenant_members` (invites), documents metadata | Add fleet, invite dispatcher, upload company logo | “I’m configuring my company before going live” |
| **Operational (real)** | `active` | **Yes** — bookings, assignments, trips, payouts, customer-facing flows, premium modules | Create booking, dispatch, close trip, invoice | “I’m running my business” |

**Hard rules:**

| Rule | Preview | Setup | Operational |
|------|---------|-------|---------------|
| INSERT `vehicles` / `drivers` | No (show mock only) | **Yes** | Yes |
| INSERT `booking_requests` / `assignments` | No | **No** | Yes |
| `tenant_invites` / invite members | No | **Yes** (when runtime exists) | Yes |
| PATCH `tenants.metadata` (application) | Yes (via Edge) | Yes | Yes |
| Checkout / subscribe | No | **Yes** | Yes (manage) |

**P0 frontend:** Preview pages MUST NOT call Supabase mutators on operational tables. Use `src/lib/mock-data` or dedicated `previewFixtures.ts` until P1 preview API exists.

---

## 4. Four-layer access model

FleetOS routing and guards MUST evaluate **four independent dimensions**. Never collapse them into a single boolean.

### 4.1 Layer summary

| # | Layer | Source of truth | Session / API field | Question answered |
|---|--------|-----------------|---------------------|-------------------|
| 1 | **Auth membership** | Auth Core `app_membership` + JWT `membership_status` | `auth_membership_status`, `fleetosMembershipStatus` | May this identity use FleetOS at all? |
| 2 | **Tenant approval** | `tenants.status` + `tenant_members.status` | `gates.tenant_approval` | Is this company approved for this user? |
| 3 | **Tenant billing** | `tenants.billing_plan_code` + `tenants.subscription_status` (P0.1+) and/or Billing Core entitlement API (P1) | `gates.tenant_billing` | May this **company** run paid operations? |
| 4 | **Role permissions** | `tenant_members.role` (+ future `permissions` jsonb) | `membership.role`, `capabilities.*` | What may **this user** do inside an approved+billed tenant? |

### 4.2 Auth membership (layer 1)

| Value | Meaning | FleetOS UX |
|-------|---------|------------|
| `missing` | No FLEETOS app membership | Register / contact admin |
| `pending` | Identity ok; app access not fully granted | Preview Workspace allowed when `pending_review` |
| `active` | App membership granted | Normal FleetOS entry (still subject to layers 2–4) |
| `suspended` | Auth-level lock | `/access-suspended` |
| `revoked` | Auth-level permanent lock | `/access-revoked` |

**P0 rule:** Router uses **`fleetos-get-my-access`** as primary; Auth `pending` **does not** block Demo Area when `access_state === pending_review`.

### 4.3 Tenant approval (layer 2)

| `gates.tenant_approval` | DB condition (primary tenant row) | Demo / app access |
|-------------------------|-----------------------------------|-------------------|
| `none` | No non-removed `tenant_members` for `sub` | Onboarding only |
| `pending_review` | `tenants.status = pending_review` and/or member `pending`/`invited` | **Preview Workspace** (`/preview/*`) |
| `approved` | `tenants.status = active` AND `tenant_members.status = active` | Setup app or operational (layer 3) |
| `suspended` | tenant or member `suspended` | `/access-suspended` |
| `revoked` | tenant `revoked`/`archived`/`inactive` or no viable membership | `/access-revoked` |

### 4.4 Tenant billing (layer 3)

| `gates.tenant_billing` | P0 read rule (`subscription_status`) | Setup writes | Operational writes |
|------------------------|--------------------------------------|--------------|-------------------|
| `none` | `none` (default) | **Allowed** if approval `approved` | **Denied** |
| `trialing` | `trialing` | Allowed | **Allowed** |
| `active` | `active` (or legacy `billing_plan_code` + policy — see P0.2b-1) | Allowed | **Allowed** |
| `past_due` | `past_due` | Read-only or limited | **Denied** |
| `canceled` | `canceled` | Read-only or limited | **Denied** |

**Billing gate (product definition):** Unlocks **operational / billable / premium** modules only. It does **not** block approved companies from **setup** (fleet master data, team, company profile).

**Schema:** `tenants.subscription_status` — migration `20260529140000_fleetos_billing_gate_p0_2b_1_schema.sql` (applied separately).

**P1:** Billing Core webhooks maintain `subscription_status`; Edge may call entitlement API.

### 4.5 Role permissions (layer 4)

Canonical roles: `owner`, `admin`, `manager`, `dispatcher`, `driver`, `mechanic`, `viewer`.

Role caps apply **after** approval and **after** capability flags from `access_state`. Billing gate blocks **operational** tier only, not setup tier.

### 4.6 Composite routing rule

```txt
IF NOT authenticated → /login
ELSE IF gates.tenant_approval = none → /onboarding/company
ELSE IF gates.tenant_approval = pending_review → /preview
ELSE IF gates.tenant_approval = approved AND gates.tenant_billing NOT IN (active, trialing) → /app
ELSE IF gates.tenant_approval = approved AND gates.tenant_billing IN (active, trialing) → /dashboard
ELSE IF suspended → /access-suspended
ELSE IF revoked → /access-revoked
```

`access_state` (§8) is the **stable UX enum** derived from this matrix.

### 4.7 Final `access_state` summary (authoritative)

| `access_state` | Approval | Billing | Redirect | Workspace mode |
|----------------|----------|---------|----------|----------------|
| `needs_onboarding` | none | — | `/onboarding/company` | Submit company |
| `pending_review` | pending | — | `/preview` | **Preview** (mock/simulated) |
| `active_unsubscribed` | approved | not active/trialing | `/app` | **Setup** (real master data) |
| `active` | approved | active/trialing | `/dashboard` | **Operations** (full) |
| `suspended` | suspended | any | `/access-suspended` | Blocked (support/legal only) |
| `revoked` | revoked | any | `/access-revoked` | Blocked (support/legal only) |

---

## 5. Schema changes (minimal P0)

### 5.1 `tenants.status` — extend CHECK

**Current (Phase 3):** `active`, `inactive`, `suspended`  
**P0 target:**

```sql
-- Proposed CHECK (replace tenants_status_check)
status IN (
  'pending_review',  -- submitted, awaiting FleetOS/CodeVertex admin
  'active',          -- operational
  'suspended',       -- temporary lock (align with docs)
  'revoked',         -- permanent disable
  'archived',        -- historical (optional P0, recommended for docs alignment)
  'inactive'         -- keep for backward compatibility OR map to archived
)
```

**Recommendation:** Treat legacy `inactive` as read-only compatibility; new writes use `archived` or `revoked` per lifecycle doc.

### 5.2 Columns on `tenants` (no new table)

Use existing columns + optional `metadata` jsonb if not present:

| Field | Use in onboarding |
|-------|-------------------|
| `name` | Legal / display company name (required) |
| `slug` | URL slug (required, unique) |
| `status` | `pending_review` on submit |
| `locale`, `currency`, `timezone` | Defaults from form or `pt-PT` / `EUR` / `Europe/Lisbon` |
| `logo_url`, `primary_color` | Optional on submit |
| `billing_plan_code` | NULL on submit; set on subscribe (manual P0 QA or Billing Core P1) |
| `subscription_status` | `none` default; `trialing`, `active`, `past_due`, `canceled` (see §5.6, migration P0.2b-1) |
| `legacy_company_id` | NULL |

**If `metadata` jsonb does not exist on `tenants`:** add in P0 migration:

```sql
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
```

**Suggested `metadata` keys (P0):**

```json
{
  "onboarding": {
    "legal_name": "string",
    "tax_id": "string",
    "country_code": "PT",
    "submitted_at": "ISO8601",
    "submitted_by_codevertex_user_id": "uuid",
    "review_notes": null
  }
}
```

### 5.3 `tenant_members` (no schema change)

| Field | On submit | On approve |
|-------|-----------|------------|
| `role` | `owner` | `owner` |
| `status` | `pending` | `active` |
| `codevertex_user_id` | JWT `sub` | unchanged |
| `profile_id` | from `profiles` if exists | unchanged |
| `is_active` | `false` | `true` |

### 5.4 `tenant_settings`

Create row on submit with defaults (`booking_enabled`, etc. = true per Phase 3 migration).

### 5.5 RLS (P0 note)

Writes go through **Edge + service_role** only. No new permissive RLS for `authenticated` on insert tenants in P0.

### 5.6 Billing gate columns (P0.2b-1 — applied via migration)

See `supabase/migrations/20260529140000_fleetos_billing_gate_p0_2b_1_schema.sql` and `docs/database/_validate_fleetos_billing_gate_schema.sql`.

**Preview Workspace:** No INSERT/UPDATE on operational tables from browser; mock/fixtures only (§3.1).

**Setup app:** Real INSERT on setup-tier tables only; operational-tier tables remain read-only or hidden.

---

## 6. Auth Core integration

### 6.1 Where data lives (Auth Core vs FleetOS)

| Concept | Auth Core | FleetOS DB |
|---------|-----------|------------|
| User identity | `auth.users` / profile | `profiles.codevertex_user_id` |
| App access FLEETOS | `app_memberships` (conceptual) | **not stored** — mirrored in session as `fleetosMembershipStatus` |
| Company / tenant | optional mirror fields | `tenants` |
| Role in company | optional on app membership | `tenant_members.role` |
| Tenant link on membership | optional claim / field | `tenant_members.tenant_id` |

### 6.2 Recommended Auth Core fields (contract with Auth team)

| Field | When set | Values (P0) |
|-------|----------|-------------|
| `app_code` | Always | `FLEETOS` |
| `fleetosMembershipStatus` / `fleetos_membership_status` | consume + updates | See lifecycle below |
| `fleetos_tenant_id` | After submit-company | UUID of `tenants.id` |
| `fleetos_role` | After submit-company | `owner` (canonical) or legacy `tenant_admin` until frontend canonical cut |

**JWT `codevertex_edge_jwt` claims (existing Edge verifier):**

| Claim | Onboarding submit | After approve |
|-------|-------------------|---------------|
| `sub` | user UUID | same |
| `membership_status` | `pending` recommended | `active` |
| `tenant_id` | new tenant UUID | same |
| `role` | `owner` | `owner` |
| `app_code` | `FLEETOS` | `FLEETOS` |
| `token_use` | `fleetos_edge_verify` | same |

### 6.3 When `app_membership` FLEETOS is `pending` vs `active`

| Event | Auth app membership | Rationale |
|-------|---------------------|-----------|
| User registers, no company | `missing` or `pending` | No operational access |
| After `fleetos-submit-company` | **`pending`** (recommended) | User authenticated but not operationally approved |
| After admin approve | **`active`** | Full FleetOS access |
| User suspended/revoked | `suspended` / `revoked` | Auth gate screens |

**FleetOS action after submit:** Call Auth Core admin API (out of band P0) **or** rely on next SSO consume returning `pending` if Auth sets it when `fleetos_tenant_id` is bound.

**P0 minimum if Auth API not ready:** FleetOS gates primarily on **operational** status; session `fleetosMembershipStatus` from consume may still be `active` — frontend must use `fleetos-get-my-access` as primary router (see §10).

### 6.4 `consume-sso-ticket` response (flat contract — already supported)

FleetOS parser accepts flat body; Edge onboarding must **not** assume `fleetos-sync-identity` runs on first login without an active tenant.

---

## 7. Edge Functions — overview

| Function | Auth | Purpose |
|----------|------|---------|
| `fleetos-get-my-access` | Bearer `codevertex_edge_jwt` | Resolve `access_state`, `gates`, `capabilities`, billing gate, redirect |
| `fleetos-submit-company` | Bearer `codevertex_edge_jwt` | Create tenant + owner member (pending) |
| `fleetos-admin-approve-tenant` | Service/admin secret (P0) | Approve tenant + member; optional Auth callback |

**Unchanged in P0 (behavioral note):**

- `fleetos-sync-identity` — call **after approval** or when JWT + tenant already `active`; not for initial pending create.
- `fleetos-list-tenants` — returns only **active** operational tenants for shell (P0: may return empty until `active` + subscription; limited shell uses get-my-access tenant blob).

**HTTP conventions (all P0 Edge):**

- `POST` only (except OPTIONS)
- CORS: `FLEETOS_ALLOWED_ORIGINS`
- Headers: `Authorization: Bearer <codevertex_edge_jwt>`, `apikey: <VITE_SUPABASE_ANON_KEY>`
- Errors: JSON `{ "error": "code", "message": "human-safe" }`

---

## 8. `fleetos-get-my-access`

### 8.1 Purpose

Single read after SSO (and on app boot) to determine:

- Does user need company onboarding?
- Should user enter **Preview Workspace** (`pending_review`)?
- Is tenant **approved** but **billing** blocks **operational** (not setup) writes?
- Can user access **full** operational dashboard?
- What are the four **gates** and fine-grained **capabilities**?

### 8.2 Request

```http
POST /functions/v1/fleetos-get-my-access
Authorization: Bearer <codevertex_edge_jwt>
apikey: <supabase_anon_key>
Content-Type: application/json

{}
```

No body fields required (identity from JWT only).

### 8.3 Response `200` — envelope

```json
{
  "ok": true,
  "access_state": "needs_onboarding",
  "auth_membership_status": "pending",
  "codevertex_user_id": "uuid",
  "tenant": null,
  "membership": null,
  "gates": {
    "auth_membership": "pending",
    "tenant_approval": "none",
    "tenant_billing": "none",
    "role": null
  },
  "redirect_path": "/onboarding/company",
  "capabilities": {
    "can_submit_company": true,
    "can_access_preview_workspace": false,
    "can_access_app_shell": false,
    "can_access_dashboard": false,
    "can_read_preview_mock_data": false,
    "can_write_setup_data": false,
    "can_write_operational_data": false,
    "can_manage_billing": false,
    "can_invite_members": false,
    "can_view_application_status": false,
    "can_edit_company_application": false,
    "can_view_pricing": false,
    "can_start_checkout": false,
    "can_contact_support": true,
    "can_access_legal_support": true
  }
}
```

**Backward compatibility (P0.3+):** Clients may ignore unknown keys. Deprecated: `can_access_demo_area` → use `can_access_preview_workspace`. Existing Edge P0.2A may still return old capability names until P0.2b-2 deploy.

### 8.4 `access_state` enum (P0 — final)

| Value | Meaning | `redirect_path` | Workspace |
|-------|---------|-----------------|-----------|
| `needs_onboarding` | No company submitted | `/onboarding/company` | Onboarding form |
| `pending_review` | Company submitted; awaiting approval | `/preview` | **Preview Workspace** (mock) |
| `active_unsubscribed` | Approved; no active subscription | `/app` | **Setup app** (real master data) |
| `active` | Approved + subscription active/trialing | `/dashboard` | **Full operations** |
| `suspended` | Tenant or member suspended | `/access-suspended` | Blocked |
| `revoked` | Tenant revoked / no viable membership | `/access-revoked` | Blocked |

**Legacy route aliases (router):**

| Legacy path | Redirect to |
|-------------|---------------|
| `/pending-approval` | `/preview` or `/preview/status` |
| `/demo`, `/demo/*` | `/preview`, `/preview/*` |

**Priority when multiple rows exist (P0):** Prefer highest tenant: `active` (with billing split) > `pending_review` > `suspended` > `revoked`. Multi-tenant picker is out of scope — return **primary** tenant (most recent `created_at`).

### 8.4.1 `gates` object (required in response)

| Field | Type | Values |
|-------|------|--------|
| `auth_membership` | string | `missing`, `pending`, `active`, `suspended`, `revoked` (from JWT, normalized) |
| `tenant_approval` | string | `none`, `pending_review`, `approved`, `suspended`, `revoked` |
| `tenant_billing` | string | `none`, `trialing`, `active`, `past_due`, `canceled` |
| `role` | string \| null | Canonical role from `tenant_members.role` |

### 8.4.2 `capabilities` matrix (by `access_state`)

| Capability | `needs_onboarding` | `pending_review` | `active_unsubscribed` | `active` | `suspended` / `revoked` |
|------------|-------------------|------------------|----------------------|----------|-------------------------|
| `can_submit_company` | true | false | false | false | false |
| `can_access_preview_workspace` | false | **true** | false | false | false |
| `can_access_app_shell` | false | false | **true** | true | false |
| `can_access_dashboard` | false | false | false | **true** | false |
| `can_read_preview_mock_data` | false | **true** | false | false | false |
| `can_write_setup_data` | false | **false** | **true** | true | false |
| `can_write_operational_data` | false | **false** | **false** | **true** | false |
| `can_manage_billing` | false | false | owner/admin | owner/admin | false |
| `can_invite_members` | false | **false** | **true** (owner/admin) | owner/admin | false |
| `can_view_application_status` | false | **true** | false | false | false |
| `can_edit_company_application` | false | **true** (metadata) | false | false | false |
| `can_configure_company` | false | false | **true** | true | false |
| `can_view_pricing` | false | **true** (preview) | **true** | true | false |
| `can_start_checkout` | false | **false** | **true** | true | false |
| `can_contact_support` | true | true | true | true | **true** |
| `can_access_legal_support` | true | true | true | true | **true** |

**Preview (`pending_review`):** `can_read_preview_mock_data = true`; all write flags false. UI shows **simulated** dashboards, sample vehicles/drivers/reports, tutorials — not tenant-bound Supabase fleet data.

**Setup (`active_unsubscribed`):** `can_write_setup_data = true` covers: company/tenant settings, **real** `vehicles`, **real** `drivers`, team invites, profile completion. `can_write_operational_data = false` blocks: bookings, dispatch, assignments, trips, payouts, customer portal ops, premium modules.

**Operations (`active`):** Both setup and operational writes true (subject to role).

**Suspended / revoked:** Only `can_contact_support` and `can_access_legal_support` (plus sign-out).

### 8.5 Response examples by state

#### `needs_onboarding`

```json
{
  "ok": true,
  "access_state": "needs_onboarding",
  "auth_membership_status": "active",
  "codevertex_user_id": "a0000000-0000-4000-8000-0000000000c1",
  "tenant": null,
  "membership": null,
  "redirect_path": "/onboarding/company",
  "capabilities": {
    "can_submit_company": true,
    "can_access_dashboard": false,
    "can_access_operational_shell": false
  }
}
```

#### `pending_review` (Preview Workspace)

```json
{
  "ok": true,
  "access_state": "pending_review",
  "auth_membership_status": "pending",
  "codevertex_user_id": "a0000000-0000-4000-8000-0000000000c1",
  "tenant": {
    "id": "t-uuid",
    "name": "Acme Transport Lda",
    "slug": "acme-transport",
    "status": "pending_review",
    "submitted_at": "2026-05-29T12:00:00.000Z"
  },
  "membership": {
    "id": "m-uuid",
    "role": "owner",
    "status": "pending"
  },
  "gates": {
    "auth_membership": "pending",
    "tenant_approval": "pending_review",
    "tenant_billing": "none",
    "role": "owner"
  },
  "redirect_path": "/preview",
  "workspace_mode": "preview",
  "capabilities": {
    "can_submit_company": false,
    "can_access_preview_workspace": true,
    "can_access_app_shell": false,
    "can_access_dashboard": false,
    "can_read_preview_mock_data": true,
    "can_write_setup_data": false,
    "can_write_operational_data": false,
    "can_manage_billing": false,
    "can_invite_members": false,
    "can_view_application_status": true,
    "can_edit_company_application": true,
    "can_configure_company": false,
    "can_view_pricing": true,
    "can_start_checkout": false,
    "can_contact_support": true,
    "can_access_legal_support": true
  }
}
```

#### `active_unsubscribed` (Setup app — approved, billing gate on operations only)

```json
{
  "ok": true,
  "access_state": "active_unsubscribed",
  "auth_membership_status": "active",
  "codevertex_user_id": "a0000000-0000-4000-8000-0000000000c1",
  "tenant": {
    "id": "t-uuid",
    "name": "Acme Transport Lda",
    "slug": "acme-transport",
    "status": "active",
    "submitted_at": "2026-05-28T10:00:00.000Z",
    "billing_plan_code": null,
    "subscription_status": "none"
  },
  "membership": {
    "id": "m-uuid",
    "role": "owner",
    "status": "active"
  },
  "gates": {
    "auth_membership": "active",
    "tenant_approval": "approved",
    "tenant_billing": "none",
    "role": "owner"
  },
  "redirect_path": "/app",
  "workspace_mode": "setup",
  "capabilities": {
    "can_submit_company": false,
    "can_access_preview_workspace": false,
    "can_access_app_shell": true,
    "can_access_dashboard": false,
    "can_read_preview_mock_data": false,
    "can_write_setup_data": true,
    "can_write_operational_data": false,
    "can_manage_billing": true,
    "can_invite_members": true,
    "can_view_application_status": false,
    "can_edit_company_application": false,
    "can_configure_company": true,
    "can_view_pricing": true,
    "can_start_checkout": true,
    "can_contact_support": true,
    "can_access_legal_support": true
  },
  "billing": {
    "checkout_url": "https://billing.codevertex.cc/...",
    "manage_url": null
  }
}
```

#### `active` (approved + subscription)

```json
{
  "ok": true,
  "access_state": "active",
  "auth_membership_status": "active",
  "codevertex_user_id": "a0000000-0000-4000-8000-0000000000c1",
  "tenant": {
    "id": "t-uuid",
    "name": "Acme Transport Lda",
    "slug": "acme-transport",
    "status": "active",
    "submitted_at": "2026-05-28T10:00:00.000Z",
    "billing_plan_code": "fleetos_pro",
    "subscription_status": "active"
  },
  "membership": {
    "id": "m-uuid",
    "role": "owner",
    "status": "active"
  },
  "gates": {
    "auth_membership": "active",
    "tenant_approval": "approved",
    "tenant_billing": "active",
    "role": "owner"
  },
  "redirect_path": "/dashboard",
  "workspace_mode": "operational",
  "capabilities": {
    "can_submit_company": false,
    "can_access_preview_workspace": false,
    "can_access_app_shell": true,
    "can_access_dashboard": true,
    "can_read_preview_mock_data": false,
    "can_write_setup_data": true,
    "can_write_operational_data": true,
    "can_manage_billing": true,
    "can_invite_members": true,
    "can_view_application_status": false,
    "can_edit_company_application": false,
    "can_configure_company": true,
    "can_view_pricing": true,
    "can_start_checkout": true,
    "can_contact_support": true,
    "can_access_legal_support": true
  }
}
```

#### `suspended` / `revoked`

Same shape with `access_state` and matching `redirect_path`; include `tenant.status` / `membership.status` for UI copy.

### 8.6 Error responses

| HTTP | `error` | When |
|------|---------|------|
| 401 | `invalid_token` | JWT invalid/expired |
| 403 | `cors_origin_not_allowed` | Origin |
| 500 | `server_misconfigured` | Missing Supabase env |

---

## 9. `fleetos-submit-company`

### 9.1 Purpose

Create company workspace in **pending** state and link submitting user as **owner** (pending).

### 9.2 Request body

```json
{
  "company": {
    "name": "Acme Transport Lda",
    "legal_name": "Acme Transport Unipessoal Lda",
    "slug": "acme-transport",
    "country_code": "PT",
    "tax_id": "123456789",
    "locale": "pt-PT",
    "currency": "EUR",
    "timezone": "Europe/Lisbon",
    "primary_color": "#00B39A",
    "logo_url": null
  }
}
```

### 9.3 Field validation (P0)

| Field | Required | Rules |
|-------|----------|-------|
| `company.name` | Yes | 2–120 chars, trim |
| `company.legal_name` | Yes | 2–200 chars |
| `company.slug` | Yes | `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 3–48 chars, unique in `tenants.slug` |
| `company.country_code` | Yes | ISO 3166-1 alpha-2 (e.g. `PT`) |
| `company.tax_id` | Yes for `PT` | Non-empty; format validation P1 (NIF checksum optional P0: length 9 for PT) |
| `company.locale` | No | Default `pt-PT` |
| `company.currency` | No | Default `EUR` |
| `company.timezone` | No | Default `Europe/Lisbon` |
| `company.primary_color` | No | Hex `#RRGGBB` |
| `company.logo_url` | No | HTTPS URL or null |

### 9.4 Idempotency and constraints

| Rule | Implementation |
|------|----------------|
| **One pending tenant per owner** | Before insert: `SELECT` `tenant_members` WHERE `codevertex_user_id = sub` AND `status IN ('pending','invited')` JOIN tenant `pending_review` → if exists return **409** `pending_application_exists` with existing tenant id |
| **One active owner tenant** | If user already has `active` membership → **409** `already_has_active_membership` |
| **Slug unique** | DB unique constraint → map to **409** `slug_taken` |
| **Retry same payload** | Optional: same `sub` + same `slug` + `pending_review` within 24h → return **200** existing application (idempotent success) |

### 9.5 Success response `201` (or `200` idempotent)

```json
{
  "ok": true,
  "access_state": "pending_review",
  "tenant": {
    "id": "t-uuid",
    "name": "Acme Transport Lda",
    "slug": "acme-transport",
    "status": "pending_review",
    "submitted_at": "2026-05-29T12:00:00.000Z"
  },
  "membership": {
    "id": "m-uuid",
    "role": "owner",
    "status": "pending"
  },
  "redirect_path": "/preview",
  "auth_core": {
    "recommended_membership_status": "pending",
    "fleetos_tenant_id": "t-uuid",
    "fleetos_role": "owner"
  }
}
```

**Post-submit FleetOS frontend:**

1. Store nothing extra in localStorage beyond session.
2. Navigate to `/preview` (Preview Workspace home / application status).
3. (Optional) Call Auth Core internal API to set app membership `pending` + `fleetos_tenant_id` — **dependency** documented in runbook.

### 9.6 Error responses

| HTTP | `error` | When |
|------|---------|------|
| 400 | `validation_error` | Invalid body; include `fields: { "company.slug": "..." }` |
| 401 | `invalid_token` | JWT |
| 409 | `slug_taken` | Unique violation |
| 409 | `pending_application_exists` | User already has pending company |
| 409 | `already_has_active_membership` | User already operational |
| 500 | `database_error` | Insert failed |

### 9.7 Database writes (transaction)

```txt
BEGIN;
  INSERT tenants (status=pending_review, name, slug, metadata.onboarding, ...);
  INSERT tenant_settings (tenant_id, defaults);
  UPSERT profiles (codevertex_user_id=sub) if missing;
  INSERT tenant_members (tenant_id, sub, profile_id, role=owner, status=pending, is_active=false);
COMMIT;
```

**Do not** call `fleetos-sync-identity` in same request (it requires active tenant).

---

## 10. `fleetos-admin-approve-tenant` (P0)

### 10.1 Purpose

Transition `pending_review` → `active` for tenant and submitting owner member.

### 10.2 Auth options (choose one for P0)

| Option | Pros | Cons |
|--------|------|------|
| **A. Edge + shared secret** | Auditable, repeatable | Need `FLEETOS_ADMIN_SECRET` header |
| **B. Manual SQL runbook** | Fastest for first prod test | No audit in Edge logs |

**P0 recommendation:** Implement **B first** for manual QA, **A** before external pilots.

### 10.3 Request (Option A)

```http
POST /functions/v1/fleetos-admin-approve-tenant
X-FleetOS-Admin-Secret: <secret>
Content-Type: application/json

{
  "tenant_id": "t-uuid",
  "reviewer_note": "Approved — docs verified",
  "activate_auth_membership": true
}
```

### 10.4 Success response

```json
{
  "ok": true,
  "tenant": {
    "id": "t-uuid",
    "status": "active"
  },
  "membership": {
    "id": "m-uuid",
    "status": "active",
    "role": "owner"
  },
  "auth_core": {
    "recommended_membership_status": "active",
    "fleetos_tenant_id": "t-uuid",
    "fleetos_role": "owner"
  }
}
```

### 10.5 SQL runbook (Option B — P0 manual)

```sql
-- Verify
SELECT t.id, t.status, tm.id, tm.status, tm.codevertex_user_id
FROM tenants t
JOIN tenant_members tm ON tm.tenant_id = t.id
WHERE t.id = '<tenant_id>' AND tm.role = 'owner';

BEGIN;
UPDATE tenants SET status = 'active', updated_at = now() WHERE id = '<tenant_id>' AND status = 'pending_review';
UPDATE tenant_members SET status = 'active', is_active = true, updated_at = now()
WHERE tenant_id = '<tenant_id>' AND status = 'pending';
COMMIT;
```

Then update Auth Core app membership to `active` + `fleetos_tenant_id` (manual/API).

### 10.6 Preconditions

- Tenant `status = pending_review`
- At least one `tenant_members` with `status = pending` and `role IN ('owner','admin')`
- `profiles` row exists for owner (create if missing)

### 10.7 Post-approve

User refreshes or re-login → `fleetos-get-my-access`:

- If billing not active → `active_unsubscribed` → `/app`
- If billing active → `active` → `/dashboard`

Optional: user triggers `fleetos-sync-identity` once when `access_state` is `active` or `active_unsubscribed` (JWT `tenant_id` set) — sync is **not** required for Demo Area.

**P0 QA seed billing (manual):**

```sql
UPDATE tenants
SET billing_plan_code = 'fleetos_pro', subscription_status = 'active', updated_at = now()
WHERE id = '<tenant_id>';
```

---

## 11. Post-SSO redirect matrix (frontend)

### 11.1 Decision flow

```txt
/sso/callback
  → consumeSsoTicket (flat contract)
  → completeSsoLogin (session; NO fleetos-sync-identity unless access_state will be active)
  → POST fleetos-get-my-access
  → navigate(redirect_path from response OR local matrix)
```

### 11.2 Matrix

| `access_state` | Auth (typical) | `gates.tenant_approval` | `gates.tenant_billing` | Navigate to | sync-identity? |
|----------------|----------------|-------------------------|------------------------|-------------|----------------|
| `needs_onboarding` | any | `none` | `none` | `/onboarding/company` | No |
| `pending_review` | `pending` ok | `pending_review` | `none` | `/preview` | No |
| `active_unsubscribed` | `active` | `approved` | `none`/`past_due`/`canceled` | `/app` | Optional |
| `active` | `active` | `approved` | `active`/`trialing` | `/dashboard` | Yes (optional) |
| `suspended` | any | `suspended` | any | `/access-suspended` | No |
| `revoked` | any | `revoked` | any | `/access-revoked` | No |

### 11.3 Fallback if `get-my-access` fails

| Condition | Navigate |
|-----------|----------|
| consume OK, get-my-access 401 | `/login` (clear session) |
| consume OK, get-my-access 5xx | `/preview` with error banner + retry (if tenant pending) else `/app` |
| consume OK, legacy session only | Use session + empty tenants → `/onboarding/company` if `missing`, else gate |

### 11.4 `return_to` query param

**P0 rule:** Honor `return_to` only when `access_state === 'active'` **and** `capabilities.can_write_operational_data === true`. Otherwise use `redirect_path` from Edge.

### 11.5 Route guards (future implementation — §14)

| Route prefix | Allowed `access_state` | Capability gate |
|--------------|------------------------|-----------------|
| `/onboarding/company` | `needs_onboarding` | `can_submit_company` |
| `/preview`, `/preview/*` | `pending_review` | `can_access_preview_workspace` |
| `/demo`, `/demo/*`, `/pending-approval` | `pending_review` | **Legacy aliases** → `/preview/*` |
| `/app`, `/app/*` | `active_unsubscribed`, `active` | `can_access_app_shell` |
| `/app/vehicles`, `/app/drivers`, `/app/team` | `active_unsubscribed`, `active` | `can_write_setup_data` for mutations |
| `/app/billing`, `/billing/*` | `active_unsubscribed`, `active` | `can_start_checkout` / `can_manage_billing` |
| `/dashboard`, `/admin/*`, `/operations/*` | `active` only | `can_access_dashboard` |
| Operational mutations (bookings, dispatch, …) | `active` | `can_write_operational_data` |
| `/access-suspended`, `/access-revoked` | matching state | support/legal only |
| `/login?signed_out=1` | public | — |

**Disable** `AuthenticatedGateRoute` redirect to `/dashboard` when `access_state !== 'active'`.

### 11.6 Preview Workspace pages (P0.3 UI contract)

| Path | Purpose | Data tier |
|------|---------|-----------|
| `/preview` | Home — application summary + “explore FleetOS” | Real tenant metadata + **mock** KPIs |
| `/preview/status` | Application timeline (submitted → in review → approved) | Real `tenant.status`, `metadata.onboarding` |
| `/preview/dashboard` | **Simulated** admin dashboard | **Mock** charts/tables |
| `/preview/vehicles` | Sample fleet list / map | **Mock** vehicles |
| `/preview/drivers` | Sample driver roster | **Mock** drivers |
| `/preview/reports` | Sample reports | **Mock** |
| `/preview/tour` | Interactive product tour | Static / embedded media |
| `/preview/pricing` | Plans comparison (read-only) | Static; checkout disabled |
| `/preview/support` | Help + contact | Help Center link |

**Layout:** `PreviewLayout` — clear “Preview mode” banner, no create buttons that hit Supabase operational tables.

### 11.7 Setup app + billing pages (post-approval)

| Path | Purpose | Data tier | When |
|------|---------|-----------|------|
| `/app` | Setup home — checklist (company, fleet, team, subscribe) | **Real** | `active_unsubscribed` |
| `/app/settings` | Company profile, regional settings | **Real** | `active_unsubscribed`, `active` |
| `/app/vehicles`, `/app/drivers` | CRUD master data | **Real** setup | `active_unsubscribed`+ |
| `/app/team` | Invite members | **Real** (P1 runtime) | `active_unsubscribed`+ |
| `/app/billing` | Subscribe CTA → Billing Core | — | `active_unsubscribed` |
| `/dashboard` | Full ops | **Real** operational | `active` only |

**Driver / invited user on unsubscribed tenant:** `/app` with banner; `can_write_setup_data` per role; `can_write_operational_data: false`.

---

## 12. Company form payload (UI → API)

### 12.1 Form fields (P0)

| UI label | API field | Required |
|----------|-----------|----------|
| Company name | `company.name` | Yes |
| Legal name | `company.legal_name` | Yes |
| URL slug | `company.slug` | Yes (auto from name, editable) |
| Country | `company.country_code` | Yes |
| Tax ID / NIF | `company.tax_id` | Yes |
| — | `company.locale` | Hidden default |
| — | `company.currency` | Hidden default |
| — | `company.timezone` | Hidden default |

### 12.2 Slug generation

- Client suggests from `name`: lowercase, strip accents, hyphenate.
- Server validates uniqueness; return `slug_taken` with suggestion optional P1.

---

## 13. `fleetos-sync-identity` — P0 behavioral contract

| Scenario | Call? |
|----------|-------|
| First SSO, `needs_onboarding` | **No** |
| After submit, `pending_review` (Preview) | **No** |
| After approve, `active_unsubscribed` | **Optional** (profile parity; setup writes via app, not sync requirement) |
| After subscribe, `active` | **Yes** (idempotent upsert) |
| Returning `active` user | **Yes** |

Sync failure must **not** block UI if `get-my-access` already allows the current shell (warn only).

---

## 14. Session / TenantProvider / ProtectedRoute (future — implement later)

### 14.1 Session store (extend)

Persist last `get-my-access` payload (or subset):

| Field | Use |
|-------|-----|
| `accessState` | Router + guards |
| `gates` | Debug UI + fine gates |
| `capabilities` | Button visibility + API client write guard |
| `redirectPath` | SSO callback navigation |

### 14.2 TenantProvider

| Flag | Derivation |
|------|------------|
| `canAccessPreviewWorkspace` | `capabilities.can_access_preview_workspace` |
| `canAccessAppShell` | `capabilities.can_access_app_shell` |
| `canWriteSetupData` | `capabilities.can_write_setup_data` |
| `canWriteOperationalData` | `capabilities.can_write_operational_data` |
| `canAccessDashboard` | `capabilities.can_access_dashboard` |
| `workspaceMode` | `preview` \| `setup` \| `operational` from response `workspace_mode` or `access_state` |

**Remove** single boolean that equates “has tenants” with full access. DEV `MOCK_TENANTS` only when SSO consume URL unset.

### 14.3 ProtectedRoute (replace current behavior)

```txt
PreviewRoute (/preview/*):
  require isAuthenticated
  require accessState === 'pending_review'
  require can_access_preview_workspace

AppShellRoute (/app/*):
  require isAuthenticated
  require accessState in ('active_unsubscribed', 'active')
  require can_access_app_shell

SetupMutationGuard (vehicles, drivers, team under /app):
  require can_write_setup_data

OperationalRoute (/dashboard, /admin, /operations):
  require accessState === 'active'
  require can_access_dashboard

OperationalMutationGuard (bookings, dispatch, assignments, …):
  require can_write_operational_data
  else if active_unsubscribed → toast "Subscribe to run operations" + link /app/billing
  else if pending_review → toast "Awaiting approval" + link /preview

SuspendedRevokedRoute:
  only support + legal + sign-out
```

**Current anti-pattern (fix in P0.3):** `canAccessOperationalShell` false → redirect `/pending-approval` blocks Preview Workspace.

### 14.4 API client guard (frontend)

Two-tier write guard:

```txt
SETUP_TIER tables: tenants (settings), tenant_settings, vehicles, drivers, tenant_members (invite)
OPERATIONAL_TIER tables: booking_requests, assignments, payouts, …

if (mutation on OPERATIONAL_TIER && !can_write_operational_data) → abort
if (mutation on SETUP_TIER && !can_write_setup_data) → abort
if (pending_review && any operational table) → abort (use mock layer only)
```

### 14.5 Edge `fleetos-get-my-access` resolution (P0.2b-2 — implement later)

```txt
1. Load tenant_members + tenants (existing)
2. Map row → gates.tenant_approval (none | pending_review | approved | suspended | revoked)
3. Read tenants.billing_plan_code, tenants.subscription_status
4. Map → gates.tenant_billing (none | trialing | active | past_due | canceled)
5. Normalize JWT → gates.auth_membership
6. Derive access_state:
     none → needs_onboarding, redirect /onboarding/company
     pending_review → pending_review, redirect /preview, workspace_mode preview
     approved + billing ∉ {active,trialing} → active_unsubscribed, redirect /app, workspace_mode setup
     approved + billing ∈ {active,trialing} → active, redirect /dashboard, workspace_mode operational
     suspended / revoked → matching paths
7. Build capabilities from §8.4.2 (matrix)
8. Optional billing.checkout_url from env
```

**Do not** conflate `tenants.status = active` (approved company) with `access_state = active` (approved + subscribed).

### 14.6 Primary redirect source

`fleetos-get-my-access.redirect_path` — always prefer over Auth-only heuristics.

---

## 15. Implementation plan (phased)

### Phase P0.1 — Schema (1 migration)

- Extend `tenants.status` CHECK.
- Add `tenants.metadata` jsonb if missing.
- Document rollback.

### Phase P0.2 — Edge

- Implement `fleetos-get-my-access` (baseline — **extend** for `active_unsubscribed`, `gates`, capabilities §8).
- Implement `fleetos-submit-company` (`redirect_path: /preview` per P0.2b-2).
- Deploy secrets: `CODEVERTEX_JWKS_URI`, CORS defaults, optional `FLEETOS_ADMIN_SECRET`.
- Manual approve SQL runbook.

### Phase P0.2b-1 — Schema (done)

- `tenants.subscription_status` + index (`20260529140000_fleetos_billing_gate_p0_2b_1_schema.sql`).

### Phase P0.2b-2 — Edge

- Extend `fleetos-get-my-access` per §14.5: `active_unsubscribed`, `gates`, `workspace_mode`, setup vs operational capabilities.
- Update `fleetos-submit-company` `redirect_path` → `/preview`.

### Phase P0.3 — Frontend

- Routes: `/onboarding/company`, `/preview/*`, `/app/*`, `/dashboard`; legacy `/demo/*`, `/pending-approval` → `/preview`.
- `PreviewLayout` + mock dashboards per §11.6.
- Update `SsoCallback` (get-my-access, redirect matrix §11.2).
- Fix `ProtectedRoute` / `DemoRoute` / `AppShellRoute` per §14.3.
- Disable DEV `MOCK_TENANTS` when `VITE_AUTH_SSO_CONSUME_URL` set.
- API write guard per §14.4.

### Phase P0.4 — Auth Core coordination

- Document: on submit, Auth sets `pending` + `fleetos_tenant_id` + `fleetos_role`.
- Document: on approve, Auth sets `active`.
- Verify consume returns updated `fleetosMembershipStatus` + JWT claims.

### Phase P0.5 — QA

| Test | Expected |
|------|----------|
| New user SSO | `/onboarding/company` |
| Submit company | `pending_review`, `/preview`, `can_access_preview_workspace` |
| Preview navigation | Mock dashboards; zero operational Supabase writes |
| Double submit | 409 `pending_application_exists` |
| Duplicate slug | 409 `slug_taken` |
| SQL approve (no billing) | `active_unsubscribed`, `/app`, setup writes on, operational off |
| Setup CRUD | Real vehicle/driver under `/app` |
| SQL seed billing | `active`, `/dashboard`, operational writes on |
| Driver on unsubscribed tenant | `/app`, operational writes false |
| Network | consume → get-my-access → no sync in preview |

### Phase P1 (after P0)

- `fleetos-admin-approve-tenant` Edge.
- Billing Core webhooks → `subscription_status`.
- Auth Core webhook / admin API automation.
- `tenant_invites` create/accept (billing-gated).
- NIF validation, email notifications.

---

## 16. State transition diagram

```mermaid
stateDiagram-v2
  [*] --> needs_onboarding: SSO, no tenant_member
  needs_onboarding --> pending_review: submit-company
  pending_review --> active_unsubscribed: admin approve
  active_unsubscribed --> active: subscription active
  pending_review --> suspended: admin suspend
  active --> suspended: admin suspend
  active_unsubscribed --> suspended: admin suspend
  suspended --> active: reinstate + billing
  active --> revoked: admin revoke
  pending_review --> revoked: admin reject
```

---

## 17. Open decisions (resolve before implement)

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Auth membership `active` before company approved? | **No** — use `pending` after submit; Preview still allowed |
| 2 | Checkout in Preview before approval? | **No** — `can_start_checkout: false` |
| 3 | Setup writes without subscription? | **Yes** — vehicles, drivers, invites; not operations |
| 4 | `trialing` grants operational writes? | **Yes** |
| 5 | Preview uses real tenant fleet data? | **No** — mock/fixtures only |
| 6 | `fleetos-sync-identity` when? | Optional at `active_unsubscribed`; recommended at `active` |
| 7 | Admin approve in UI? | P0 SQL only |
| 8 | `/preview` vs `/demo`? | **`/preview` canonical**; `/demo` legacy alias |
| 9 | Operational tier table list? | Document in API guard when implementing P0.3 |

---

## 18. References

- `docs/architecture/FLEETOS_MEMBERSHIP_LIFECYCLE.md`
- `docs/architecture/FLEETOS_AUTH_IMPLEMENTATION_PLAN.md`
- `docs/architecture/FLEETOS_IDENTITY_AND_TENANCY_MODEL.md`
- `docs/integration/FLEETOS_PHASE6_EDGE_IDENTITY_REPORT.md`
- `supabase/migrations/20260524140000_phase3_tenant_layer.sql`
- `supabase/migrations/20260528150000_phase2a_tenant_members_foundation.sql`

---

## 19. Changelog

| Date | Change |
|------|--------|
| 2026-05-29 | Initial P0 contract (design only) |
| 2026-05-28 | **Demo Area + Billing Gate:** four-layer model; `active_unsubscribed`; `gates` + capabilities |
| 2026-05-28 | **P0.2b-2 clarifications:** Preview Workspace (`/preview`, mock) vs Setup app (`/app`, real master data) vs Operations (`/dashboard`); `can_write_setup_data` vs `can_write_operational_data`; billing gate blocks operations only; §3.1 data tiers; P0.2b-1 schema reference |
