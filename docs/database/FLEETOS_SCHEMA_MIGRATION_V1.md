# FleetOS — Existing Supabase Schema Assessment & Migration Plan V1

Status: Working migration reference  
Purpose: Adapt the existing FleetOS Supabase project to the official CodeVertex multi-tenant architecture without rebuilding from zero.

---

## 1. Current Database State

The existing Supabase project already contains a strong operational FleetOS foundation.

Detected public tables:

| table_name             |   columns_count | has_primary_key   |   foreign_keys |   indexes |   triggers |   policies | rls_enabled   |
|:-----------------------|----------------:|:------------------|---------------:|----------:|-----------:|-----------:|:--------------|
| assignments            |              12 | True              |              3 |         2 |          0 |          2 | True          |
| booking_requests       |              36 | True              |              5 |         6 |          3 |          7 | True          |
| booking_status_history |               8 | True              |              3 |         2 |          0 |          1 | True          |
| companies              |              12 | True              |              1 |         3 |          0 |          2 | True          |
| company_users          |               6 | True              |              2 |         4 |          0 |          2 | True          |
| documents              |              11 | True              |              1 |         2 |          3 |          5 | True          |
| driver_availability    |              11 | True              |              2 |         2 |          1 |          4 | True          |
| driver_contracts       |              12 | True              |              1 |         1 |          0 |          0 | True          |
| driver_payouts         |              12 | True              |              1 |         2 |          0 |          0 | True          |
| driver_time_off        |               9 | True              |              3 |         2 |          1 |          4 | True          |
| drivers                |               8 | True              |              2 |         1 |          0 |          5 | True          |
| expenses               |              12 | True              |              3 |         1 |          0 |          4 | True          |
| incomes                |              11 | True              |              2 |         1 |          0 |          4 | True          |
| owners                 |               8 | True              |              2 |         1 |          0 |          5 | True          |
| payouts                |              14 | True              |              3 |         2 |          0 |          5 | True          |
| profiles               |               9 | True              |              1 |         3 |          0 |          3 | True          |
| rental_contracts       |              13 | True              |              3 |         1 |          0 |          0 | True          |
| vehicles               |              14 | True              |              2 |         2 |          0 |          5 | True          |

### Key observation

The existing model is already operationally rich and includes:

- companies
- company_users
- profiles
- vehicles
- drivers
- owners
- rental_contracts
- driver_contracts
- assignments
- booking_requests
- booking_status_history
- driver availability
- driver time off
- documents
- expenses
- incomes
- payouts
- driver_payouts

This means the correct strategy is **migration/adaptation**, not database replacement.

---

## 2. Current Architectural Shape

The current schema appears to follow this model:

```txt
company
  -> users
  -> vehicles
  -> drivers
  -> owners
  -> contracts
  -> bookings
  -> payouts
```

This is a valid single-company or company-scoped operational model.

However, the official FleetOS target model is:

```txt
tenant
  -> companies / suppliers / owners
  -> vehicles
  -> drivers
  -> contracts
  -> bookings
  -> finance
  -> documents
```

### Important distinction

In the future architecture:

```txt
tenant != company
tenant != owner
tenant != supplier
```

- `tenant` = FleetOS customer account / client organization.
- `company` = operational company inside the tenant, or current migrated business entity.
- `owner` = individual or company that owns/provides vehicles.
- `supplier` = external rental/leasing/company partner.

---

## 3. Existing Strengths

The current schema already has several important pieces:

### Operational workflows

- `assignments`
- `booking_requests`
- `booking_status_history`
- `driver_availability`
- `driver_time_off`

### Fleet management

- `vehicles`
- `drivers`
- `documents`

### Financial layer

- `expenses`
- `incomes`
- `payouts`
- `driver_payouts`

### Contract layer

- `rental_contracts`
- `driver_contracts`

### Access layer

- `profiles`
- `company_users`
- RLS enabled on all detected tables

---

## 4. Existing Functions

Detected public functions:

- `assign_booking`
- `booking_end_at`
- `booking_requests_validate`
- `booking_status_history_trigger`
- `documents_resolve_company_id`
- `documents_validate_company`
- `documents_validate_expiry`
- `driver_belongs_to_my_company`
- `driver_company_id`
- `get_my_company_role`
- `handle_new_user`
- `is_company_admin`
- `is_company_ops_manager`
- `is_company_staff`
- `is_company_user`
- `is_driver_available_for_booking`
- `is_driver_user`
- `is_owner_user`
- `is_platform_staff`
- `is_staff`
- `is_vehicle_available_for_booking`
- `my_company_id`
- `my_company_user_id`
- `my_driver_id`
- `my_owner_id`
- `my_profile_id`
- `owner_belongs_to_my_company`
- `payout_belongs_to_my_company`
- `run_payout`
- `set_updated_at`
- `suggest_available_drivers_for_booking`
- `validate_assignment_overlap`

### Important functions already aligned with FleetOS logic

- `assign_booking`
- `is_driver_available_for_booking`
- `is_vehicle_available_for_booking`
- `suggest_available_drivers_for_booking`
- `run_payout`
- `validate_assignment_overlap`
- `my_company_id`
- `my_profile_id`
- `my_driver_id`
- `my_owner_id`

These functions should be preserved and adapted to tenant-aware logic.

---

## 5. Existing Triggers

Detected triggers:

| object_name                        | details             |
|:-----------------------------------|:--------------------|
| booking_requests_set_updated_at    | booking_requests    |
| booking_requests_validate_trg      | booking_requests    |
| booking_status_history_trg         | booking_requests    |
| documents_resolve_company_id_trg   | documents           |
| documents_validate_company_trg     | documents           |
| documents_validate_expiry_trg      | documents           |
| driver_availability_set_updated_at | driver_availability |
| driver_time_off_set_updated_at     | driver_time_off     |

### Assessment

The existing triggers show that the database already handles:

- booking validation
- booking status history
- updated_at maintenance
- document company resolution
- document validation
- document expiry validation

These are valuable and should not be deleted.

---

## 6. Existing RLS / Policies

Policy count by table:

| details                |   policy_count |
|:-----------------------|---------------:|
| booking_requests       |              7 |
| documents              |              5 |
| drivers                |              5 |
| owners                 |              5 |
| payouts                |              5 |
| vehicles               |              5 |
| driver_availability    |              4 |
| driver_time_off        |              4 |
| expenses               |              4 |
| incomes                |              4 |
| profiles               |              3 |
| assignments            |              2 |
| companies              |              2 |
| company_users          |              2 |
| booking_status_history |              1 |

### Assessment

RLS is already enabled across the schema, which is good.

However, current policies are company-scoped.  
They must evolve to tenant-scoped.

Current likely pattern:

```sql
company_id = my_company_id()
```

Target pattern:

```sql
tenant_id = my_tenant_id()
```

or:

```sql
exists (
  select 1
  from tenant_users tu
  where tu.tenant_id = table.tenant_id
    and tu.codevertex_user_id = current_codevertex_user_id()
    and tu.is_active = true
)
```

---

## 7. Required New Tenant Layer

Add the following tables.

### tenants

```sql
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  custom_domain text,
  logo_url text,
  primary_color text,
  secondary_color text,
  locale text not null default 'pt-PT',
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Lisbon',
  billing_plan_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### tenant_domains

```sql
create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain text not null unique,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
```

### tenant_settings

```sql
create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  booking_enabled boolean not null default true,
  driver_portal_enabled boolean not null default true,
  customer_portal_enabled boolean not null default true,
  public_booking_slug text,
  default_booking_duration_minutes integer not null default 60,
  min_notice_minutes integer not null default 120,
  allow_external_owners boolean not null default true,
  allow_external_companies boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### tenant_users

```sql
create table public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  codevertex_user_id uuid not null,
  profile_id uuid references public.profiles(id),
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, codevertex_user_id)
);
```

---

## 8. Required Adaptation of Existing Tables

The current database already uses `company_id` heavily.

The migration should add `tenant_id` first, then backfill from companies.

### Tables that must receive tenant_id

- `companies`
- `company_users`
- `vehicles`
- `drivers`
- `owners`
- `rental_contracts`
- `driver_contracts`
- `assignments`
- `booking_requests`
- `booking_status_history`
- `driver_availability`
- `driver_time_off`
- `documents`
- `expenses`
- `incomes`
- `payouts`
- `driver_payouts`

Migration rule:

```txt
existing company -> initial tenant
```

Each current company can become an initial tenant unless a consolidation rule is defined.

---

## 9. Companies Table Adaptation

Current `companies` should not be deleted.

Add:

```sql
alter table public.companies
  add column if not exists tenant_id uuid references public.tenants(id),
  add column if not exists company_type text not null default 'internal';
```

Recommended `company_type` values:

- `internal`
- `supplier`
- `external_owner`
- `leasing_partner`

---

## 10. Owners / Suppliers Direction

The current table `owners` exists and should be preserved initially.

Target evolution:

Option A — keep `owners` and expand it:

```sql
alter table public.owners
  add column if not exists tenant_id uuid references public.tenants(id),
  add column if not exists owner_type text not null default 'individual',
  add column if not exists supplier_type text,
  add column if not exists company_name text,
  add column if not exists contact_name text,
  add column if not exists status text not null default 'active';
```

Option B — later rename conceptually to `owners_suppliers`.

Recommendation for MVP:

Keep `owners` to avoid breaking current code.  
Expand it to support companies, suppliers and leasing partners.

---

## 11. Vehicles Adaptation

Add:

```sql
alter table public.vehicles
  add column if not exists tenant_id uuid references public.tenants(id),
  add column if not exists ownership_type text not null default 'company_owned',
  add column if not exists owner_type text,
  add column if not exists supplier_company_id uuid references public.companies(id);
```

Recommended `ownership_type`:

- `company_owned`
- `individual_owner`
- `external_company`
- `leasing_partner`

---

## 12. CodeVertex Identity Adaptation

FleetOS must align with the CodeVertex canonical identity.

Add to `profiles`:

```sql
alter table public.profiles
  add column if not exists codevertex_user_id uuid;
```

Long-term rule:

```txt
FleetOS local profile/user -> codevertex_user_id
```

Do not use email as canonical identity.

---

## 13. Tenant Helper Functions

Add helper functions before rewriting policies.

Recommended functions:

```sql
current_codevertex_user_id()
my_tenant_ids()
is_tenant_user(p_tenant_id uuid)
is_tenant_admin(p_tenant_id uuid)
is_tenant_staff(p_tenant_id uuid)
```

The existing `my_company_id()` and `is_company_staff()` functions can be kept temporarily for compatibility.

---

## 14. RLS Migration Strategy

Do not rewrite all RLS policies in one step.

Recommended safe sequence:

1. Add tenant tables.
2. Add `tenant_id` nullable to existing operational tables.
3. Backfill `tenant_id`.
4. Add indexes.
5. Add helper functions.
6. Add tenant-aware policies alongside existing company-aware policies.
7. Test all app flows.
8. Make `tenant_id` NOT NULL where safe.
9. Remove old company-only assumptions later.

---

## 15. Backfill Strategy

For initial migration:

```txt
one existing company = one tenant
```

Suggested approach:

1. Create a tenant for each company.
2. Set `companies.tenant_id`.
3. Backfill all child tables using their existing `company_id`.
4. For tables without direct `company_id`, infer through vehicle, driver, owner, payout, contract relation.

Important:

Some introspection data is partial, so final SQL must be generated after a complete schema export.

---

## 16. Integration With CodeVertex Core

FleetOS must follow the official CodeVertex app contract.

Required environment variables:

```env
VITE_APP_CODE=FLEETOS
VITE_ECOSYSTEM_CODE=codevertex
VITE_AUTH_BASE_URL=https://auth.codevertex.cc
VITE_BILLING_BASE_URL=https://billing.codevertex.cc
VITE_HELP_BASE_URL=https://help.codevertex.cc
VITE_LEGAL_BASE_URL=https://legal.codevertex.cc
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

FleetOS must not expose:

- service role keys
- Stripe secrets
- webhook secrets
- OpenAI/Gemini keys

---

## 17. Implementation Priority

### Priority 1 — Database safety

- create tenant layer
- add nullable `tenant_id`
- backfill
- indexes

### Priority 2 — App integration

- frontend tenant resolver
- tenant context provider
- route protection
- CodeVertex Auth Core

### Priority 3 — Data services

- replace mock data with Supabase service layer
- map all queries to tenant_id

### Priority 4 — Billing

- integrate Billing Core
- validate entitlements
- no direct Stripe

### Priority 5 — Help / Legal

- contextual Help links
- Legal Core links

---

## 18. Cursor Instruction

Before implementing any SQL, Cursor must:

1. Inspect the actual current schema.
2. Confirm all table columns.
3. Generate reversible migrations.
4. Avoid dropping existing tables.
5. Avoid destructive migrations.
6. Preserve functions, triggers and policies unless explicitly replaced.
7. Run migrations in a staged way.

---

## 19. Final Recommendation

The existing FleetOS Supabase database is a strong foundation.

Do not rebuild it.

Adapt it.

The correct path is:

```txt
existing company-scoped FleetOS schema
+
tenant layer
+
CodeVertex identity mapping
+
white-label/domain settings
+
tenant-aware RLS
=
FleetOS multi-tenant CodeVertex SaaS
```
