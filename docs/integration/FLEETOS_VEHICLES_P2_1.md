# FleetOS P2.1 — Vehicles foundation

## Database

Apply migration:

```bash
supabase db push
# or
supabase migration up
```

1. `supabase/migrations/20260530115900_fleetos_vehicles_p2_1_enums.sql` **(primeiro)**
2. `supabase/migrations/20260530120000_fleetos_vehicles_p2_1_foundation.sql`

`supabase db push` aplica por ordem de timestamp.

### SQL Editor (manual) — dois passos

```text
1) Colar e executar 20260530115900_fleetos_vehicles_p2_1_enums.sql  → Success
2) Colar e executar 20260530120000_fleetos_vehicles_p2_1_foundation.sql → Success
```

Não juntar os dois no mesmo `BEGIN`/`COMMIT`.

### Erro `unsafe use of new value "company_owned" of enum type vehicle_ownership` (55P04)

PostgreSQL exige que novos valores de enum sejam **committed** antes de aparecerem em `UPDATE`. Corrido com a migration `20260530115900` separada.

### Erro `invalid input value for enum vehicle_ownership: "company_owned"`

O projeto remoto já usa o enum `vehicle_ownership` (não `text`). A migration P2.1 atualizada:

1. Faz `ALTER TYPE ... ADD VALUE IF NOT EXISTS` para os valores FleetOS.
2. Faz backfill com cast `::vehicle_ownership` (ou o primeiro label existente no enum).

Ver labels atuais:

```sql
SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'vehicle_ownership'
ORDER BY e.enumsortorder;
```

Se a migration falhou a meio, volta a correr o ficheiro completo (está dentro de `BEGIN`/`COMMIT` — em caso de erro anterior, nada ficou aplicado).

## Edge deploy

```bash
supabase functions deploy fleetos-list-vehicles fleetos-create-vehicle fleetos-update-vehicle fleetos-deactivate-vehicle --project-ref <ref>
```

Auth: `Authorization: Bearer <codevertex_edge_jwt>` (same as other FleetOS Edge).

## Frontend

- Canonical: `/admin/vehicles` (`VehiclesListPage`)
- Legacy aliases: `/app/vehicles` → `/admin/vehicles`; mock list still at `/vehicles` (not in nav)
- Route map: `docs/integration/FLEETOS_ROUTES.md`
- Mock mode: `VITE_FLEETOS_USE_VEHICLE_MOCK=true` (uses `src/lib/mock-data.ts`)
- Production: mock flag unset/false + `VITE_SUPABASE_URL` + anon key

## Smoke (create)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/fleetos-list-vehicles" \
  -H "Authorization: Bearer $EDGE_JWT" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4200" \
  -d '{"tenant_id":"<tenant-uuid>","limit":50}'
```
