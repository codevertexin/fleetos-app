# FleetOS Phase 5b — Security Review (SQL/RPC + client bridge)

**Data:** 2026-05-27  
**Âmbito:** `20260527130000_phase5b_operational_identity_sync.sql`, `fleetos-identity-sync.service.ts`, `supabase.service.ts`, `TenantProvider.tsx`, `SsoCallback.tsx`, `auth-core-jwt.ts` (referência JWT).  
**Pedido:** não aplicar migração automaticamente; não commit até correções acordadas.

> **Actualização (remediação Edge):** O desenho anon + `SECURITY DEFINER` descrito nas secções 1–2 foi **removido** do código. Ver **«Estado após remediação»** mais abaixo. As secções históricas mantêm-se como registo do problema original.

---

## Estado após remediação (2026-05-27)

| Veredito | **WARNING** (aceitável para commit **sem** deploy de Edge com lógica final, desde que a migração `DROP` seja aplicada em bases que tinham RPCs inseguros) |
|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Resolvido (BLOCKER anterior)** | Sem `GRANT … TO anon` para escrita em `tenant_users` via RPC; funções inseguras **removidas** pela migração (ou nunca criadas). Cliente **não** invoca RPCs de sync/list com UUID arbitrário. |
| **Edge** | `fleetos-sync-identity` / `fleetos-list-tenants` devolvem **501** até verificação Auth Core — **sem sucesso inseguro**. |
| **Migração `20260527130000…`** | **Segura para aplicar:** apenas `DROP FUNCTION IF EXISTS` das duas funções (idempotente). |
| **Pendente (WARNING)** | CORS `*` nas Edge; JWT do consume no browser continua **sem** verificação de assinatura no cliente (risco menor vs RPC anon); sync/BD real **bloqueado** até implementação no Edge. |

---

## Veredito global (histórico — desenho com RPC anon)

| Resultado | Justificação breve |
|-----------|---------------------|
| **BLOCKER** | Os RPCs `SECURITY DEFINER` com `GRANT EXECUTE … TO anon` aceitam **qualquer** `p_codevertex_user_id` e `p_tenant_id` válidos **sem prova no servidor** de membership Auth Core nem de posse do token. Isto permite **criação / upsert arbitrário de `tenant_users`** e **enumeração de tenants** por UUID. Isto **não** é aceitável em produção na forma actual. |

**Nota:** Este desenho foi **removido** do código (ver «Estado após remediação»). Mantido como registo de auditoria.

---

## 1. `fleetos_sync_operational_identity_after_sso` — criação arbitrária de `tenant_users`

### 1.1 Membership “active” só no cliente

| Aspeto | Estado | Notas |
|--------|--------|--------|
| RPC valida estado SSO / membership | **Não** | A função SQL **não** recebe `membership_status` nem valida entitlements. **Qualquer** chamador com permissão de executar a função pode passar `p_tenant_id` existente. |
| Cliente (`fleetos-identity-sync.service.ts`) só chama se `result.fleetosMembershipStatus === 'active'` | **Sim** | Linhas 44–46 — correcto **apenas** na app; **não replicado na BD**. |

**Conclusão:** **BLOCKER** — o limite “só quando active” **não** está garantido na camada SQL.

### 1.2 `codevertex_user_id` “confiável”

| Aspeto | Estado | Notas |
|--------|--------|--------|
| Cliente usa `resolveVerifiedCodevertexUserId` (JWT `sub` alinhado com `profile.id`, ou dev mock) | **Parcial** | Não há **verificação de assinatura** do JWT no browser (apenas decode + igualdade `sub`/`profile.id`). Para o **RPC**, isto é irrelevante: um atacante **não** precisa do JWT para chamar o RPC directamente. |

**Conclusão:** **WARNING** (JWT no cliente) + **BLOCKER** (RPC ignora origem do id).

### 1.3 `p_tenant_id` vindo do frontend — é seguro?

| Aspeto | Estado | Notas |
|--------|--------|--------|
| Origem do valor | Resposta do **consume** (`membership.tenant_id`), não query string manual na rota SSO | Reduz risco de “utilizador legítimo” colar um tenant errado no fluxo normal. |
| Segurança real | **Não seguro na BD** | O RPC **aceita qualquer** `p_tenant_id` que exista em `public.tenants`. Um cliente malicioso com **anon key** (sempre pública no bundle Vite) pode invocar o RPC e **associar-se** (ou associar um UUID escolhido) a **qualquer tenant** com upsert em `tenant_users`. A única barreira actual é `IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id)` — ou seja, **basta o tenant existir**. |

**Conclusão:** **BLOCKER** — `p_tenant_id` **não** é de confiança só porque o frontend o escolhe bem; a superfície **anon + SECURITY DEFINER** torna-o **não confiável**.

### 1.4 “Não permitir criação arbitrária”

| Requisito | Cumprimento |
|-----------|-------------|
| Impedir criação arbitrária só com políticas actuais | **Não cumprido** |

---

## 2. `GRANT` a `anon` / `authenticated`

| Função | Grant actual | Avaliação |
|--------|--------------|-----------|
| `fleetos_sync_operational_identity_after_sso` | `anon`, `authenticated`, `service_role` | **BLOCKER** para `anon`. Sem sessão Supabase Auth, o browser **só** usa `anon` — daí o grant ter sido posto; **porém** expõe escrita privilegiada a qualquer um com a anon key. **Preferido:** **não** conceder a `anon`; usar Edge Function + `service_role` **ou** Supabase Auth + RPC com `auth.uid()` e prova de ligação a CodeVertex. |
| `fleetos_list_operational_tenants` | `anon`, `authenticated`, `service_role` | **BLOCKER** / **WARNING** grave: qualquer um pode listar tenants para **qualquer** `p_codevertex_user_id` (IDOR). **Preferido:** `authenticated` **e** `auth.uid()` mapeado para `codevertex_user_id`, **ou** Edge com token verificado. |

### Porque ainda não há Supabase Auth

O fluxo Phase 5b usa **CodeVertex SSO** + token na `localStorage`; **não** há `supabase.auth.signIn` com JWT Supabase, logo `request.jwt.claim.sub` no Postgres **não** identifica o utilizador FleetOS. Por isso a app recorreu a RPC + anon.

**Documentação (Phase 6):** migrar sync para **Supabase Edge Function** que:

1. Recebe o **Bearer** do Auth Core (ou ticket one-shot).
2. Valida com Auth Core (JWKS / introspecção).
3. Lê `tenant_id` / membership de **resposta confiável** ou tabela `auth_core_memberships_cache` escrita só pelo backend.
4. Usa `service_role` para `upsert` em `profiles` / `tenant_users`.

Até lá: **não** tratar o desenho actual como seguro para Internet pública.

---

## 3. Comportamento em produção (cliente)

| Verificação | Estado | Evidência |
|-------------|--------|-----------|
| Mock JWT / path “sem `sub`” em **produção** | **Aceitável com ressalvas** | `resolveVerifiedCodevertexUserId`: fora de `import.meta.env.DEV`, sem payload JWT válido com `sub` → **throw** (linhas 63–67). **Ressalva:** JWT **forjado** (três segmentos, payload falso) **não** é verificado criptograficamente — só decode + match `sub`/`profile.id`; o ataque realista hoje é **RPC directo**, não o JWT. |
| `VITE_FLEETOS_DEV_MOCK_TENANT_ID` só em DEV | **Em geral sim** | Só é lido dentro de `consumeSsoTicketDevMock`, que **falha em `PROD`** (`auth.service.ts`). Em build de produção, o mock **não** é invocado pelo fluxo normal. **Ressalva:** a variável pode existir no bundle; o código que a usa não corre em prod com o fluxo actual. |
| Sync ignorado se membership não `active` | **Sim** (cliente) | `fleetos-identity-sync.service.ts` (sync Edge só corre quando `result.fleetosMembershipStatus === 'active'`). |
| `tenant_id` inválido (não UUID) ignorado | **N/A (Edge)** | O cliente **já não** envia `tenant_id` ao Edge no body; o RPC inseguro foi removido. |

**Conclusão secção 3:** **WARNING** (falta verificação criptográfica JWT no cliente). O vector **RPC anon** descrito nas secções 1–2 foi **eliminado** na remediação Edge.

---

## 4. Resolução de tenant (`TenantProvider`) — contexto histórico

| Verificação | Estado | Notas |
|-------------|--------|--------|
| Múltiplos tenants — não escolher “silenciosamente” o errado | **WARNING** (histórico) | Versão antiga com list RPC + `resolveTenantId` podia cair em `tenants[0]`. |
| Fallback “single tenant” só em dev | **WARNING** (histórico) | A função SQL `fleetos_list_operational_tenants` tinha fallback global. **Removida.** |

**Código actual:** mock **único** tenant; sem list RPC; com vários tenants no array, `resolveTenantId` **não** escolhe o primeiro sem match explícito (`TenantProvider.tsx`).

---

## 5. Aplicar migração?

**Migração actual (`DROP FUNCTION IF EXISTS` apenas):** **Segura para aplicar** — remove funções inseguras se existirem; não cria grants anon de escrita.

**Aplicar automaticamente:** continua desaconselhado em CI sem revisão; usar fluxo normal do projecto (CLI / SQL Editor) quando aprovado.

---

## Tabela resumo (histórico — anon RPC)

| ID | Tópico | Resultado |
|----|--------|-----------|
| 1.1 | RPC reforça membership `active` | **BLOCKER** |
| 1.2 | Id CodeVertex só de origem “confiável” no servidor | **BLOCKER** (RPC) / **WARNING** (JWT só decode no cliente) |
| 1.3 | `p_tenant_id` não confiável com anon | **BLOCKER** |
| 2 | `GRANT` a `anon` em sync + list | **BLOCKER** (sync); **BLOCKER**/WARNING (list IDOR) |
| 3 | Produção: mock JWT / env dev / skip sync / UUID | **PASS** com **WARNING** em assinatura JWT |
| 4 | Multi-tenant + fallback single tenant | **WARNING** |
| 5 | Aplicar migração auto | **N/A** (não feito) |

---

## Correcções (prioridade) — estado de implementação

1. ~~Remover `GRANT … TO anon` / RPC inseguros~~ → **Feito** (DROP na migração; Edge skeleton).
2. ~~Edge + service_role~~ → **Parcial** (funções criadas; lógica 501 até contrato Auth Core).
3. **[WARNING]** JWT: validar na **Edge** (Phase 6).
4. ~~List RPC IDOR~~ → **Feito** (função removida).
5. ~~Fallback single-tenant SQL~~ → **Feito** (função removida).
6. ~~`TenantProvider` `tenants[0]`~~ → **Feito** (regras + mock único).

---

## Nota sobre commit

O **BLOCKER** original foi **mitigado**. O commit da Phase 5b com esta remediação é **aceitável** com consciência dos **WARNING** restantes (CORS `*`, ausência de sync real até Auth Core no Edge).

---

## Registo histórico (análise detalhada — RPC anon)

As secções 1–3 abaixo descrevem o problema na versão **com** RPC `anon`. **Não** descrevem o código actual após a remediação.
