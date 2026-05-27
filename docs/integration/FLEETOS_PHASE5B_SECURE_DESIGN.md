# FleetOS Phase 5b — Secure operational identity architecture

**Status:** 2026-05-27 — replaces anon-callable `SECURITY DEFINER` RPC design (rejected in `FLEETOS_PHASE5B_SECURITY_REVIEW.md`).

---

## 1. Why anon RPC was rejected

| Problema | Risco |
|----------|--------|
| `GRANT EXECUTE … TO anon` em funções `SECURITY DEFINER` que escrevem `tenant_users` | Qualquer cliente com a **anon key** (sempre no bundle) podia passar **qualquer** `p_codevertex_user_id` + `p_tenant_id` existente e fazer **upsert** sem prova de membership Auth Core. |
| `fleetos_list_operational_tenants(p_codevertex_user_id uuid)` | **IDOR** — enumeração de tenants por UUID sem ligação a identidade verificada. |
| Confiança no browser para `tenant_id` / `active` | A camada SQL **não** repetia as regras; só o TypeScript as aplicava. |

**Conclusão:** escrita operacional e listagem de tenants **não** podem depender de RPCs chamáveis com a chave anónima e parâmetros escolhidos pelo cliente.

---

## 2. Nova arquitectura — Supabase Edge Functions

```
Browser (Vite)
  → POST /functions/v1/fleetos-sync-identity
      Headers: Authorization: Bearer <SUPABASE_ANON_KEY>, X-Auth-Core-Access-Token: <Auth Core access token>
      Body: { "app_code": "FLEETOS" }   // sem tenant_id / codevertex_user_id
  → Edge (Deno)
      → [Phase 6] Verificar token Auth Core (JWKS / introspecção / asserção assinada)
      → [Phase 6] createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) apenas no Edge
      → upsert profiles / tenant_users / resposta com tenants permitidos
```

| Função | Ficheiro | Comportamento actual |
|--------|----------|----------------------|
| `fleetos-sync-identity` | `supabase/functions/fleetos-sync-identity/index.ts` | Valida `app_code`, exige header Auth Core; devolve **501** até existir contrato de verificação; **sem escritas na BD**. |
| `fleetos-list-tenants` | `supabase/functions/fleetos-list-tenants/index.ts` | Idem **501**; listagem segura fica para depois da verificação. |

`supabase/config.toml` define `verify_jwt = false` para ambas: o JWT do Auth Core **não** é um JWT Supabase — a verificação é feita (futuramente) com lógica dedicada no Edge.

---

## 3. Contrato Auth Core ainda por fechar (Phase 6)

O Edge precisa de **uma** fonte de verdade acordada com a equipa Auth Core, por exemplo:

- URL **JWKS** + validação de assinatura do access token emitido no consume; claims mínimos: `sub`, `tenant_id` / memberships, `app` / `aud`; ou  
- Endpoint **introspect** com `client_secret` só no Edge (env secret); ou  
- **Asserção assinada** emitida pelo `consume-sso-ticket` (one-shot) verificável com chave pública Auth Core.

Até isso estar definido e implementado, as funções devolvem **501** — comportamento **seguro** (falso “sucesso” inseguro evitado).

---

## 4. O que é seguro agora

| Item | Estado |
|------|--------|
| Migração `20260527130000_phase5b_operational_identity_sync.sql` | Apenas `DROP FUNCTION IF EXISTS` das funções inseguras — **sem** novos grants `anon` para escrita. |
| Cliente `fleetos-identity-sync.service.ts` | **Sem** RPC PostgREST; opcional `fetch` ao Edge; **501** / erro → skip sem alterar BD. |
| `TenantProvider` | Mock **único** tenant por defeito; **sem** chamada anon a list RPC; **sem** escolha silenciosa `tenants[0]` com múltiplos tenants (com vários, exige match explícito). |
| `service_role` | Só referenciado na documentação / futuro código Edge — **nunca** no frontend. |

---

## 5. O que continua bloqueado / pendente

| Item | Bloqueio |
|------|----------|
| Sync real `profiles` / `tenant_users` | Bloqueado até verificação Auth Core no Edge + `service_role` no handler. |
| Lista real de tenants na app | Bloqueado até `fleetos-list-tenants` (ou RPC só `authenticated` com `auth.uid()` mapeado) implementado. |
| CORS `Access-Control-Allow-Origin: *` | **WARNING** — restringir a `VITE_APP_BASE_URL` / domínios de produção quando o fluxo estiver estável. |

---

## 6. Variáveis de ambiente (app)

| Variável | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | Base para `…/functions/v1/fleetos-sync-identity` se `VITE_FLEETOS_SYNC_IDENTITY_URL` omitido. |
| `VITE_SUPABASE_ANON_KEY` | Cabeçalhos `apikey` + `Authorization` para a gateway Supabase Functions (não é `service_role`). |
| `VITE_FLEETOS_SYNC_IDENTITY_URL` | Opcional — URL completa da função (útil por trás de proxy). |

Secrets `SUPABASE_SERVICE_ROLE_KEY` e verificação Auth Core ficam **só** em secrets do projeto Supabase (Edge).
