# FleetOS Phase 7 — Remote validation report

**Date:** 2026-05-28  
**Migration:** `supabase/migrations/20260528140000_phase7_tenant_rls_foundation.sql`  
**Target project ref:** `kjiwzqysjassakvrojun` — **FleetOS** Supabase  
**Migration applied:** **Yes** (2026-05-28, SQL Editor, successful)  
**Applied report:** `docs/database/FLEETOS_PHASE7_APPLIED_REPORT.md`

---

## Verdict summary

| Item | Status |
|------|--------|
| **Pre-apply validation** | **PASS** — helpers, `tenant_id`, RLS pre-state, no `fleetos_p7_*` conflicts |
| **Post-apply validation** | **PASS** — `fleetos_p7_*` policies present; rules verified on FleetOS |
| **Invalid run (discarded)** | First SQL Editor run on **CodeVertex Core** — not FleetOS |
| **Legacy public-booking anon** | **ACCEPTED** — unchanged after apply |
| **`ready_to_apply`** | **n/a** (applied) |

### Requested fields (final)

| Field | Value |
|--------|--------|
| **missing_functions** | **none** |
| **missing_tables/columns** | **none** |
| **policy_conflicts** | **none** (pre-apply) |

---

## Post-apply validation (FleetOS)

### `fleetos_p7_*` policies — **PASS**

Policies exist on:

`tenants`, `tenant_settings`, `tenant_domains`, `tenant_users`, `companies`, `vehicles`, `drivers`, `owners`, `booking_requests`, `assignments`, `documents`, `expenses`, `incomes`, `payouts`, `rental_contracts`, `driver_contracts`.

| Check | Result |
|-------|--------|
| All `fleetos_p7_*` → `authenticated` | **PASS** |
| No `fleetos_p7_*` → `anon` | **PASS** |
| Operational `fleetos_p7_*` → SELECT only | **PASS** |
| `tenant_settings` → one UPDATE (`fleetos_p7_authenticated_update_tenant_settings`) | **PASS** |

**Total:** 17 `fleetos_p7_*` policies (16 SELECT + 1 UPDATE).

### RLS status — **PASS** (post-apply)

| Tables | RLS |
|--------|-----|
| `tenants`, `tenant_settings`, `tenant_domains`, `tenant_users` | **Enabled** |
| Operational tables in migration scope | **Enabled** (unchanged) |

### Legacy public booking — **PASS** (unchanged)

| Policy | Status after apply |
|--------|-------------------|
| `companies_public_booking_select` | **ACCEPTED** — unchanged |
| `booking_requests_public_insert` | **ACCEPTED** — unchanged |

---

## Pre-apply validation (archive)

| # | Section | Result |
|---|---------|--------|
| 1 | `1_functions` | **PASS** |
| 2 | `2_tenant_tables` | **PASS** |
| 3 | `3_tenant_id_columns` | **PASS** |
| 4 | `4_policy_conflicts` | **none** |
| 5 | `5_rls_status` | Tenant RLS **off**; operational RLS **on** |
| 6 | `6_anon_policies_fleetos_p7` | 0 rows (pre-apply) |
| 7 | `7_write_policies_fleetos_p7` | 0 rows (pre-apply) |
| 8 | `8_public_booking_policies` | **ACCEPTED** |

---

## Public booking — accepted legacy **anon** policies

| Policy | `USING` / `WITH CHECK` (FleetOS dev) |
|--------|--------------------------------------|
| `companies_public_booking_select` | `(booking_enabled = true) AND (booking_public_slug IS NOT NULL)` |
| `booking_requests_public_insert` | `status = pending`, `source = public_form`, assignment fields NULL, `company.booking_enabled = true` |

Not modified by Phase 7. Support `/book/:companySlug` (`src/app/App.tsx`).

---

## Invalid first run (wrong Supabase project)

Early `tenant_id` BLOCKERs were from **CodeVertex Core** Supabase, not FleetOS `kjiwzqysjassakvrojun`. Ignore that run.

---

## References

- `docs/database/FLEETOS_PHASE7_APPLIED_REPORT.md`
- `docs/database/_validate_phase7_rls_remote.sql`
- `docs/database/FLEETOS_PHASE7_RLS_AUDIT.md`
- `docs/database/FLEETOS_PHASE7_RLS_PLAN.md`
