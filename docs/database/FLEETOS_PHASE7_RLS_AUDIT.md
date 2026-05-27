# FleetOS Phase 7 — RLS audit (pre-migration)

**Date:** 2026-05-28  
**Scope:** Inventory of row-level security as understood from repo + Phase 3 docs (policies are **not** versioned in SQL migrations today).  
**Billing / Stripe:** out of scope (unchanged).

---

## Method

- **Repo:** no `CREATE POLICY` / `ENABLE ROW LEVEL SECURITY` in `supabase/migrations/*.sql` except this Phase 7 draft.
- **Authoritative inventory:** `docs/database/FLEETOS_PHASE3_SCHEMA_REPORT.md` (table list + policy counts) and `docs/database/FLEETOS_SCHEMA_MIGRATION_V1.md` (§6 policy counts).
- **Live dev:** policies may differ slightly; compare with `pg_policies` / Supabase Dashboard after any manual change.

---

## Summary matrix

| Table | RLS enabled (Phase 3 report) | Policy count (report) | Company-scoped (inferred) | Tenant tables / notes |
|--------|------------------------------|-------------------------|---------------------------|------------------------|
| `companies` | yes | 2 | yes (`my_company_id()` pattern) | `tenant_id` nullable |
| `vehicles` | yes | 5 | yes | `tenant_id` nullable |
| `drivers` | yes | 5 | yes | `tenant_id` nullable |
| `owners` | yes | 5 | yes | `tenant_id` nullable |
| `booking_requests` | yes | 7 | yes + triggers | `tenant_id` nullable |
| `assignments` | yes | 2 | yes | `tenant_id` nullable |
| `documents` | yes | 5 | yes + triggers | `tenant_id` nullable |
| `expenses` | yes | 4 | yes | `tenant_id` nullable |
| `incomes` | yes | 4 | yes | `tenant_id` nullable |
| `payouts` | yes | 5 | yes | `tenant_id` nullable |
| `rental_contracts` | yes | **0** | n/a — **no policies** | `tenant_id` nullable |
| `driver_contracts` | yes | **0** | n/a — **no policies** | `tenant_id` nullable |
| `tenant_users` | **not in legacy list** | **new** (Phase 3) | n/a | RLS **off** in Phase 3 |
| `tenants` | **new** | **none** | n/a | RLS **off** in Phase 3 |
| `tenant_settings` | **new** | **none** | n/a | RLS **off** in Phase 3 |
| `tenant_domains` | **new** | **none** | n/a | RLS **off** in Phase 3 |

### Related (not in Phase 7 migration scope)

| Table | Notes |
|-------|--------|
| `company_users` | RLS yes, 2 policies — unchanged by Phase 7 draft |
| `profiles` | RLS yes — unchanged |
| `booking_status_history` | RLS yes — not listed for Phase 7 operational read |
| `driver_payouts` | RLS yes, 0 policies in report — **not** in user’s Phase 7 table list; defer to Phase 7b if needed |
| `driver_availability`, `driver_time_off` | RLS yes — out of listed scope |

---

## Findings

1. **Company policies remain source of truth** for the current app and for any row with `tenant_id IS NULL`. Phase 7 only **adds** `authenticated` policies; it does **not** `DROP` legacy policies.
2. **`rental_contracts` / `driver_contracts`** with RLS on and **zero** policies implies **default deny** for roles subject to RLS (except superuser / `service_role`). The new `fleetos_p7_authenticated_select_*` policies are the first **explicit** tenant path for `authenticated` on those tables.
3. **Tenant layer tables** had **no RLS** in Phase 3 by design (`FLEETOS_PHASE3_SCHEMA_REPORT.md`). They are readable/writable by any DB role that has table privileges unless restricted elsewhere — Phase 7 closes this for `authenticated` by enabling RLS and narrow policies.
4. **`my_tenant_ids()` / `current_codevertex_user_id()`** are `SECURITY DEFINER` (Phase 3). They resolve membership from `tenant_users` + `profiles`; until Edge sync populates rows, `my_tenant_ids()` is empty for real users and **only** company policies apply.
5. **No anon policies** are introduced in the Phase 7 draft (aligns with “no insecure anon policies”).

---

## Gaps / unknowns (resolve on dev before apply)

- Exact **names** of existing policies (for support tickets / diffs) — query live DB.
- Whether any table uses **PERMISSIVE** vs **RESTRICTIVE** policy mix (rare) — affects combination logic.
- **Public / anon** flows (`/book/*`) — if they rely on `anon` RLS on `companies` or `booking_requests`, Phase 7 draft does not change them; verify no regression when `authenticated` policies are added.

---

## References

- `docs/database/FLEETOS_PHASE3_APPLIED_REPORT.md`
- `docs/database/FLEETOS_PHASE3_SCHEMA_REPORT.md`
- `docs/database/FLEETOS_SCHEMA_MIGRATION_V1.md`
- `docs/integration/FLEETOS_PHASE6_EDGE_IDENTITY_REPORT.md`
- `supabase/migrations/20260524140000_phase3_tenant_layer.sql` (`current_codevertex_user_id`, `my_tenant_ids`, `is_tenant_admin`)
