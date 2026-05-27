# FleetOS — Phase 3 migration applied report

**Date:** 2026-05-26  
**Target project:** `kjiwzqysjassakvrojun` (development only — **not** production)  
**Migration file:** `supabase/migrations/20260524140000_phase3_tenant_layer.sql`

---

## Summary

| Item | Status |
|------|--------|
| **Phase 3 status** | **APPLIED SUCCESSFULLY** |
| Apply method | Supabase SQL Editor (manual) |
| Project | `kjiwzqysjassakvrojun` (development) |
| Post-apply validation | **PASS** (user-confirmed + results below) |
| Git push | **Not performed** |

---

## Apply

- **Applied:** yes — full migration run in Supabase SQL Editor on development project.
- **Errors:** none reported.

---

## Validation results

### Tenant layer row counts

| Object | Count |
|--------|------:|
| `tenants` | 1 |
| `tenant_settings` | 1 |
| `tenant_domains` | 0 |
| `tenant_users` | 0 |

### Schema checks

| Check | Result |
|-------|--------|
| `profiles.codevertex_user_id` exists | **PASS** |
| `tenant_id` on all intended operational tables | **PASS** |

**Tables with `tenant_id`:** `companies`, `vehicles`, `drivers`, `owners`, `booking_requests`, `assignments`, `documents`, `expenses`, `incomes`, `payouts`, `driver_payouts`, `rental_contracts`, `driver_contracts`.

### Orphan `tenant_id` counts (NULL)

| Table | Orphans |
|-------|--------:|
| `vehicles` | 0 |
| `drivers` | 0 |
| `booking_requests` | 0 |
| `assignments` | 0 |
| `driver_payouts` | 0 |
| `driver_contracts` | 0 |

### Company ↔ tenant link

| Company | Tenant ID |
|---------|-----------|
| FleetOS Demo Company | `8062f831-048c-443d-a7c9-1ad62a86a3cf` |

Backfill rule **one company → one tenant** confirmed for the demo company.

---

## What was created / added

### New tables

- `public.tenants`
- `public.tenant_domains`
- `public.tenant_settings`
- `public.tenant_users`

### New columns

- `profiles.codevertex_user_id` (nullable uuid)
- `tenant_id` (nullable uuid, FK → `tenants`) on 12 operational tables listed above

### Helper functions

- `current_codevertex_user_id()`
- `my_tenant_ids()`
- `is_tenant_user(uuid)`
- `is_tenant_admin(uuid)`

### Not changed (as designed)

- No table drops
- No RLS policy rewrite
- No `tenant_id NOT NULL` constraints
- No frontend / Billing / Auth changes in this migration

---

## Rules compliance

| Rule | Status |
|------|--------|
| Development project only | **Yes** |
| No production apply | **Yes** |
| No table drops | **Yes** |
| No RLS rewrite | **Yes** |
| No NOT NULL on `tenant_id` | **Yes** |
| No `service_role` required for apply | **Yes** |

---

## Optional CLI apply

`scripts/apply-phase3.ps1` remains for future CLI/psql use. Primary apply for this cycle was SQL Editor.

---

## Next required Phase 4 tasks

1. Enable RLS on `tenants`, `tenant_domains`, `tenant_settings`, `tenant_users` with tenant-aware policies (alongside existing company policies).
2. Migrate `company_users` → `tenant_users` when `profiles.codevertex_user_id` is populated from Auth Core SSO.
3. Wire Supabase client in frontend; replace mock session/data progressively.
4. After stable usage, consider `tenant_id NOT NULL` on core operational tables.
5. Populate `profiles.codevertex_user_id` from Auth Core on SSO login.

---

## Related docs

- `docs/database/FLEETOS_PHASE3_SCHEMA_REPORT.md`
- `docs/database/FLEETOS_PHASE3_REMOTE_SCHEMA_VALIDATION.md`
- `docs/database/_validate_phase3_prereqs.sql`
