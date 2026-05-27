# FleetOS Phase 7 — Applied report

**Date:** 2026-05-28  
**Target project:** `kjiwzqysjassakvrojun` (FleetOS development Supabase)  
**Migration file:** `supabase/migrations/20260528140000_phase7_tenant_rls_foundation.sql`  
**Apply method:** Supabase SQL Editor (manual, successful)  
**Git push:** Not performed (awaiting approval)

---

## Summary

| Item | Status |
|------|--------|
| **Phase 7 apply** | **APPLIED SUCCESSFULLY** |
| **Post-apply validation** | **PASS** (user-confirmed on FleetOS project) |
| **Legacy public-booking anon policies** | **Unchanged** and **ACCEPTED** |
| **Company-scoped legacy policies** | **Unchanged** (dual-path period continues) |

---

## What was applied

1. **RLS enabled** on tenant core tables: `tenants`, `tenant_settings`, `tenant_domains`, `tenant_users`.
2. **17 new policies** prefixed `fleetos_p7_*`, all **`TO authenticated`**:
   - **16× SELECT** (tenant layer + 12 operational tables).
   - **1× UPDATE** on `tenant_settings` for `is_tenant_admin(tenant_id)`.
3. **No** `DROP` of existing company-scoped or public-booking policies.
4. **No** `tenant_id NOT NULL` constraints.
5. **No** new `anon` policies.

---

## Policy list summary (post-apply)

### Tenant layer (4 tables, 5 policies)

| Table | Policy | Command |
|-------|--------|---------|
| `tenants` | `fleetos_p7_authenticated_select_tenants` | SELECT |
| `tenant_settings` | `fleetos_p7_authenticated_select_tenant_settings` | SELECT |
| `tenant_settings` | `fleetos_p7_authenticated_update_tenant_settings` | UPDATE |
| `tenant_domains` | `fleetos_p7_authenticated_select_tenant_domains` | SELECT |
| `tenant_users` | `fleetos_p7_authenticated_select_own_tenant_users` | SELECT |

### Operational tables (12 tables, 12 policies — SELECT only)

| Table | Policy |
|-------|--------|
| `companies` | `fleetos_p7_authenticated_select_companies` |
| `vehicles` | `fleetos_p7_authenticated_select_vehicles` |
| `drivers` | `fleetos_p7_authenticated_select_drivers` |
| `owners` | `fleetos_p7_authenticated_select_owners` |
| `booking_requests` | `fleetos_p7_authenticated_select_booking_requests` |
| `assignments` | `fleetos_p7_authenticated_select_assignments` |
| `documents` | `fleetos_p7_authenticated_select_documents` |
| `expenses` | `fleetos_p7_authenticated_select_expenses` |
| `incomes` | `fleetos_p7_authenticated_select_incomes` |
| `payouts` | `fleetos_p7_authenticated_select_payouts` |
| `rental_contracts` | `fleetos_p7_authenticated_select_rental_contracts` |
| `driver_contracts` | `fleetos_p7_authenticated_select_driver_contracts` |

### Post-apply policy rules (verified)

- All `fleetos_p7_*` policies: **`TO authenticated`** only.
- **No** `fleetos_p7_*` policies: **`TO anon`**.
- Operational `fleetos_p7_*`: **SELECT** only.
- Only write in Phase 7 set: **`tenant_settings` UPDATE** for tenant admins / fleet managers (`is_tenant_admin`).

---

## RLS status (post-apply)

| Tables | RLS |
|--------|-----|
| `tenants`, `tenant_settings`, `tenant_domains`, `tenant_users` | **Enabled** (new in Phase 7) |
| Operational tables in scope | **Enabled** (unchanged from pre-Phase 7) |

Pre-apply: tenant tables had RLS **off**; operational tables had RLS **on**. Post-apply matches Phase 7 design.

---

## Accepted legacy anon policies (unchanged)

Public booking portal `/book/:companySlug` — **not** modified by Phase 7:

| Policy | Table | Command | Role | Status |
|--------|-------|---------|------|--------|
| `companies_public_booking_select` | `companies` | SELECT | `anon` | **ACCEPTED** — `(booking_enabled = true) AND (booking_public_slug IS NOT NULL)` |
| `booking_requests_public_insert` | `booking_requests` | INSERT | `anon` | **ACCEPTED** — `pending` / `public_form` / no assignments / `company.booking_enabled = true` |

See `docs/database/FLEETOS_PHASE7_RLS_REMOTE_VALIDATION.md` §Public booking for full predicate text.

---

## Prerequisites used

- Phase 3 helpers: `current_codevertex_user_id()`, `my_tenant_ids()`, `is_tenant_user(uuid)`, `is_tenant_admin(uuid)`.
- Phase 3 `tenant_id` columns on operational tables.
- Phase 6 Edge identity sync (for meaningful `tenant_users` / `my_tenant_ids()` at runtime — recommended before app-level RLS testing).

---

## Next phase recommendation

| Priority | Phase | Scope |
|----------|-------|--------|
| **1** | **Phase 7b — App + Supabase client** | Wire authenticated PostgREST reads using Supabase Auth (or bridge) so `current_codevertex_user_id()` resolves; replace operational **mock data** incrementally with tenant-scoped queries. |
| **2** | **Phase 8 — Role-specific writes** | Add narrow `INSERT`/`UPDATE`/`DELETE` policies per role (admin, dispatcher, finance, driver) on operational tables — do not broaden beyond business need. |
| **3** | **Phase 8b — Remaining tables** | Extend tenant read policies to `driver_payouts`, `booking_status_history`, etc., if exposed to the app. |
| **4** | **Later** | `tenant_id NOT NULL` on core tables after backfill audit; gradual retirement of company-only policies when tenant path is sole source of truth. |

**Out of scope (unchanged):** Billing, Stripe, merge to `main` without explicit approval.

---

## Related docs

- `docs/database/FLEETOS_PHASE7_RLS_REMOTE_VALIDATION.md` — pre/post validation
- `docs/database/FLEETOS_PHASE7_RLS_AUDIT.md`
- `docs/database/FLEETOS_PHASE7_RLS_PLAN.md`
- `docs/database/_validate_phase7_rls_remote.sql`
- `docs/database/FLEETOS_PHASE3_APPLIED_REPORT.md`
