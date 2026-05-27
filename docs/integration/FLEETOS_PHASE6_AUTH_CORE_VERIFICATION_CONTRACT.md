# FleetOS Phase 6 — Contrato de verificação Auth Core (proposta)

**Estado:** proposta para **fecho explícito** com a equipa Auth Core **antes** de implementar `fleetos-sync-identity` / `fleetos-list-tenants` (substituir 501).  
**Referências:** `docs/PROJECT_STATUS_FLEETOS_CURRENT.md`, `docs/integration/FLEETOS_PHASE5B_SECURE_DESIGN.md`.  
**Fora de âmbito:** Billing, Stripe, reescrita RLS, merge para `main`.

---

## 1. Princípios (invioláveis)

| # | Regra |
|---|--------|
| P1 | O Edge **nunca** aceita `codevertex_user_id`, `tenant_id`, `membership_status` ou `memberships[]` no corpo do pedido como fonte de verdade. |
| P2 | Identidade e entitlements FLEETOS derivam **apenas** de: (a) JWT Auth Core com assinatura verificada, e/ou (b) resposta de **introspecção** Auth Core autenticada com segredo só no Edge. |
| P3 | Escritas em `public.profiles` e `public.tenant_users` usam **apenas** `SUPABASE_SERVICE_ROLE_KEY` dentro do Edge (secret Supabase). |
| P4 | O token enviado pelo browser é o **mesmo** `access_token` / `token` devolvido pelo `consume-sso-ticket` (formato já usado pela app); o Edge **não** confia no JSON do consume enviado pelo cliente. |

---

## 2. Formato do token / asserção (a confirmar com Auth Core)

### 2.1 Hipótese A — **Access token JWT** (preferida se suportada)

| Campo | Valor proposto |
|--------|----------------|
| Formato | JWT (três segmentos Base64url), algoritmo **RS256** ou **ES256** (evitar HS256 com segredo partilhado entre app e Edge). |
| Transporte | Header HTTP `X-Auth-Core-Access-Token: <jwt>` (mantém `Authorization: Bearer <SUPABASE_ANON_KEY>` para a gateway Supabase). |
| Origem | Resposta JSON de `consume-sso-ticket`: campo `token` ou `access_token` (já normalizado no FleetOS `auth.service.ts`). |

**Confirmação necessária (Auth Core):** o access token emitido no consume é sempre JWT assinável com JWKS público?

### 2.2 Hipótese B — **Token opaco** + introspecção

| Campo | Valor proposto |
|--------|----------------|
| Formato | String opaca (não JWT). |
| Verificação | `POST` (ou `GET` conforme RFC 7662) ao endpoint de introspecção Auth Core com `client_id` + `client_secret` **só** em secrets Edge. |
| Resposta | JSON com `active`, `sub`, e campos de membership / app (ver secção 5). |

**Confirmação necessária:** URL exacta, método, corpo, e schema JSON estáveis.

### 2.3 Hipótese C — **Asserção assinada one-shot** (alternativa)

| Campo | Valor proposto |
|--------|----------------|
| Formato | JWT curto emitido pelo `consume-sso-ticket` com `aud=FleetOS-Edge`, `jti` único, `exp` curto (ex.: 120s). |
| Verificação | JWKS dedicado ou chave pública estática documentada. |

**Confirmação necessária:** Auth Core pode emitir este artefacto sem breaking change no consume actual?

**Decisão de produto:** escolher **uma** hipótese primária (recomendado: **A** se JWT; senão **B**). **C** como optimização futura.

---

## 3. JWKS vs introspecção

### 3.1 Verificação primária — **JWKS** (se Hipótese A ou C)

| Parâmetro | Nome sugerido (secret / env Edge) | Exemplo (placeholder) |
|-----------|-----------------------------------|------------------------|
| URL JWKS | `AUTH_CORE_JWKS_URL` | `https://auth.codevertex.cc/.well-known/jwks.json` *(TBD)* |
| Issuer esperado | `AUTH_CORE_ISSUER` | `https://auth.codevertex.cc` *(TBD)* |
| Audience(s) aceites | `AUTH_CORE_AUDIENCE` | Lista separada por vírgula, ex.: `FLEETOS`, `fleetos-api` *(TBD)* |
| Leeway clock skew | `AUTH_CORE_CLOCK_SKEW_SECONDS` | `60` (default sugerido) |

**Comportamento:** obter JWKS (cache in-memory + TTL, ex. 15 min); validar assinatura, `iss`, `aud`, `exp`/`nbf`; rejeitar `alg` none / algoritmos não acordados.

### 3.2 Verificação alternativa / fallback — **Introspecção** (se Hipótese B ou refresh revogado)

| Parâmetro | Nome sugerido (secrets Edge) |
|-----------|------------------------------|
| URL | `AUTH_CORE_INTROSPECT_URL` *(TBD)* |
| Credenciais | `AUTH_CORE_INTROSPECT_CLIENT_ID`, `AUTH_CORE_INTROSPECT_CLIENT_SECRET` |

**Comportamento:** enviar token; só prosseguir se `active === true` (RFC 7662).

**Decisão:** Auth Core confirma se introspecção devolve os mesmos campos que o JWT (secção 5) para FLEETOS.

---

## 4. Claims JWT obrigatórios e opcionais (proposta)

Estes nomes são **propostos** até Auth Core publicar o contract oficial. Usar **namespaces** (`https://codevertex.cc/claims/...`) se Auth Core já tiver padrão interno.

### 4.1 Obrigatórios (mínimo para qualquer caminho)

| Claim | Significado | Validação Edge |
|-------|-------------|----------------|
| `sub` | `codevertex_user_id` (UUID canónico) | UUID v4; regex FleetOS alinhada a `auth-core-jwt.ts` |
| `iss` | Issuer Auth Core | Igual a `AUTH_CORE_ISSUER` |
| `exp` | Expiração | `exp > now - skew` |
| `iat` | Emitido em | Opcional; anti-replay fraco |

### 4.2 Obrigatórios para **sync FLEETOS** (operacional)

| Claim / grupo | Significado | Validação Edge |
|-----------------|-------------|----------------|
| `aud` ou lista `aud` | Destinatário(s) do token | Contém `AUTH_CORE_AUDIENCE` ou valor acordado para FLEETOS |
| **Membership FLEETOS** | Ver secção 5 — **não** há padrão único até Auth Core fechar | Ver secção 5 |

### 4.3 Opcionais (úteis)

| Claim | Uso |
|-------|-----|
| `email`, `name`, `display_name` | Enriquecer `profiles` se colunas existirem |
| `jti` | Revogação / replay (se Auth Core suportar denylist) |

---

## 5. `tenant_id` e membership **active** — como verificar (proposta em dois níveis)

### 5.1 Nível 1 — **Entitlement no token / introspecção** (preferido)

Auth Core inclui, para a app `FLEETOS`, um dos seguintes (a **escolher e documentar uma**):

| Opção | Estrutura proposta | Regra Edge |
|-------|-------------------|------------|
| **5.1a** | Claim único `fleetos_membership_status` = `active` \| `pending` \| … | Sync só se valor normalizado === `active` |
| **5.1b** | Claim `memberships` = array JSON serializado no JWT (string) ou array nativo | Extrair item com `app_code === "FLEETOS"`; `status === "active"` |
| **5.1c** | Claim `https://codevertex.cc/fleetos` = objeto `{ status, tenant_id, role }` | Idem |

**`tenant_id` operacional (UUID):**

- Deve existir no objecto membership FLEETOS **após** verificação criptográfica.
- Deve existir linha em `public.tenants(id)` (query `service_role`); senão → **409** ou **422** (`tenant_not_found`).

**Alinhamento com consume actual:** o SPA já interpreta `memberships[]` com `app_code`, `status`, `tenant_id`, `role` (`auth.service.ts`). O ideal é o **JWT / introspecção espelhar exactamente** esses campos para o par FLEETOS, para não haver dois modelos mentais.

### 5.2 Nível 2 — **Re-fetch server-side** (opcional endurecimento)

Após JWT válido, o Edge chama API Auth Core (server-to-server, segundo segredo) tipo `GET /v1/users/{sub}/memberships?app=FLEETOS` *(URL TBD)*.

| Vantagem | Desvantagem |
|----------|----------------|
| Token mais leve | Mais latência, mais segredos, disponibilidade Auth Core |

**Decisão:** só se Auth Core **exigir** que entitlements não vivem no JWT.

---

## 6. Mapeamento de `role` → `tenant_users.role`

| Valor Auth Core (normalizado lower-case) | `tenant_users.role` |
|------------------------------------------|----------------------|
| `tenant_admin` | `tenant_admin` |
| `fleet_manager` | `fleet_manager` |
| `operations` | `operations` |
| `dispatcher` | `dispatcher` |
| `finance` | `finance` |
| `driver` | `driver` |
| `owner` | `owner` |
| `viewer` ou desconhecido | `viewer` |

Constraint SQL Phase 3: mesmo conjunto. Valores fora da lista → `viewer` + log (não falhar sync por role).

---

## 7. Secrets e variáveis de ambiente — Edge (Supabase)

| Nome | Obrigatório | Uso |
|------|-------------|-----|
| `SUPABASE_URL` | Sim (injectado Supabase) | Cliente service_role |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim (secret) | Escrita `profiles` / `tenant_users` |
| `AUTH_CORE_ISSUER` | Sim (secret ou env) | Validação `iss` |
| `AUTH_CORE_JWKS_URL` | Sim se JWT | Carregar chaves |
| `AUTH_CORE_AUDIENCE` | Sim se JWT | Validação `aud` |
| `AUTH_CORE_INTROSPECT_URL` | Se opaco | Introspecção |
| `AUTH_CORE_INTROSPECT_CLIENT_ID` | Se introspecção | |
| `AUTH_CORE_INTROSPECT_CLIENT_SECRET` | Se introspecção | |
| `FLEETOS_ALLOWED_ORIGINS` | Recomendado | Substituir CORS `*` (lista separada por vírgula) |

**Nunca** no frontend: `SERVICE_ROLE_KEY`, `INTROSPECT_CLIENT_SECRET`.

---

## 8. Respostas HTTP e modos de falha

### 8.1 Códigos propostos (`fleetos-sync-identity`)

| HTTP | `error` (sugestão) | Causa |
|------|-------------------|--------|
| 400 | `invalid_json` / `invalid_app_code` | Pedido mal formado |
| 401 | `missing_auth_core_token` | Sem `X-Auth-Core-Access-Token` |
| 401 | `invalid_token` | Assinatura inválida / token malformado |
| 401 | `token_expired` | `exp` passado (fora do skew) |
| 403 | `membership_not_active` | FLEETOS não `active` |
| 403 | `wrong_audience` | `aud` não contém audience esperado |
| 404 | `fleetos_membership_missing` | Sem membership FLEETOS no token/introspecção |
| 409 | `tenant_not_found` | `tenant_id` não existe em `public.tenants` |
| 422 | `invalid_tenant_id` | `tenant_id` ausente ou não UUID |
| 500 | `jwks_unavailable` | Falha rede/cache JWKS |
| 500 | `introspect_failed` | Auth Core introspect 4xx/5xx |
| 500 | `database_error` | Erro Supabase (mensagem genérica ao cliente) |

### 8.2 Comportamento seguro

| Situação | Acção |
|----------|--------|
| Qualquer falha de verificação | **Nenhuma** escrita na BD |
| Token válido mas membership não `active` | **Nenhuma** escrita; corpo JSON claro para o SPA alinhar com gates |

### 8.3 `fleetos-list-tenants`

- Mesma verificação de token que `fleetos-sync-identity` (função partilhada interna).
- Resposta: lista de tenants onde existe `tenant_users` para `(codevertex_user_id = sub, is_active = true)` **ou** política acordada se só JWT tiver um `tenant_id` (multi-tenant: Auth Core deve listar todos ou o Edge faz query por `sub`).

---

## 9. Escritas na BD após verificação (sem RLS novo)

Ordem sugerida (transacção única se Postgres permitir via RPC futura; até lá duas operações com rollback manual):

1. `UPDATE profiles SET codevertex_user_id = :sub WHERE ...` ou upsert conforme schema real (`user_id`, `email`, etc. — já documentado em Phase 5b reports).
2. `INSERT INTO tenant_users ... ON CONFLICT ... DO UPDATE` com `tenant_id`, `codevertex_user_id`, `role`, `is_active = true`.

**Idempotência:** mesmo pedido repetido não deve corromper dados; `ON CONFLICT` em `(tenant_id, codevertex_user_id)`.

---

## 10. Checklist de fecho com Auth Core (bloqueante para implementação)

- [ ] Formato do token pós-consume: **JWT** ou **opaco**?
- [ ] `AUTH_CORE_JWKS_URL` e algoritmo(s) suportados.
- [ ] `AUTH_CORE_ISSUER` e valor exacto de `iss` nos tokens.
- [ ] `AUTH_CORE_AUDIENCE` e valor exacto de `aud` (ou regra se múltiplos).
- [ ] Onde aparecem `FLEETOS` membership `status` e `tenant_id` (**claim names** ou campos introspecção).
- [ ] Valores normalizados de `status` (`active`, `pending`, …) alinhados ao FleetOS `membership-gate.ts`.
- [ ] Se multi-tenant: lista completa de `tenant_id` no token ou obrigatoriedade de query server-side Auth Core.
- [ ] Rate limits e comportamento 429 na introspecção / JWKS.
- [ ] Ambiente de staging com tokens de teste para o Edge.

---

## 11. Próximo passo após assinatura do contrato

1. Implementar módulo Deno partilhado `verifyAuthCoreToken(req) → { sub, fleetos, ... }`.
2. Substituir 501 em `fleetos-sync-identity` por fluxo verificado + `service_role`.
3. Implementar `fleetos-list-tenants` com a mesma verificação + query segura por `sub`.
4. Actualizar `fleetos-identity-sync.service.ts` para interpretar respostas 2xx e `TenantProvider` para dados reais (fase posterior no mesmo epic, se desejado).

---

**Documento:** proposta; valores `TBD` devem ser substituídos por valores Auth Core antes do merge da implementação Phase 6.
