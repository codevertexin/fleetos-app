# FleetOS — Phase 3 Schema Report

**Date:** 2026-05-26 (backfill paths aligned to remote schema validation)  
**Scope:** Supabase SQL migration only (no frontend, auth, billing, or RLS rewrite)  
**Migration file:** `supabase/migrations/20260524140000_phase3_tenant_layer.sql`  
**Environment:** development Supabase — no production data preservation requirements; backfill kept minimal and idempotent.

---

## 1. Current schema inspected

Source of truth: `docs/database/FLEETOS_SCHEMA_MIGRATION_V1.md` (inventory from existing Supabase project).

### Existing public tables (18)

| Table | RLS | Policies | Notes |
|-------|-----|----------|-------|
| `assignments` | yes | 2 | company-scoped |
| `booking_requests` | yes | 7 | triggers + validation |
| `booking_status_history` | yes | 1 | not in Phase 3 column scope |
| `companies` | yes | 2 | backfill source → tenant |
| `company_users` | yes | 2 | unchanged in Phase 3 |
| `documents` | yes | 5 | triggers |
| `driver_availability` | yes | 4 | not in Phase 3 column scope |
| `driver_contracts` | yes | 0 | + `tenant_id` |
| `driver_payouts` | yes | 0 | + `tenant_id` |
| `driver_time_off` | yes | 4 | not in Phase 3 column scope |
| `drivers` | yes | 5 | + `tenant_id` |
| `expenses` | yes | 4 | + `tenant_id` |
| `incomes` | yes | 4 | + `tenant_id` |
| `owners` | yes | 5 | + `tenant_id` |
| `payouts` | yes | 5 | + `tenant_id` |
| `profiles` | yes | 3 | + `codevertex_user_id` |
| `rental_contracts` | yes | 0 | + `tenant_id` |
| `vehicles` | yes | 5 | + `tenant_id` |

### Preserved (not modified)

- All existing tables, triggers, functions, and RLS policies
- Company-scoped helpers: `my_company_id()`, `is_company_staff()`, `assign_booking`, etc.

---

## 2. New tables created

| Table | Purpose |
|-------|---------|
| `tenants` | FleetOS customer workspace |
| `tenant_domains` | White-label / custom domains |
| `tenant_settings` | Portal and booking configuration per tenant |
| `tenant_users` | CodeVertex user ↔ tenant membership + role |

`tenants.legacy_company_id` stores the originating `companies.id` from backfill (no circular FK).

**RLS:** Not enabled on new tenant tables in Phase 3 (policies deferred to Phase 4 to avoid blocking service access).

---

## 3. Columns added

### `tenant_id` (nullable, FK → `tenants`)

- `companies`
- `vehicles`
- `drivers`
- `owners`
- `booking_requests`
- `assignments`
- `documents`
- `expenses`
- `incomes`
- `payouts`
- `driver_payouts`
- `rental_contracts`
- `driver_contracts`

All columns use `ON DELETE RESTRICT` to prevent accidental tenant removal with live data.

### `profiles`

| Column | Type | Index |
|--------|------|-------|
| `codevertex_user_id` | `uuid` nullable | unique partial where not null |

---

## 4. Backfill strategy

**Rule:** `existing company → initial tenant`

Validated against remote FleetOS schema (`docs/database/FLEETOS_PHASE3_REMOTE_SCHEMA_VALIDATION.md`).

### Step A — Create tenants

For each `companies` row with `tenant_id IS NULL`:

1. Insert into `tenants` (name from company, slug = slugified name + short id suffix).
2. Set `companies.tenant_id` to new tenant id.
3. Insert default `tenant_settings` row.

### Step B — Propagate `tenant_id`

1. **Direct (`company_id`):** `fleetos_backfill_tenant_from_company()` on tables that expose `company_id`:
   `companies`, `vehicles`, `owners`, `booking_requests`, `assignments`, `documents`, `expenses`, `incomes`, `payouts`, `rental_contracts`.
2. **Real schema paths (no legacy booking/payout probes):**
   - `drivers` ← `company_user_id` → `company_users.id` → `company_users.company_id` → `companies.tenant_id`
   - `assignments` ← `driver_id` → `drivers.tenant_id`
   - `assignments` ← `vehicle_id` → `vehicles.tenant_id`
   - `driver_payouts` ← `driver_id` → `drivers.tenant_id`
   - `driver_contracts` ← `driver_id` → `drivers.tenant_id`
   - `rental_contracts` ← `vehicle_id` → `vehicles.tenant_id` (only rows still null after direct pass)

**Not used (absent in real schema):** `drivers.company_id`, `assignments.booking_request_id` / `booking_id`, `driver_payouts.company_id` / `payout_id`, `driver_contracts.company_id`.

### Re-run safety

- Uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`
- Backfill only updates rows where `tenant_id IS NULL`
- Idempotent tenant creation loop skips companies already linked

### Post-migration validation (manual)

```sql
-- Orphan operational rows (should trend to zero after backfill)
SELECT 'vehicles' AS tbl, count(*) FROM vehicles WHERE tenant_id IS NULL
UNION ALL
SELECT 'drivers', count(*) FROM drivers WHERE tenant_id IS NULL
UNION ALL
SELECT 'booking_requests', count(*) FROM booking_requests WHERE tenant_id IS NULL;

-- Tenant / company parity
SELECT c.id, c.name, c.tenant_id, t.id, t.name
FROM companies c
LEFT JOIN tenants t ON t.id = c.tenant_id;
```

---

## 5. Indexes created

### Tenant layer

- `tenants(status)`, `tenants(legacy_company_id)`
- `tenant_domains(tenant_id)`, `tenant_domains(tenant_id, is_primary)`
- `tenant_users(tenant_id)`, `tenant_users(codevertex_user_id)`, `tenant_users(profile_id)`, `tenant_users(tenant_id, is_active)`

### Operational

- `*_tenant_id_idx` on all 12 tables receiving `tenant_id`
- `*_tenant_company_idx` on `(tenant_id, company_id)` where `company_id` exists

### Identity

- `profiles_codevertex_user_id_unique_idx` (partial unique)

---

## 6. Helper functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `current_codevertex_user_id()` | `uuid` | Canonical CodeVertex id from `profiles` for `auth.uid()` |
| `my_tenant_ids()` | `SETOF uuid` | Active tenant memberships |
| `is_tenant_user(p_tenant_id)` | `boolean` | Membership check |
| `is_tenant_admin(p_tenant_id)` | `boolean` | `tenant_admin` or `fleet_manager` |

### Migration utilities (kept for ops)

- `fleetos_slugify(text)`
- `fleetos_backfill_tenant_from_company(regclass)`

Granted to `authenticated` and `service_role`.

---

## 7. Explicitly NOT done (Phase 3)

| Item | Phase |
|------|-------|
| RLS policy rewrite | Phase 4 |
| `tenant_id NOT NULL` constraints | After validation |
| `company_users` → `tenant_users` data migration | Phase 4 + Auth SSO |
| `codevertex_user_id` backfill on profiles | Auth Core SSO |
| Drop `company_id` columns | Future |
| Frontend / Supabase client | Phase 4+ |
| Billing / Stripe | Out of scope |

---

## 8. How to apply

**Requires explicit approval** — do not run automatically.

```bash
# Supabase CLI (after approval)
supabase link   # if not linked to kjiwzqysjassakvrojun
supabase db push

# Or paste in Supabase SQL Editor (development project)
# File: supabase/migrations/20260524140000_phase3_tenant_layer.sql
```

### Readiness (development Supabase)

| Check | Status |
|-------|--------|
| `profiles`, `companies`, operational tables exist | **PASS** (remote validation) |
| Backfill paths match real FKs | **PASS** (patched 2026-05-26) |
| `current_codevertex_user_id()` uses `profiles.user_id` first | **PASS** |
| RLS / drops / service_role | **Not in scope** (unchanged) |

**Ready to apply** to the development Supabase project when you approve (`db push` or SQL Editor).

---

## 9. Next recommended phase (Phase 4)

1. Migrate `company_users` into `tenant_users` when `profiles.codevertex_user_id` is populated from Auth Core.
2. Add tenant-aware RLS policies **alongside** existing company policies (dual-read period).
3. Connect Supabase client in frontend; replace `mock-data.ts` progressively.
4. Enforce `tenant_id NOT NULL` on core operational tables after backfill validation.

---

## 10. Risk notes

| Risk | Mitigation |
|------|------------|
| Schema drift vs inventory doc | Backfill uses validated paths only (`company_user_id`, `driver_id`, `vehicle_id`) |
| Empty dev DB | Backfill is idempotent; orphan checks optional |
| `current_codevertex_user_id()` null until SSO | Expected until profiles linked |
| New tables without RLS | Enable + policies in Phase 4 before exposing to anon client |
