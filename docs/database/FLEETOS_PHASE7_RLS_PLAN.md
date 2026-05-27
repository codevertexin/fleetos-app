# FleetOS Phase 7 — RLS plan & rollout

**Date:** 2026-05-28  
**Migration file:** `supabase/migrations/20260528140000_phase7_tenant_rls_foundation.sql`  
**Status:** **APPLIED** on FleetOS dev (`kjiwzqysjassakvrojun`, 2026-05-28, SQL Editor)  
**Applied report:** `docs/database/FLEETOS_PHASE7_APPLIED_REPORT.md`  
**Do not merge to `main` without review.** Do not push to remote without approval.

---

## Goals (this phase) — completed

1. **Tenant tables:** RLS enabled; members read tenant metadata; `tenant_admin` / `fleet_manager` may **update** `tenant_settings`; users read own `tenant_users` rows; **no** anon policies on tenant tables; **no** broad `tenant_users` writes from authenticated clients.
2. **Operational tables:** **SELECT** policies added using `tenant_id IN (SELECT public.my_tenant_ids())`, **alongside** existing company-scoped policies.
3. **Non-goals respected:** no `tenant_id NOT NULL`; company policies retained; mock data unchanged; Billing/Stripe untouched.

---

## Policies applied (summary)

| Layer | Tables | Policies | Commands |
|-------|--------|----------|----------|
| Tenant core | 4 | 5 | 4× SELECT, 1× UPDATE (`tenant_settings`) |
| Operational | 12 | 12 | SELECT only |
| **Total `fleetos_p7_*`** | **16 tables** | **17** | All `TO authenticated` |

Operational tables: `companies`, `vehicles`, `drivers`, `owners`, `booking_requests`, `assignments`, `documents`, `expenses`, `incomes`, `payouts`, `rental_contracts`, `driver_contracts`.

---

## Post-apply verification (FleetOS)

| Check | Result |
|-------|--------|
| `fleetos_p7_*` exist on expected tables | **PASS** |
| No `fleetos_p7_*` for `anon` | **PASS** |
| Operational `fleetos_p7_*` are SELECT only | **PASS** |
| `tenant_settings` has single UPDATE for admins | **PASS** |
| RLS on tenant core tables | **PASS** — enabled |
| Public booking anon policies unchanged | **PASS** |

---

## Accepted legacy policies (unchanged)

| Policy | Purpose |
|--------|---------|
| `companies_public_booking_select` | Public company lookup for `/book/:companySlug` |
| `booking_requests_public_insert` | Anonymous booking request creation |

Documented in `docs/database/FLEETOS_PHASE7_RLS_REMOTE_VALIDATION.md`.

---

## Risks (mitigated at apply time)

| Risk | Outcome on dev |
|------|----------------|
| `my_tenant_ids()` empty before Edge sync | Company policies still allow legacy path; tenant SELECT adds rows only when membership exists |
| Dual company + tenant visibility | Expected during transition (OR of permissive policies) |
| Public `/book/*` regression | **No change** — legacy anon policies untouched |

---

## Apply checklist — completed

- [x] Phase 3 helpers and `tenant_id` columns present
- [x] Pre-apply validation (`_validate_phase7_rls_remote.sql`)
- [x] Migration applied successfully on FleetOS dev
- [x] Post-apply: `fleetos_p7_*` policies and RLS state confirmed
- [x] Legacy public-booking policies accepted and unchanged

---

## Next phases (recommended)

See **`docs/database/FLEETOS_PHASE7_APPLIED_REPORT.md`** §Next phase recommendation:

1. **Phase 7b** — Supabase client + authenticated reads; replace mock operational data.
2. **Phase 8** — Role-specific operational writes (narrow policies).
3. **Phase 8b** — Extend to `driver_payouts` and other tables as needed.
4. **Later** — `tenant_id NOT NULL`; retire company-only policies when ready.

---

## Validation artifacts

- `docs/database/_validate_phase7_rls_remote.sql` — read-only checks (pre/post)
- `docs/database/FLEETOS_PHASE7_RLS_REMOTE_VALIDATION.md`
- `docs/database/FLEETOS_PHASE7_RLS_AUDIT.md`
