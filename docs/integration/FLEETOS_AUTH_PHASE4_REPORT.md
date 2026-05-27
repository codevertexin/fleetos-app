# FleetOS — Auth Core Phase 4 Report

**Date:** 2026-05-27  
**Branch:** `feature/fleetos-supabase-phase3` (Phase 4 auth prep, uncommitted)  
**Scope:** Auth Core registration docs, SSO service boundary, platform links, logout flow  
**Out of scope:** Billing, Stripe, RLS rewrite, mock operational data replacement, production DB changes

---

## Summary

Phase 4 prepares FleetOS for **real CodeVertex Auth Core** integration and FleetOS-branded authentication screens. No Billing implementation. No commit until product owner approval.

---

## Files changed / added

| File | Change |
|------|--------|
| `docs/auth/FLEETOS_AUTH_CORE_REGISTRATION.md` | **New** — Auth Core app metadata, branding, screens, URL contracts |
| `docs/auth/FLEETOS_AUTH_CORE_APP_SEED.sql` | **New** — optional idempotent seed for `public.apps` (guarded) |
| `docs/integration/FLEETOS_AUTH_PHASE4_REPORT.md` | **New** — this report |
| `src/lib/platformLinks.ts` | `getLogoutUrl`, `getForgotPasswordUrl`, `getResetPasswordUrl`, `getAppLoginUrl`; SSO `return_url` defaults |
| `src/lib/services/auth.service.ts` | `consumeSsoTicketReal`, `consumeSsoTicketDevMock`, `AuthCoreError`, routing rules |
| `src/contexts/AuthProvider.tsx` | Logout clears session → Auth Core logout redirect |
| `src/components/layout/AdminLayout.tsx` | Sign-out uses Auth Core logout (no local-only redirect) |
| `src/app/pages/auth/SsoCallback.tsx` | User-safe `AuthCoreError` messages |
| `.env.example` | Documented `VITE_AUTH_SSO_CONSUME_URL` |

---

## Auth Core metadata required

Register `FLEETOS` in Auth Core with:

| Field | Value |
|-------|--------|
| `app_code` | `FLEETOS` |
| `ecosystem_code` | `codevertex` |
| `brand_name` / `display_name` | `FleetOS` |
| `tagline` | `Fleet management operating system` |
| `category` | `business` |
| `profile_mode` | `business` |
| `requires_profile` | `true` |
| `base_url` | `https://fleetos.codevertex.cc` |
| `sso_callback_url` | `https://fleetos.codevertex.cc/sso/callback` |
| `return_url` | `https://fleetos.codevertex.cc` |

**Branding:** primary `#00B39A`, secondary `#0D2535`, logo/favicon on `fleetos.codevertex.cc`.

**Allowed return URLs:** `localhost:5173`, `5174`, `4200` (dev), and production callback.

Full detail: `docs/auth/FLEETOS_AUTH_CORE_REGISTRATION.md`.

---

## Branding requirements

Auth Core screens must show FleetOS logo, name, tagline, and colors on:

- login, register, forgot password, reset password, logout return, profile, security

Footer on all Auth screens: *Protected account access by CodeVertex*.

---

## Logout flow

1. User triggers logout in FleetOS.
2. `AuthProvider` clears `fleetos-session`, `fleetos-token`, and React session state.
3. Browser redirects to:

```txt
https://auth.codevertex.cc/logout?app=FLEETOS&return_url={APP_BASE_URL}/login
```

Production default return: `https://fleetos.codevertex.cc/login`.

Implemented via `getLogoutUrl()` in `platformLinks.ts`.

---

## SSO consume boundary

| Function | When |
|----------|------|
| `consumeSsoTicket()` | Router: **production** → real; **development** → mock |
| `consumeSsoTicketReal()` | `POST` to `VITE_AUTH_SSO_CONSUME_URL` (required in prod) |
| `consumeSsoTicketDevMock()` | **Only** `import.meta.env.DEV`; blocked in prod builds |

**Production rules:**

- Mock SSO is never used.
- Missing `VITE_AUTH_SSO_CONSUME_URL` → user-safe error (no stack traces to UI).
- HTTP/parse failures → `AuthCoreError` with safe message.

**Development:** mock ticket flow unchanged (`/sso/callback?ticket=...`).

---

## Remaining blockers for real Auth Core

| Blocker | Owner |
|---------|--------|
| Register `FLEETOS` in Auth Core (`docs/auth/FLEETOS_AUTH_CORE_REGISTRATION.md`) | Platform / Auth team |
| Run optional seed on Auth Core DB after schema confirm (`FLEETOS_AUTH_CORE_APP_SEED.sql`) | Platform |
| Confirm official **SSO consume** URL and response JSON contract | Auth team |
| Set `VITE_AUTH_SSO_CONSUME_URL` in production env | FleetOS deploy |
| Upsert `profiles.codevertex_user_id` on SSO (Supabase client) | FleetOS Phase 4b |
| Map SSO memberships → `tenant_users` | FleetOS Phase 4b |
| RLS tenant policies | Phase 4+ (explicitly deferred) |

Default assumed consume path (document only): `/api/sso/consume` on `auth.codevertex.cc`.

---

## Next step after registration

1. Auth operator registers `FLEETOS` and verifies branded login/register.
2. Set production `VITE_AUTH_SSO_CONSUME_URL`.
3. Test full loop: login → ticket → `/sso/callback` → `consumeSsoTicketReal` → dashboard.
4. Test logout → Auth Core → return to FleetOS `/login`.
5. Wire Supabase profile upsert with `codevertex_user_id` (no mock operational data swap yet).
6. Phase 4b: tenant RLS + `tenant_users` membership sync.

---

## Build / lint

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** |
| `npm run lint` | **PASS** (0 errors, pre-existing warnings only) |

---

## Rules compliance

| Rule | Status |
|------|--------|
| No Billing / Stripe | **Yes** |
| No RLS rewrite | **Yes** |
| No mock operational data replacement | **Yes** |
| No push | **Yes** |
| No production data modification | **Yes** |
| No commit until approved | **Yes** |
