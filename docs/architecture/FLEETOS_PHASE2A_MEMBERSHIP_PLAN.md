# FleetOS — Phase 2A Membership Plan

**Status:** Draft (planning only)  
**Date:** 2026-05-28  
**Scope:** Tenant & membership foundation — **documentation and future DDL design**  
**Out of scope for this document:** SQL migrations, application code, Edge Functions, RLS changes

---

## Related documents

| Document | Role |
|----------|------|
| [DECISION_001_TENANT_MEMBERS_NAMING.md](../decision/DECISION_001_TENANT_MEMBERS_NAMING.md) | Canonical naming; 2A compat / 2B rename / 2C drop |
| [FLEETOS_IDENTITY_AND_TENANCY_MODEL.md](./FLEETOS_IDENTITY_AND_TENANCY_MODEL.md) | Target tenancy model |
| [FLEETOS_RBAC_MODEL.md](./FLEETOS_RBAC_MODEL.md) | Canonical roles & permissions |
| [FLEETOS_MEMBERSHIP_LIFECYCLE.md](./FLEETOS_MEMBERSHIP_LIFECYCLE.md) | Member & invite state machines |
| [FLEETOS_AUTH_IMPLEMENTATION_PLAN.md](./FLEETOS_AUTH_IMPLEMENTATION_PLAN.md) | Auth / invite / onboarding flows |
| [FLEETOS_ALIGNMENT_AUDIT.md](./FLEETOS_ALIGNMENT_AUDIT.md) | Platform alignment tracker |

---

## Executive decision (Phase 2A)

```txt
Phase 2A is ADDITIVE and COMPATIBLE.
No destructive rename of tenant_users in Phase 2A.
```

### Explicit rules

| Rule | Phase |
|------|-------|
| **`tenant_users` continues to exist** | 2A (and remains the write path for Edge until 2B) |
| **`tenant_members` is introduced in parallel** (or via compat view/trigger layer) | 2A |
| **Rename / DROP of `tenant_users`** | **Phase 2B+ only** (2C removes legacy naming) |
| **`tenant_customers`** | **Not in the initial 2A migration** — deferred to **Phase 2A+** or **2B** (see §12) |

This plan implements [DECISION_001](../decision/DECISION_001_TENANT_MEMBERS_NAMING.md) Phase 2A: temporary coexistence of `tenant_users` and `tenant_members` while architectural stabilization continues.

---

## 1. Current state (audit summary)

Audit performed 2026-05-28 against versioned migrations, Edge functions, frontend, and architecture docs. **No schema changes were made.**

### 1.1 Tables that exist today

**Tenant core (Phase 3 migration)**

| Table | Notes |
|-------|--------|
| `tenants` | Workspace; `status` ∈ `active`, `inactive`, `suspended` |
| `tenant_domains` | Custom domains |
| `tenant_settings` | Portal/booking flags per tenant |
| `tenant_users` | Operational membership: `tenant_id`, `codevertex_user_id`, `profile_id`, `role`, `is_active` |

**Identity & legacy company model**

| Table | Notes |
|-------|--------|
| `profiles` | `codevertex_user_id` (nullable, partial unique) |
| `companies` | `tenant_id` nullable (1:1 backfill company → tenant) |
| `company_users` | `company_id`, `profile_id` — staff link **without** direct `tenant_id` |

**Operational tables with nullable `tenant_id`**

`vehicles`, `drivers`, `owners`, `booking_requests`, `assignments`, `documents`, `expenses`, `incomes`, `payouts`, `driver_payouts`, `rental_contracts`, `driver_contracts`

**SQL helpers (Phase 3) — all read `tenant_users`**

- `current_codevertex_user_id()`
- `my_tenant_ids()`
- `is_tenant_user(uuid)`
- `is_tenant_admin(uuid)` — roles `tenant_admin` \| `fleet_manager`

**RLS (Phase 7) — depends indirectly on `tenant_users`**

- Direct policy on `tenant_users`: `fleetos_p7_authenticated_select_own_tenant_users`
- 12 operational SELECT policies + `tenant_settings` UPDATE via `my_tenant_ids()` / `is_tenant_admin()`
- Legacy company-scoped policies unchanged (dual-path period)

**Edge (Phase 6) — writes `tenant_users` only**

- `fleetos-sync-identity` — upsert on `(tenant_id, codevertex_user_id)`
- `fleetos-list-tenants` — SELECT active memberships

**Unsafe anon RPCs** — removed in Phase 5b; sync is Edge + `service_role` only.

### 1.2 Tables that do **not** exist

| Planned table | Status |
|---------------|--------|
| `tenant_members` | Documentation / decision only |
| `tenant_invites` | Not created |
| `tenant_customers` | Not created |
| `customer_leads` / `fleetos_leads` | Not created |

### 1.3 Code references to `tenant_users`

| Location | Usage |
|----------|--------|
| `supabase/migrations/20260524140000_phase3_tenant_layer.sql` | DDL, indexes, helpers |
| `supabase/migrations/20260528140000_phase7_tenant_rls_foundation.sql` | RLS |
| `supabase/functions/fleetos-sync-identity/index.ts` | Upsert + list |
| `supabase/functions/fleetos-list-tenants/index.ts` | SELECT |
| `src/types/session.ts` | Comment only; tenants from Edge |

Frontend does **not** query `tenant_users` via PostgREST; `TenantProvider` uses Edge + mock fallback.

### 1.4 Roles today vs target

**DB `tenant_users_role_check` (legacy operational)**

```txt
tenant_admin | fleet_manager | operations | dispatcher | finance | driver | owner | viewer
```

**Target canonical roles** ([FLEETOS_RBAC_MODEL.md](./FLEETOS_RBAC_MODEL.md))

```txt
owner | admin | manager | dispatcher | driver | mechanic | viewer
(+ customer via tenant_customers — separate table)
```

**Additional drift**

- Frontend mock: `fleet_admin`, UI labels (Fleet Admin, Accountant, …)
- Edge `ALLOWED_ROLES` matches DB CHECK; unknown → `viewer`
- No server-side RBAC matrix beyond `is_tenant_admin`

### 1.5 Membership status today

| Layer | Model |
|-------|--------|
| **Auth Core app membership** (FLEETOS) | `active` \| `pending` \| `suspended` \| `revoked` \| `missing` \| `none` — session gate only |
| **`tenant_users`** | `is_active` boolean only — no `invited` / `pending` / `removed` column |
| **`tenants`** | `active` \| `inactive` \| `suspended` — not full lifecycle from membership doc |

### 1.6 Data volume (dev, reported)

- `tenant_users` rows: **0** (favorable window for additive schema)
- `company_users` → `tenant_users` backfill: **not done**

### 1.7 Tenant access validation today

1. Auth Core SSO → `fleetosMembershipStatus` (app-level gate)
2. Edge JWT → `membership_status === active` before sync write
3. RLS → `my_tenant_ids()` from `tenant_users`
4. Frontend → tenant picker/storage; **no route-level role checks**

---

## 2. Phase 2A goals

1. Introduce **`tenant_members`** as the **canonical** operational membership store (design + future DDL).
2. Keep **`tenant_users`** as the **compatibility surface** for Edge, existing helpers, and Phase 7 RLS **unchanged in 2A implementation work on those layers** (this plan only designs compat; applying compat triggers/views is a later migration step).
3. Add **`membership status`** beyond `is_active`.
4. Add **minimal `tenant_invites`** for staff onboarding (schema only in first migration wave; flows can follow).
5. Define **role mapping** legacy → canonical without breaking CHECK constraints until 2B.
6. Plan **backfill** from `company_users` without blocking SSO/Edge paths.
7. **Defer `tenant_customers`** to a follow-up phase (see §12).

---

## 3. Target model: `tenant_members`

Canonical internal operational relationship per [FLEETOS_IDENTITY_AND_TENANCY_MODEL.md](./FLEETOS_IDENTITY_AND_TENANCY_MODEL.md) and [DECISION_001](../decision/DECISION_001_TENANT_MEMBERS_NAMING.md).

### 3.1 Semantics

```txt
Auth Core          → global identity (codevertex_user_id)
tenant_members     → operational belonging to a tenant
tenant_customers   → commercial relationship (OUT OF initial 2A migration)
```

A user may have:

- zero, one, or many `tenant_members` rows (multi-tenant)
- different **canonical roles** per tenant
- membership **status** independent of Auth Core app membership (but coordinated at SSO/sync time)

### 3.2 Logical columns (target)

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `tenant_id` | FK → `tenants` |
| `codevertex_user_id` | FK logical → Auth Core `sub` |
| `profile_id` | FK → `profiles` (nullable, denormalized convenience) |
| `role` | **Canonical** role string (see §5) |
| `legacy_role` | Optional: last mapped legacy value for audit during transition |
| `status` | Membership lifecycle (see §6) |
| `permissions` | `jsonb` nullable — future fine-grained overrides |
| `invited_by_member_id` | Nullable FK → `tenant_members` |
| `invite_id` | Nullable FK → `tenant_invites` |
| `is_active` | **Deprecated in 2B** — derived from `status = 'active'` during compat |
| `created_at`, `updated_at` | Audit |
| `removed_at` | Soft-remove timestamp when `status = 'removed'` |

**Uniqueness:** `UNIQUE (tenant_id, codevertex_user_id)` where `status NOT IN ('removed')` — use partial unique index.

---

## 4. Compatibility with `tenant_users`

### 4.1 Why both exist in 2A

| Consumer | Today | 2A strategy |
|----------|-------|-------------|
| Edge sync/list | Writes/reads `tenant_users` | **No Edge changes in 2A** — keep writing `tenant_users`; compat layer mirrors to `tenant_members` when migrations run |
| `my_tenant_ids()` etc. | SQL on `tenant_users` | **No RLS/helper changes in 2A** — later migration may reimplement helpers to read `tenant_members` with fallback, or use views |
| Phase 7 policies | Reference helpers + `tenant_users` table | Unchanged until explicit 2A.x RLS migration (out of initial doc scope; designed in §9) |

### 4.2 Compat layer options (choose one at migration time)

**Option A — Dual write via trigger (recommended for integrity)**

```txt
INSERT/UPDATE on tenant_users → sync row to tenant_members (mapped role + status)
```

- Pros: Edge unchanged; single write path
- Cons: Must keep mapping consistent; triggers must be idempotent

**Option B — `tenant_members` as source, `tenant_users` as compat view**

```txt
tenant_users VIEW or INSTEAD OF triggers on view
```

- Pros: Clear canonical direction
- Cons: **Breaks Edge** if Edge expects writable base table — **not acceptable without Edge change** → **reject for 2A**

**Option C — Application/Edge dual write**

- Pros: Explicit
- Cons: Violates “no Edge changes in 2A” — **reject**

**Phase 2A recommendation:** **Option A** when migrations are implemented: `tenant_users` remains the physical table Edge writes; trigger maintains `tenant_members`. In parallel, new features (invites, admin UI reads) read/write `tenant_members` where safe.

### 4.3 Read path during transition

```txt
New code (2A+)     → prefer tenant_members
Edge + RLS (2A)    → tenant_users + helpers (unchanged)
Audit/compare      → periodic consistency check job (optional SQL)
```

---

## 5. Role mapping: legacy → canonical

### 5.1 Mapping table (operational)

| Legacy (`tenant_users.role`) | Canonical (`tenant_members.role`) | Notes |
|------------------------------|-------------------------------------|--------|
| `tenant_admin` | `admin` | Was highest admin; billing may differ from `owner` in RBAC matrix |
| `fleet_manager` | `manager` | Operational manager |
| `operations` | `manager` | Collapse to manager unless split needed later |
| `dispatcher` | `dispatcher` | 1:1 |
| `finance` | `manager` | Or future `finance` role if added to canonical set — **default: manager** with `permissions` jsonb flag |
| `driver` | `driver` | 1:1 |
| `owner` | `owner` | 1:1 (tenant economic owner — not vehicle owner) |
| `viewer` | `viewer` | 1:1 |
| *(unknown / new)* | `viewer` | Same as Edge `normalizeRole` today |

**New canonical role not in legacy CHECK**

| Canonical | Legacy source |
|-----------|---------------|
| `mechanic` | No legacy value — assign via invites/admin only after CHECK expanded in 2B |

### 5.2 Suggested reference table (future DDL)

```sql
-- Illustrative — NOT to be applied until migration phase
CREATE TABLE public.fleetos_role_map (
  legacy_role text PRIMARY KEY,
  canonical_role text NOT NULL,
  notes text
);
```

### 5.3 CHECK constraint strategy

| Phase | `tenant_users.role` CHECK | `tenant_members.role` CHECK |
|-------|---------------------------|-----------------------------|
| **2A** | **Keep existing 8 legacy values** | Allow **canonical** set (`owner`, `admin`, `manager`, `dispatcher`, `driver`, `mechanic`, `viewer`) |
| **2B** | Widen or replace CHECK; migrate stored values | Single canonical CHECK |
| **2C** | Drop `tenant_users` | Members only |

Auth Core JWT / Edge may continue emitting **legacy** role strings in 2A; trigger maps to canonical on mirror.

### 5.4 `is_tenant_admin()` mapping (future, not in 2A RLS change)

Today: `tenant_admin` \| `fleet_manager`  
Target: `owner` \| `admin` (and optionally `manager` for settings — product decision in 2B)

---

## 6. Membership status model

Aligned with [FLEETOS_MEMBERSHIP_LIFECYCLE.md](./FLEETOS_MEMBERSHIP_LIFECYCLE.md) §5.

### 6.1 `tenant_members.status`

| Status | Operational access | Typical source |
|--------|-------------------|----------------|
| `invited` | No | Invite created, user not yet linked |
| `pending` | Limited / gate only | Approval required, SSO linked |
| `active` | Yes (per RBAC) | Approved member, sync active |
| `suspended` | No | Admin / billing / security |
| `removed` | No | Offboarding; row retained for audit |

### 6.2 Mapping from `tenant_users.is_active` (compat)

| `is_active` | Edge sync | Suggested `tenant_members.status` |
|-------------|-----------|-----------------------------------|
| `true` | active membership written | `active` |
| `false` | row exists but inactive | `suspended` or `removed` (product rule: default **`suspended`** if row kept) |

### 6.3 vs Auth Core app membership

```txt
Auth Core FLEETOS membership  →  gate to enter app (session)
tenant_members.status           →  gate to operate inside a tenant
tenants.status                  →  gate for whole workspace
```

All three must be satisfied for full operational use. Phase 2A schema supports this; full enforcement is later (2B+).

---

## 7. Proposed future DDL (illustrative — not applied)

> **This section is design-only.** No migration files are created by this document.

### 7.1 `tenant_members`

```sql
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  codevertex_user_id uuid NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  role text NOT NULL,
  legacy_role text,
  status text NOT NULL DEFAULT 'active',
  permissions jsonb,
  invited_by_member_id uuid REFERENCES public.tenant_members(id) ON DELETE SET NULL,
  invite_id uuid, -- FK added after tenant_invites exists
  is_active boolean NOT NULL DEFAULT true, -- compat mirror; drop in 2C
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  CONSTRAINT tenant_members_role_check CHECK (
    role IN ('owner', 'admin', 'manager', 'dispatcher', 'driver', 'mechanic', 'viewer')
  ),
  CONSTRAINT tenant_members_status_check CHECK (
    status IN ('invited', 'pending', 'active', 'suspended', 'removed')
  )
);

CREATE UNIQUE INDEX tenant_members_tenant_cv_user_active_uidx
  ON public.tenant_members (tenant_id, codevertex_user_id)
  WHERE status <> 'removed';

CREATE INDEX tenant_members_tenant_id_idx ON public.tenant_members (tenant_id);
CREATE INDEX tenant_members_codevertex_user_id_idx ON public.tenant_members (codevertex_user_id);
CREATE INDEX tenant_members_status_idx ON public.tenant_members (tenant_id, status);
```

### 7.2 `tenant_invites` (minimal)

```sql
CREATE TABLE public.tenant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  intended_role text NOT NULL, -- canonical role
  invite_token_hash text NOT NULL, -- store hash only, never raw token in DB
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  invited_by_member_id uuid REFERENCES public.tenant_members(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  accepted_by_codevertex_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_invites_status_check CHECK (
    status IN ('pending', 'accepted', 'expired', 'cancelled', 'revoked')
  )
);

CREATE INDEX tenant_invites_tenant_email_idx ON public.tenant_invites (tenant_id, lower(email));
CREATE INDEX tenant_invites_token_hash_idx ON public.tenant_invites (invite_token_hash)
  WHERE status = 'pending';
```

**Minimal scope:** CRUD via service role / future Edge; **no** anon grants; **no** public token resolution without Auth Core session.

### 7.3 Compat trigger (sketch)

```sql
-- AFTER INSERT OR UPDATE ON tenant_users
-- UPSERT tenant_members SET
--   role = map_legacy_to_canonical(NEW.role),
--   legacy_role = NEW.role,
--   status = CASE WHEN NEW.is_active THEN 'active' ELSE 'suspended' END,
--   is_active = NEW.is_active,
--   profile_id = NEW.profile_id,
--   updated_at = now()
-- ON CONFLICT (tenant_id, codevertex_user_id) WHERE status <> 'removed'
```

### 7.4 RLS on new tables (deferred implementation)

Phase 2A migration wave should **enable RLS** on `tenant_members` and `tenant_invites` with **deny-by-default** and **no broad authenticated writes** until policies are designed in a dedicated 2A.x step. This document does **not** authorize changing existing Phase 7 policies.

---

## 8. `tenant_invites` minimum (Phase 2A)

### 8.1 In scope (schema + rules)

- Table per §7.2
- States: `pending`, `accepted`, `expired`, `cancelled`, `revoked`
- Unique pending invite per `(tenant_id, email)` (optional partial unique index)
- Token: single-use, hashed at rest, expiry enforced in application/Edge later

### 8.2 Out of scope for initial 2A migration

- Email delivery integration
- Public invite landing page
- Automatic accept on SSO (handler work — 2A.8+ app/Edge)
- Customer invites (different table/flow — `tenant_customers` phase)

### 8.3 Acceptance flow (target, implementation later)

```txt
admin creates invite (service_role API)
→ email (external)
→ user Auth Core login/register
→ SSO callback
→ FleetOS resolves invite by email + token
→ tenant_members row: status active (or pending if approval_required)
→ tenant_invites.status = accepted
```

---

## 9. Backfill: `company_users` → `tenant_members`

### 9.1 Problem

Staff historically linked via `company_users.profile_id` → `companies.tenant_id`. This path was **never** migrated to `tenant_users` (0 rows).

### 9.2 Preconditions

1. `profiles.codevertex_user_id` populated (SSO / Edge sync), **or** explicit mapping table for legacy profiles
2. `companies.tenant_id` not null for target companies
3. `tenant_members` table exists

### 9.3 Mapping rules

| Source | Target |
|--------|--------|
| `company_users.company_id` | → `companies.tenant_id` → `tenant_members.tenant_id` |
| `company_users.profile_id` | → `profiles.codevertex_user_id` |
| `company_users.role` (if column exists) | Map via §5; else default `viewer` |
| Status | `active` if profile has `codevertex_user_id`; else **skip** or `pending` |

### 9.4 Execution strategy

| Property | Approach |
|----------|----------|
| **Idempotent** | `INSERT ... ON CONFLICT (tenant_id, codevertex_user_id) DO UPDATE` |
| **Batch** | Manual SQL script in SQL Editor / one-off migration file in 2A.5 |
| **Not on login hot path** | Avoid blocking SSO |
| **Mirror** | After insert into `tenant_members`, insert/update `tenant_users` for Edge compat (same mapping inverted to legacy role) |
| **Audit** | Log counts: companies processed, members created, skipped (no cv id) |

### 9.5 Skip / manual review

- `profiles.codevertex_user_id IS NULL` — queue for post-SSO linking
- Duplicate roles across companies under same tenant — keep highest privilege per mapping table (define in script comments)
- Drivers linked only via `company_user_id` on `drivers` — **not** the same as `company_users`; do not conflate

---

## 10. Edge compatibility strategy (no changes in 2A)

| Principle | Detail |
|-----------|--------|
| **No Edge file edits** in Phase 2A | `fleetos-sync-identity` and `fleetos-list-tenants` keep using `tenant_users` |
| **Write path** | Edge upsert → `tenant_users` → trigger → `tenant_members` |
| **Read path** | Edge list continues SELECT on `tenant_users`; optional later: list reads members view |
| **JWT roles** | Continue accepting legacy role strings; trigger maps to canonical on mirror |
| **New members without sync** | Only via backfill or future invite handler — Edge still won't create arbitrary tenants |

**Phase 2B:** Point Edge to `tenant_members` (or unified view) after helpers and RLS updated.

---

## 11. RLS compatibility strategy (no changes in 2A)

| Layer | 2A | 2B+ |
|-------|-----|------|
| Existing `fleetos_p7_*` policies | **Frozen** | Revisit to use `tenant_members` in helpers |
| `my_tenant_ids()` | Keep reading `tenant_users` | Implement `my_tenant_member_ids()` or read members with `status = 'active'` |
| `is_tenant_admin()` | Legacy roles | Canonical `owner` \| `admin` |
| New tables `tenant_members`, `tenant_invites` | Enable RLS; **service_role / Edge only** writes initially | Fine-grained policies per RBAC matrix |
| `tenant_users` policy | Keep `select own rows` | Deprecate when table dropped |

**Dual-path period continues:** company-scoped legacy policies + tenant policies until company model retired.

---

## 12. `tenant_customers` — explicitly deferred

Per product architecture ([FLEETOS_CUSTOMER_MODEL.md](./FLEETOS_CUSTOMER_MODEL.md)):

```txt
tenant_customers is NOT part of the initial Phase 2A migration.
```

| Item | Placement |
|------|-----------|
| `tenant_customers` table | **Phase 2A+** or **2B** (separate migration after members stable) |
| Public booking → customer link | Requires Auth Core + customer flow — not 2A |
| Booking denormalized `customerName` / mock `customerId` | Remains until customer model migration |

**Rationale:** 2A focuses on **internal operational membership**; mixing customer commercial relationships increases booking/payment coupling and RBAC surface.

---

## 13. Risks

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Trigger drift between `tenant_users` and `tenant_members` | High | Idempotent upsert; consistency SQL check in validation script |
| R2 | Role mapping ambiguity (`finance`, `operations`) | Medium | Document defaults; use `permissions` jsonb until roles stabilized |
| R3 | Dual membership gates (Auth Core vs `tenant_members.status`) | Medium | Clear matrix in app layer; integration tests |
| R4 | Backfill without `codevertex_user_id` | Medium | Skip + report; link on first SSO |
| R5 | Premature RLS on new tables blocking Edge | High | service_role writes only; no anon |
| R6 | Accidental 2A rename breaking Edge/RLS | High | **This plan forbids rename in 2A** — review checklist before any migration |
| R7 | `owner` role confusion (member vs vehicle owner) | Low | Naming in UI/docs |
| R8 | Invites security (token leakage) | High | Hash tokens; short TTL; no anon RPC |

---

## 14. Rollback

### 14.1 Before production data in `tenant_members`

1. Drop triggers from `tenant_users` → members mirror
2. Drop `tenant_invites` (if empty)
3. Drop `tenant_members`
4. No change to Edge/RLS — system identical to pre-2A

### 14.2 After backfill / production members data

1. Stop triggers
2. Export `tenant_members` archive if needed
3. Drop new tables **only if** `tenant_users` remained source of truth throughout
4. Do **not** drop `tenant_users` in rollback — it is the legacy safety net until 2C

### 14.3 Rollback forbidden in 2A

- Dropping or renaming `tenant_users`
- Modifying Phase 7 policy names/definitions without a dedicated rollback migration

---

## 15. Phased implementation steps

Each step is a **separate PR / migration apply** after this plan is approved. **This document does not execute any step.**

| Step | ID | Deliverable | Touches Edge? | Touches RLS? |
|------|-----|-------------|---------------|--------------|
| 1 | **2A.1** | This plan approved | No | No |
| 2 | **2A.2** | Migration: `tenant_members` + indexes + status/role CHECK | No | New table RLS only (deny default) |
| 3 | **2A.3** | Migration: `fleetos_role_map` seed data | No | No |
| 4 | **2A.4** | Migration: `tenant_invites` minimal | No | New table RLS only |
| 5 | **2A.5** | Migration: compat trigger `tenant_users` → `tenant_members` | No* | No |
| 6 | **2A.6** | One-off backfill script `company_users` → members (+ mirror users) | No | No |
| 7 | **2A.7** | Validation SQL script (counts, drift detection) | No | No |
| 8 | **2A.8** | App: read-only members list in Settings (replaces mock) | No | Uses existing auth |
| 9 | **2A.9** | App/Edge: invite create/accept (minimal) | **Yes (later)** | **Yes (later)** |
| 10 | **2B** | Helpers + RLS read `tenant_members`; Edge switch; role CHECK migration | Yes | Yes |
| 11 | **2C** | Drop `tenant_users` | Yes | Yes |

\*Step 2A.5 does not edit Edge **source files**; Edge behavior changes only via DB trigger side effect.

### 15.1 Suggested validation (post-migration, future)

```sql
-- Illustrative checks
SELECT COUNT(*) AS users_only FROM tenant_users tu
  WHERE NOT EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = tu.tenant_id
      AND tm.codevertex_user_id = tu.codevertex_user_id
  );

SELECT COUNT(*) AS members_only FROM tenant_members tm
  WHERE tm.status <> 'removed'
    AND NOT EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tm.tenant_id
        AND tu.codevertex_user_id = tm.codevertex_user_id
    );
```

---

## 16. Approval checklist (before first 2A migration)

- [ ] Product accepts role collapse rules (`finance` → `manager`, etc.)
- [ ] `tenant_customers` deferral confirmed (2A+ / 2B)
- [ ] Edge freeze acknowledged for 2A.2–2A.7
- [ ] RLS freeze acknowledged for existing `fleetos_p7_*`
- [ ] Backfill runbook reviewed on dev (`kjiwzqysjassakvrojun`)
- [ ] Rollback §14 agreed

---

## 17. Summary

| Question | Answer |
|----------|--------|
| Does `tenant_users` stay in 2A? | **Yes** |
| Is `tenant_members` introduced in 2A? | **Yes**, in parallel via compat layer (trigger mirror recommended) |
| When is rename/drop? | **Phase 2B+** (rename), **2C** (drop legacy) |
| Are `tenant_customers` in initial 2A migration? | **No** — 2A+ or 2B |
| Code/Edge/RLS changes in this PR? | **No** — planning document only |

---

*End of Phase 2A Membership Plan*
