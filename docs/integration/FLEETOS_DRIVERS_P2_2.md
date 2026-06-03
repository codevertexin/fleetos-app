# FleetOS P2.2 — Drivers foundation

## Database

Apply migrations in order:

```bash
supabase db push
# or
supabase migration up
```

1. `supabase/migrations/20260530215900_fleetos_drivers_p2_2_enums.sql` **(first)**
2. `supabase/migrations/20260530220000_fleetos_drivers_p2_2_foundation.sql`

### SQL Editor (manual) — two steps

```text
1) Run 20260530215900_fleetos_drivers_p2_2_enums.sql  → Success
2) Run 20260530220000_fleetos_drivers_p2_2_foundation.sql → Success
```

Do not combine both in a single transaction (PostgreSQL 55P04 for new enum values).

Schema notes: `docs/database/FLEETOS_DRIVERS_P2_2_SCHEMA_NOTES.md`

## Edge deploy

```bash
supabase functions deploy fleetos-list-drivers fleetos-create-driver fleetos-update-driver fleetos-deactivate-driver --project-ref <ref>
```

Auth: `Authorization: Bearer <codevertex_edge_jwt>` (same as other FleetOS Edge).

## Frontend

- Canonical: `/admin/drivers` (`DriversListPage`)
- Legacy aliases: `/app/drivers` → `/admin/drivers`; mock list still at `/drivers` (not in AppShell nav)
- Route map: `docs/integration/FLEETOS_ROUTES.md`
- Mock mode: `VITE_FLEETOS_USE_DRIVER_MOCK=true` (uses `src/lib/mock-data.ts`)
- Production: mock flag unset/false + `VITE_SUPABASE_URL` + anon key

## Smoke (list)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/fleetos-list-drivers" \
  -H "Authorization: Bearer $EDGE_JWT" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4200" \
  -d '{"tenant_id":"<tenant-uuid>","limit":50}'
```
