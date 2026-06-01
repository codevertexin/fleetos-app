# FleetOS P0.2b-1 — billing gate schema risks

**Migration:** `20260529140000_fleetos_billing_gate_p0_2b_1_schema.sql`

## Schema

| Risk | Impact | Mitigation |
|------|--------|------------|
| **New column on hot table** | Brief lock on `ALTER TABLE tenants` | Small tenant count in dev; run in maintenance window in prod |
| **NOT NULL + DEFAULT `none`** | Existing rows get `none` on add | Expected; approval (`tenants.status`) unchanged |
| **`billing_plan_code` already nullable** | No change if column exists | `ADD COLUMN IF NOT EXISTS` is no-op |

## Product / gate logic (downstream P0.2b Edge)

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Approved tenant with `none`** | UX `active_unsubscribed` until subscribe | By design (contract §4.4) |
| **Legacy `billing_plan_code` set, `subscription_status = none`** | Edge may treat as subscribed via plan_code OR require both | Documented in contract; optional SQL align in validation file |
| **`trialing` vs writes** | Product must decide | Contract defaults trialing → writes allowed |

## Operations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Rollback drops `subscription_status`** | Loses billing gate column data | Export snapshot before rollback if needed |
| **Rollback does not remove `billing_plan_code`** | Column predates this migration | Correct — Phase 3 owned column |
| **Index `tenants_subscription_status_idx`** | Extra storage | Low cardinality; safe to drop on rollback |

## Out of scope (unchanged)

- Billing Core webhooks, checkout, RLS, Edge, frontend.

## Apply order

1. `20260529130000_fleetos_company_onboarding_p0_schema.sql` (if not applied)
2. `20260529140000_fleetos_billing_gate_p0_2b_1_schema.sql`
3. Run `docs/database/_validate_fleetos_billing_gate_schema.sql`
