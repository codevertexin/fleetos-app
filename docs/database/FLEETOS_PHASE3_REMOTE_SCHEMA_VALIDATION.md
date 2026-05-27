# FleetOS — Phase 3 validação remota do schema (read-only)

**Data:** 2026-05-26  
**Projeto (ref no host):** `kjiwzqysjassakvrojun`  
**Fonte de credenciais:** `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` apenas)

## Resumo executivo

| Severidade | Contagem | Significado |
|------------|------------|-------------|
| **PASS** | Maioria dos pré-requisitos Phase 3 | Tabelas centrais e colunas críticas existem para o backfill principal (company → tenant). |
| **WARNING** | Várias divergências de coluna | O schema real difere do inventário em alguns caminhos inferidos (`drivers`, `assignments`→booking, `driver_payouts`, `driver_contracts`). |
| **BLOCKER** | 0 | Nada impediu **conceitualmente** a aplicação da migração SQL Phase 3; risco operacional em linhas sem `company_id` onde a migração só faz join por essa coluna. |

**Não executado:** `supabase db push`, execução de `20260524140000_phase3_tenant_layer.sql`, SQL destrutivo, `service_role`, ligação direta Postgres (`psql` na porta 5432/6543 falhou por timeout na rede deste ambiente).

## Método de validação

1. **Ligação:** HTTPS ao PostgREST em `VITE_SUPABASE_URL` com header `apikey` + `Authorization: Bearer <anon>`.
2. **Heurística de coluna:** `GET /rest/v1/{tabela}?select={coluna}&limit=0`  
   - **HTTP 200:** coluna exposta e reconhecida pelo PostgREST (existe no schema exposto).  
   - **HTTP 400:** coluna inexistente ou inválida para `select` (**MISSING** para efeitos Phase 3).  
   - **HTTP 404:** recurso inexistente ou não exposto ao `anon`.
3. **RPC:** `POST /rest/v1/rpc/{nome}` com `{}` para detetar funções expostas ao PostgREST (não prova ausência em `pg_proc` se não estiver exposta).

**Observação:** `my_profile_id` e `my_company_id` responderam **HTTP 200** (corpo `null` sem sessão autenticada, o que é esperado). `handle_new_user` devolveu **HTTP 404** via PostgREST — pode significar função não exposta ao API, não necessariamente ausência na base; o script SQL em `docs/database/_validate_phase3_prereqs.sql` confirma em `pg_proc`.

O ficheiro `docs/database/_validate_phase3_prereqs.sql` é **válido em Postgres** (só `SELECT` em `information_schema` / `pg_proc`). A sua execução no **SQL Editor** do Supabase (com sessão que veja `auth`/`public`) confirma FKs e tipos com precisão superior à REST.

---

## 1. Script `_validate_phase3_prereqs.sql`

| Resultado | Nota |
|-----------|------|
| **PASS** | Sintaxe e objetos referenciados (`information_schema`, `pg_proc`, `pg_namespace`) são standard Postgres. |
| **WARNING** | Não foi executado nesta sessão (sem password de base / sem SQL Editor). Correr no dashboard antes de aplicar Phase 3 em staging. |

---

## 2. Tabelas e colunas pedidas

### `public.profiles`

| Item | Resultado | Evidência REST |
|------|-----------|----------------|
| Tabela existe | **PASS** | `profiles?select=id&limit=0` → 200 |
| `profiles.id` | **PASS** | id → 200 |
| `profiles.user_id` | **PASS** | user_id → 200 |
| `profiles.codevertex_user_id` | **PASS** (esperado antes da migração) | **MISSING** (400) — coluna ainda não aplicada; a migração Phase 3 adiciona-a. |

### `public.companies`

| Item | Resultado |
|------|-----------|
| Tabela + `id` | **PASS** |
| `created_at` | **PASS** |
| `name` | **PASS** |

### Tabelas operacionais (existência + colunas relevantes ao backfill Phase 3)

| Tabela | Existe (REST) | `company_id` (onde aplicável) | Notas |
|--------|---------------|----------------------------------|-------|
| `vehicles` | **PASS** | **PASS** | |
| `drivers` | **PASS** | **MISSING** | Existe `company_user_id` (**PASS**) — modelo liga motorista a `company_users`, não diretamente a `company_id`. |
| `owners` | **PASS** | **PASS** | |
| `booking_requests` | **PASS** | **PASS** | |
| `assignments` | **PASS** | **PASS** | |
| `documents` | **PASS** | **PASS** | |
| `expenses` | **PASS** | **PASS** | |
| `incomes` | **PASS** | **PASS** | |
| `payouts` | **PASS** | **PASS** | |
| `driver_payouts` | **PASS** | **MISSING** | `driver_id` **PASS**; `payout_id` **MISSING** (a migração tenta caminho via `payouts` se existir). |
| `rental_contracts` | **PASS** | **PASS** (+ `vehicle_id` **PASS**) | |
| `driver_contracts` | **PASS** | **MISSING** | `driver_id` **PASS** |

### Tabelas Phase 3 (ainda não aplicadas)

| Tabela | Resultado |
|--------|-----------|
| `tenants` | **404** — esperado antes da migração |
| `tenant_users` | **404** — esperado antes da migração |

### `company_users` (relevante para o modelo real `drivers`)

| Coluna | Resultado |
|--------|-----------|
| `id` | **PASS** |
| `company_id` | **PASS** |
| `profile_id` | **PASS** |

---

## 3. Backfill: company → tenant e caminhos inferidos

| Assunção na migração | Resultado | Detalhe |
|----------------------|-----------|---------|
| Uma linha em `companies` sem `tenant_id` → criar `tenants` e ligar | **PASS** | `companies` existe com `id`, `name`, `created_at`; ordenação por `created_at` é compatível com o schema remoto. |
| `fleetos_backfill_tenant_from_company` via `company_id` em tabelas operacionais | **PASS** com **WARNING** | Funciona onde existe `company_id`. |
| `drivers` via `company_id` | **WARNING** | **`drivers.company_id` não existe**; o backfill direto por `company_id` **não preenche** `drivers.tenant_id` com o SQL atual. |
| `assignments` ← `booking_requests` (`booking_request_id` ou `booking_id`) | **WARNING** | **`booking_request_id` e `booking_id` ausentes** em `assignments` (400). Se `assignments.company_id` estiver sempre preenchido, o tenant ainda pode propagar-se; o bloco inferido da migração fica sem efeito. |
| `driver_payouts` ← `drivers` | **WARNING** | Depende de `drivers.tenant_id`; se `drivers` ficar sem tenant, esta cadeia não resolve. |
| `driver_payouts` ← `payouts` via `payout_id` | **WARNING** | **`payout_id` ausente**; este ramo da migração não corre neste schema. |
| `rental_contracts` ← `vehicles` | **PASS** | `vehicle_id` existe. |
| `driver_contracts` ← `drivers` | **WARNING** | `driver_id` existe; depende de `drivers.tenant_id` (ver acima). |

**Conclusão de readiness (pré-patch):** a migração aplicava-se, mas o backfill antigo deixaria `tenant_id` nulo em `drivers` e dependentes.

**Pós-patch (2026-05-26):** `20260524140000_phase3_tenant_layer.sql` foi alinhada aos caminhos reais abaixo. **Ready to apply** no Supabase de desenvolvimento após aprovação explícita.

---

## 4. `current_codevertex_user_id()` — qual predicado é correcto?

Com base no schema remoto:

| Predicado | Correcto? | Justificação |
|-----------|-----------|----------------|
| `profiles.user_id = auth.uid()` | **Sim (preferido)** | A coluna `user_id` **existe**; é o padrão quando o perfil não usa `id` igual ao UUID do Supabase Auth. |
| `profiles.id = my_profile_id()` | **Sim (secundário)** | O RPC `my_profile_id` responde **HTTP 200** (função exposta); a migração usa este ramo quando não há `user_id` *ou* como complemento à ordem definida no SQL. |
| `profiles.id = auth.uid()` | **Só como fallback** | Manter apenas se `profiles.id` for de facto o id do utilizador em `auth.users` (template “profiles.id = auth.uid()”). Com **`user_id` presente**, o ramo `id = auth.uid()` **não deve** ser o principal. |

A implementação actual em `20260524140000_phase3_tenant_layer.sql` (ordem: `user_id` → `my_profile_id()` → fallback `id = auth.uid()`) está **alinhada** com este schema remoto.

---

## 5. Índices (assunções da migração)

| Resultado | Nota |
|-----------|------|
| **WARNING** | O PostgREST **não** lista índices. Não foi possível confirmar remotamente `CREATE INDEX IF NOT EXISTS` sem duplicar nomes ou colidir com índices existentes. |
| **PASS** (lógico) | Os nomes sugeridos na migração são novos (`tenants_*`, `tenant_*`, `*_tenant_id_idx`, etc.); risco baixo, mas confirmação definitiva = `pg_indexes` no SQL Editor após staging. |

---

## 6. Lista explícita: colunas em falta vs migração (REST)

**Exactamente MISSING (HTTP 400) em relação ao que a migração assume ou usa:**

- `drivers.company_id`
- `assignments.booking_request_id`, `assignments.booking_id`
- `driver_payouts.company_id`, `driver_payouts.payout_id`
- `driver_contracts.company_id`
- `profiles.codevertex_user_id` — **esperado antes** de aplicar a migração (a Phase 3 adiciona a coluna)

**Tabelas “em falta” no API público (HTTP 404):**

- `tenants`, `tenant_users` — **esperado** pré-Phase 3

---

## 7. Incompatibilidades com o documento `FLEETOS_SCHEMA_MIGRATION_V1.md`

- O inventário assume `drivers` com `company_id` para modelo operacional; o schema remoto expõe **`company_user_id`** em vez de `company_id` em `drivers`.
- O inventário / migração assume FK de `assignments` para pedidos com nomes `booking_request_id` ou `booking_id`; no remoto **nenhum** dos dois nomes existe como coluna seleccionável.

---

## 8. Migration readiness (conclusão)

| Pergunta | Resposta |
|----------|----------|
| A migração Phase 3 pode ser aplicada no Supabase de **desenvolvimento**? | **PASS** — `profiles` / `companies` e tabelas operacionais existem; backfill patcheado. |
| Backfill alinhado ao schema real? | **PASS** (após patch) — ver secção 10. |
| Aplicar automaticamente? | **Não** — aguardar aprovação (`db push` ou SQL Editor). |

Projeto em desenvolvimento **sem dados de produção**; não é necessária lógica pesada de preservação de dados legados.

---

## 9. Próximos passos (após aprovação)

1. Aplicar `supabase/migrations/20260524140000_phase3_tenant_layer.sql` no projeto `kjiwzqysjassakvrojun`.
2. Opcional: correr `docs/database/_validate_phase3_prereqs.sql` no SQL Editor para confirmar FK `profiles.user_id`.
3. Opcional: contagens `tenant_id IS NULL` por tabela (dev DB pode estar vazio).

---

## 10. Patch aplicado à migração (2026-05-26)

| Caminho | SQL na migração |
|---------|-----------------|
| `drivers.company_user_id` → `company_users` → `companies.tenant_id` | `UPDATE drivers … JOIN company_users … JOIN companies` |
| `assignments.driver_id` → `drivers.tenant_id` | `UPDATE assignments … FROM drivers` |
| `assignments.vehicle_id` → `vehicles.tenant_id` | `UPDATE assignments … FROM vehicles` |
| `driver_payouts.driver_id` → `drivers.tenant_id` | `UPDATE driver_payouts … FROM drivers` |
| `driver_contracts.driver_id` → `drivers.tenant_id` | `UPDATE driver_contracts … FROM drivers` |

**Removido** da migração: probes `booking_request_id` / `booking_id`, `driver_payouts` via `payout_id`, backfill `drivers` via `company_id` inexistente.
