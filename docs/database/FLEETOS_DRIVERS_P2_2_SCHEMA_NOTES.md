# FleetOS P2.2 — `public.drivers` schema notes (pre-migration)

Remote inventory: `docs/database/FLEETOS_SCHEMA_MIGRATION_V1.md` (~8 columns, RLS enabled).

Phase 3 backfill path: `drivers.company_user_id` → `company_users` → `companies.tenant_id` (not `company_id` on drivers).

P2.2 adds FleetOS setup columns without removing legacy `company_user_id`:

- `full_name`, `phone`, `email`, `status`, `availability`
- `license_expires_at`, `tvde_cert_expires_at`, `tax_id`, `address`
- `is_active`, `deactivated_at`, `created_at`, `updated_at`

Validate on target DB before apply:

```sql
SELECT column_name, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'drivers'
ORDER BY ordinal_position;
```
