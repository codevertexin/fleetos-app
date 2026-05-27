# FleetOS — Current implementation status

**Generated:** 2026-05-27  
**Repository:** `fleetos-app`  
**Purpose:** Snapshot of branch, phases, database, Auth Core, security, and recommended next work.  
**Note:** No implementation changes in this document; not committed with this file unless requested separately.

---

## Executive summary

FleetOS is a React/Vite/TypeScript frontend integrating with **CodeVertex Auth Core** and a **Supabase operational database** (dev project `kjiwzqysjassakvrojun`). The app supports SSO login, **FLEETOS membership gating** (approval_required), protected admin/ops/owner/driver routes, and a **public** customer booking portal (`/book/*`). Operational data in the UI remains **mock**; tenant RLS is **not** rewritten; Billing/Stripe are **out of scope**.

The latest committed work (**Phase 5b secure remediation**) removes unsafe anon-callable identity RPCs and replaces them with **Edge Function skeletons** that return **501** until Auth Core token verification is implemented server-side.

---

## Current branch

| Item | Value |
|------|--------|
| **Branch** | `feature/fleetos-supabase-phase3` |
| **Remote push** | Not performed for recent integration commits (per project policy) |
| **Working tree** | Clean except unrelated local changes: `public/favicon.ico` deleted, `public/favicon.svg` untracked, `supabase/.temp/` untracked |

---

## Recent commits (newest first)

| Commit | Message | Scope |
|--------|---------|--------|
| `91199ac` | `fix: secure FleetOS operational identity sync design` | Phase 5b secure remediation (Edge skeletons, safe migration, no anon RPC writes) |
| `081e66e` | `feat: integrate FleetOS Auth Core SSO and membership gate` | Phase 4 + Phase 5 (Auth Core prep, real/mock SSO consume, membership gate pages, `ProtectedRoute`) |
| `aa09947` | `feat: add FleetOS tenant layer schema migration` | Phase 3 SQL + docs + `supabase/config.toml` |
| `5ed43e8` | `feat: add FleetOS Auth Core and tenant session stubs` | Phase 2 (AuthProvider, TenantProvider, ProtectedRoute, SSO callback stub) |
| `d80f1f2` | `feat: integrate CodeVertex Core platform links (Phase 1)` | Platform links, service stubs, architecture docs |
| `5d99461` | `chore: prepare FleetOS frontend for Vercel deployment` | Deployment prep |
| `e1d64b5` | `UI completed` | Initial UI |

---

## Phases completed

| Phase | Status | Summary |
|-------|--------|---------|
| **1 — Platform links** | **Done** (committed) | CodeVertex URLs (auth, billing, help, legal), `platformLinks.ts`, integration docs |
| **2 — Auth + tenant session stubs** | **Done** (committed) | `AuthProvider`, `TenantProvider`, `ProtectedRoute`, `SsoCallback`, session types/storage |
| **3 — Tenant layer (SQL)** | **Done** (migration applied on dev DB) | `tenants`, `tenant_settings`, `tenant_users`, `profiles.codevertex_user_id`, nullable `tenant_id` backfill, helper functions |
| **4 — Auth Core registration prep** | **Done** (in `081e66e`) | Registration doc, app seed SQL, real/mock SSO consume routing, logout to Auth Core |
| **5 — SSO + membership gate** | **Done** (in `081e66e`) | Active/pending/suspended/revoked gates, `ProtectedRoute` requires active FLEETOS membership, `/book/*` public |
| **5b — Operational identity sync** | **Done (secure design)** (committed `91199ac`) | Edge skeletons, safe SQL DROP-only migration, client skips insecure paths; **no live DB sync yet** |
| **6 — Edge verification + operational sync** | **Not started** | JWKS/introspection, `service_role` upserts, real `TenantProvider` |
| **RLS rewrite** | **Deferred** | Company-scoped policies remain; tenant-aware RLS planned post-sync |
| **Operational data (Supabase queries)** | **Deferred** | Admin/ops UI still uses mock data |
| **Billing / Stripe** | **Out of scope** | Links only |

---

## Files changed by phase (committed)

### Phase 1 — `d80f1f2`

- `src/lib/platformLinks.ts`, `auth.service.ts`, `billing.service.ts`, `help.service.ts`, `legal.service.ts`
- `src/app/pages/auth/Login.tsx`, portal/settings pages (link integration)
- `docs/integration/FLEETOS_CORE_INTEGRATION_PHASE1_REPORT.md`, `FLEETOS_CORE_INTEGRATION_IMPLEMENTATION.md`
- `docs/architecture/`, `docs/database/`, `docs/decision/`
- `.env.example`, `src/vite-env.d.ts`

### Phase 2 — `5ed43e8`

- `src/types/session.ts`, `src/lib/session-storage.ts`
- `src/contexts/AuthProvider.tsx`, `src/contexts/TenantProvider.tsx`
- `src/components/auth/ProtectedRoute.tsx`, `RoleGuard.tsx`
- `src/app/pages/auth/SsoCallback.tsx`, `src/app/App.tsx`, `src/main.tsx`
- `docs/integration/FLEETOS_CORE_INTEGRATION_PHASE2_REPORT.md`

### Phase 3 — `aa09947`

- `supabase/migrations/20260524140000_phase3_tenant_layer.sql`
- `supabase/migrations/_validate_phase3_prereqs.sql` (validation helper, not auto-applied)
- `supabase/config.toml`
- `docs/database/FLEETOS_PHASE3_*.md`, `scripts/apply-phase3.ps1`
- `.env.example` (Supabase vars)

### Phase 4 + 5 — `081e66e`

- `docs/auth/FLEETOS_AUTH_CORE_REGISTRATION.md`, `FLEETOS_AUTH_CORE_APP_SEED.sql`
- `docs/platform/CODEVERTEX_AUTH_IMPLEMENTATION_STANDARD.md`
- `docs/integration/FLEETOS_AUTH_PHASE4_REPORT.md`, `FLEETOS_AUTH_PHASE5_REPORT.md`
- `src/lib/membership-gate.ts`, `src/lib/services/auth.service.ts` (consume real/mock, membership parse)
- `src/app/pages/auth/PendingApproval.tsx`, `AccessSuspended.tsx`, `AccessRevoked.tsx`
- `src/components/auth/MembershipGatePage.tsx`, `ProtectedRoute.tsx` (membership + `AuthenticatedGateRoute`)
- `src/app/App.tsx`, `SsoCallback.tsx`, `AuthProvider.tsx`, `session-storage.ts`, `types/session.ts`
- `.env.example` (`VITE_AUTH_SSO_CONSUME_URL`)

### Phase 5b secure — `91199ac`

- `supabase/migrations/20260527130000_phase5b_operational_identity_sync.sql` (DROP unsafe functions only)
- `supabase/functions/fleetos-sync-identity/index.ts`, `fleetos-list-tenants/index.ts`
- `supabase/config.toml` (`verify_jwt = false` for Edge functions)
- `src/lib/services/fleetos-identity-sync.service.ts`, `src/lib/auth-core-jwt.ts`
- `src/lib/services/supabase.service.ts` (`@supabase/supabase-js`)
- `src/contexts/TenantProvider.tsx`, `AuthProvider.tsx`, `SsoCallback.tsx`
- `docs/integration/FLEETOS_PHASE5B_*.md`
- `package.json` / `package-lock.json`, `eslint.config.js`, `.env.example`

---

## Supabase migrations

| File | In repo | Applied on dev (`kjiwzqysjassakvrojun`) | Notes |
|------|---------|-------------------------------------------|--------|
| `20260524140000_phase3_tenant_layer.sql` | Yes | **Yes** (manual SQL Editor, 2026-05-26) | 1 tenant, `profiles.codevertex_user_id` column, `tenant_id` backfill; `tenant_users` rows = **0** |
| `20260527130000_phase5b_operational_identity_sync.sql` | Yes | **Pending / optional** | Safe no-op on dev: only `DROP FUNCTION IF EXISTS` for functions that **do not exist** on dev (user-confirmed) |
| `_validate_phase3_prereqs.sql` | Yes | N/A | Diagnostic script for SQL Editor, not a migration |

### Existing `public.fleetos_*` functions on dev (confirmed)

- `fleetos_backfill_tenant_from_company`
- `fleetos_create_tenant_for_company`
- `fleetos_slugify`

### Functions that do **not** exist on dev (confirmed)

- `fleetos_sync_operational_identity_after_sso` (unsafe design — never applied)
- `fleetos_list_operational_tenants` (unsafe design — never applied)

### Edge Functions (in repo, deploy status)

| Function | Repo | Deployed / behaviour |
|----------|------|----------------------|
| `fleetos-sync-identity` | Yes | Skeleton — returns **501** until Auth Core verification |
| `fleetos-list-tenants` | Yes | Skeleton — returns **501** |

---

## Auth Core dependencies

### Completed (frontend + docs)

| Item | Evidence |
|------|----------|
| Platform login/register/logout URLs with `app=FLEETOS` | `src/lib/platformLinks.ts` |
| SSO callback route `/sso/callback` | `SsoCallback.tsx` |
| Consume routing: real when `VITE_AUTH_SSO_CONSUME_URL` set; dev mock in `DEV` only | `auth.service.ts` |
| FLEETOS membership status parsing + gate routes | `membership-gate.ts`, gate pages |
| `ProtectedRoute` requires auth + **active** membership | `ProtectedRoute.tsx` |
| Registration metadata + branding spec | `docs/auth/FLEETOS_AUTH_CORE_REGISTRATION.md` |
| Optional app seed SQL | `docs/auth/FLEETOS_AUTH_CORE_APP_SEED.sql` |
| Canonical standard reference | `docs/platform/CODEVERTEX_AUTH_IMPLEMENTATION_STANDARD.md` |

### Pending (product / backend)

| Item | Blocker / dependency |
|------|----------------------|
| `FLEETOS` app registered and approved in Auth Core (prod) | Product + Auth Core team |
| `VITE_AUTH_SSO_CONSUME_URL` in production env | Auth Core endpoint contract |
| Auth Core memberships include **UUID** `tenant_id` aligned with `public.tenants.id` | Data model agreement |
| JWT verification contract (JWKS URL, claims, introspection) | Phase 6 Edge implementation |
| Edge `fleetos-sync-identity` implemented (not 501) | Verification contract + `SUPABASE_SERVICE_ROLE_KEY` secret |
| Edge `fleetos-list-tenants` implemented | Same |
| Populate `profiles.codevertex_user_id` + `tenant_users` after verified SSO | Edge + successful sync |
| Supabase Auth bridge (optional) | Alternative to custom header verification |

---

## Security: blockers resolved

| Original issue | Resolution |
|----------------|------------|
| `GRANT EXECUTE TO anon` on `SECURITY DEFINER` sync RPC | **Removed** — functions not created; migration only DROP IF EXISTS |
| Arbitrary `p_codevertex_user_id` + `p_tenant_id` writes via anon | **Removed** — client does not call those RPCs |
| IDOR on `fleetos_list_operational_tenants(uuid)` | **Removed** — function not deployed |
| Insecure “success” without server verification | **Avoided** — Edge returns **501**, client skips sync on 501/error |

See `docs/integration/FLEETOS_PHASE5B_SECURITY_REVIEW.md` (post-remediation: **WARNING**, not **BLOCKER** for commit).

---

## Current remaining blockers / warnings

| Priority | Item | Type |
|----------|------|------|
| **High** | Auth Core token verification not implemented in Edge | Functional blocker for DB sync |
| **High** | `tenant_users` empty; no operational identity link after SSO | Data / sync |
| **High** | `TenantProvider` uses **mock** tenant only | Functional |
| **Medium** | Tenant RLS still company-scoped | Security / multi-tenant |
| **Medium** | Operational UI still mock data | Functional |
| **Medium** | CORS `*` on Edge functions | Security hardening |
| **Medium** | JWT in browser: decode only, no signature verify (low risk vs removed RPC) | Security warning |
| **Low** | `docs/plataform/` duplicate path may still exist alongside `docs/platform/` | Repo hygiene |
| **Low** | Favicon change uncommitted (`favicon.ico` / `favicon.svg`) | Unrelated local |
| **Out of scope** | Billing, Stripe, production Supabase apply without approval | Policy |

---

## What is safe now

- SSO + membership gate in the SPA (identity ≠ operational access).
- Production build does **not** use dev SSO mock (`import.meta.env.PROD`).
- No anon-callable Postgres path to write `tenant_users`.
- Phase 3 tenant schema on **dev** only (per applied report).
- Public routes: `/login`, `/sso/callback`, gate pages, `/book/:companySlug/*`.

---

## What is not live yet

- Real `profiles` / `tenant_users` upsert after login.
- Real tenant list in `TenantProvider`.
- Supabase-backed admin/ops/driver/owner data.
- Tenant-aware RLS enforcement.
- Production Auth Core consume URL in deployed env (unless configured per environment).

---

## Environment (reference)

| Variable | Purpose |
|----------|---------|
| `VITE_APP_CODE` | `FLEETOS` |
| `VITE_AUTH_BASE_URL` | Auth Core |
| `VITE_AUTH_SSO_CONSUME_URL` | Real SSO consume (optional in dev) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Operational DB + Edge gateway |
| `VITE_FLEETOS_SYNC_IDENTITY_URL` | Optional override for sync Edge URL |
| `VITE_FLEETOS_DEV_MOCK_TENANT_ID` | Dev mock only (membership `tenant_id` UUID) |

Dev Supabase project ref: **`kjiwzqysjassakvrojun`** (from `supabase/config.toml` and Phase 3 applied report).

---

## Next recommended phase: **Phase 6 — Edge-verified operational identity**

Recommended sequence:

1. **Agree Auth Core verification contract** with Auth Core team (JWKS and/or introspection; claims: `sub`, FLEETOS membership, `tenant_id`, `active`).
2. **Implement `fleetos-sync-identity`** Edge handler: verify token → derive ids server-side → `service_role` upsert `profiles.codevertex_user_id` + `tenant_users`.
3. **Implement `fleetos-list-tenants`**: return only tenants for verified `codevertex_user_id`; wire `TenantProvider` (multi-tenant selector when count > 1).
4. **Deploy Edge** to dev project; set secrets (`SUPABASE_SERVICE_ROLE_KEY`, Auth Core client secrets if needed).
5. **Optionally apply** `20260527130000_phase5b_operational_identity_sync.sql` on any DB that ever had unsafe functions (idempotent DROP).
6. **Phase 6b / 7:** Begin tenant-scoped RLS policies alongside validation; replace mock operational queries incrementally (still no Billing unless scoped).

---

## Related documentation index

| Document | Topic |
|----------|--------|
| `docs/integration/FLEETOS_CORE_INTEGRATION_PHASE1_REPORT.md` | Phase 1 |
| `docs/integration/FLEETOS_CORE_INTEGRATION_PHASE2_REPORT.md` | Phase 2 |
| `docs/database/FLEETOS_PHASE3_APPLIED_REPORT.md` | Phase 3 applied validation |
| `docs/integration/FLEETOS_AUTH_PHASE4_REPORT.md` | Phase 4 |
| `docs/integration/FLEETOS_AUTH_PHASE5_REPORT.md` | Phase 5 |
| `docs/integration/FLEETOS_PHASE5B_REPORT.md` | Phase 5b |
| `docs/integration/FLEETOS_PHASE5B_SECURE_DESIGN.md` | Secure Edge architecture |
| `docs/integration/FLEETOS_PHASE5B_SECURITY_REVIEW.md` | Security review |
| `docs/auth/FLEETOS_AUTH_CORE_REGISTRATION.md` | Auth Core app registration |
| `PRODUCTION_READINESS_REPORT.md` | Frontend production readiness (separate track) |

---

## Status verdict (for planning)

| Area | Verdict |
|------|---------|
| **Frontend auth + gates** | **PASS** for dev/staging UX |
| **Phase 3 database (dev)** | **PASS** (applied) |
| **Phase 5b security remediation** | **PASS** (committed; unsafe RPCs never on dev) |
| **Operational identity sync** | **BLOCKED** until Phase 6 Edge |
| **Production-ready multi-tenant ops** | **BLOCKED** (RLS + data + sync) |
