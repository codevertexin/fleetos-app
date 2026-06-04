# FleetOS P2.2 — `public.drivers` schema notes (pre-migration)

Remote inventory: `docs/database/FLEETOS_SCHEMA_MIGRATION_V1.md` (~8 columns, RLS enabled).

Phase 3 backfill path: `drivers.company_user_id` → `company_users` → `companies.tenant_id` (not `company_id` on drivers).

P2.2 adds FleetOS setup columns without removing legacy `company_user_id`:

- `full_name`, `phone`, `email`, `status`, `availability` (text + CHECK — **not** enum)
- `license_expires_at`, `tvde_cert_expires_at`, `tax_id`, `address`
- `is_active`, `deactivated_at`, `created_at`, `updated_at`

**Name collision:** `public.driver_availability` is a **legacy operational table** (11 cols, RLS). It is **not** an enum. Postgres also exposes a composite type `driver_availability` (`typtype = 'c'`). Migrations must **not** `ALTER TYPE public.driver_availability`.

Operational availability stays in table `driver_availability`; setup snapshot uses `drivers.availability` text.

**Legacy required on create (remote schema):** `profile_id`, `license_no`, `license_expiry`, `external`. Edge `fleetos-create-driver` resolves/creates `profiles` by email, then inserts both legacy and P2.2 columns.

Validate on target DB before apply:

```sql
-- Types named driver_* (enum vs table composite)
SELECT t.typname, t.typtype,
       CASE t.typtype WHEN 'e' THEN 'enum' WHEN 'c' THEN 'composite(table row)' ELSE t.typtype::text END AS kind
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN ('driver_status', 'driver_availability')
ORDER BY t.typname;

SELECT column_name, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'drivers'
ORDER BY ordinal_position;

-- Columns/tables referencing driver_availability TABLE (not enum)
SELECT tc.table_name, kcu.column_name, ccu.table_name AS references_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (ccu.table_name = 'driver_availability' OR tc.table_name = 'driver_availability');
```

Post-migration validation:

```sql
SELECT column_name, udt_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'drivers'
  AND column_name IN ('status', 'availability');

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.drivers'::regclass
  AND conname IN ('drivers_status_check', 'drivers_availability_check');
```
