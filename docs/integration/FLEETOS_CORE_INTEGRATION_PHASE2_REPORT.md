# FleetOS — CodeVertex Core Integration (Phase 2 Report)

**Branch:** `feature/fleetos-auth-tenant-phase2`  
**Date:** 2026-05-24  
**Scope:** Auth + tenant session architecture stubs (no Supabase, no real Billing/Stripe)

---

## Summary

Phase 2 prepares FleetOS for CodeVertex Auth Core SSO and multi-tenant sessions. Mock fleet data is unchanged. Local sign-in redirects to Auth Core; dev SSO is simulated via `/sso/callback?ticket=...`.

---

## Files added

| File | Purpose |
|------|---------|
| `src/types/session.ts` | `FleetosRole`, `SessionUser`, `FleetosTenant`, `AuthSession` |
| `src/lib/session-storage.ts` | `fleetos-session` / `fleetos-tenant-id` persistence helpers |
| `src/contexts/AuthProvider.tsx` | Session context: `user`, `codevertexUserId`, `login`, `logout`, `completeSsoLogin` |
| `src/contexts/TenantProvider.tsx` | Tenant stub: `currentTenant`, `switchTenant`, branding |
| `src/components/auth/ProtectedRoute.tsx` | Redirects unauthenticated users to `/login` |
| `src/components/auth/RoleGuard.tsx` | Role-based render guard (stub, ready to wrap routes) |
| `src/app/pages/auth/SsoCallback.tsx` | `/sso/callback` — ticket consume + session store |

## Files updated

| File | Change |
|------|--------|
| `src/main.tsx` | Provider order: `AuthProvider` → `TenantProvider` → `BrowserRouter` |
| `src/lib/services/auth.service.ts` | `consumeSsoTicket()` stub |
| `src/app/App.tsx` | Protected admin/ops/owner/driver routes; public `/book/*` |
| `src/app/pages/auth/Login.tsx` | Redirect via `login()` → `getLoginUrl()` (no local password auth) |
| `src/components/layout/AdminLayout.tsx` | Session user display + `logout()` |

---

## Auth flow (stub)

1. User clicks **Sign in with CodeVertex** → `window.location` = `getLoginUrl()` (return URL = `/sso/callback`).
2. **Local dev:** open `/sso/callback?ticket=dev-mock` (any ticket string works with stub).
3. `SsoCallback` calls `consumeSsoTicket({ app_code: FLEETOS, ticket })`.
4. Double-consume guard: `sessionStorage` keys `fleetos-sso-processing:*` and `fleetos-sso-consumed:*`.
5. `completeSsoLogin()` writes `fleetos-session` + redirects to `/dashboard`.

### Session shape (`localStorage`)

```json
{
  "codevertexUserId": "cv-u1",
  "user": { "id", "codevertexUserId", "name", "email", "role", "companyId" },
  "token": "mock-sso-token-...",
  "expiresAt": "...",
  "roles": ["tenant_admin", "fleet_manager"]
}
```

---

## Route protection

| Access | Routes |
|--------|--------|
| **Public** | `/login`, `/forgot-password`, `/sso/callback`, `/book/:companySlug/*` |
| **Protected** | All admin (`/dashboard` … `/settings`), `/operations/*`, `/owner/*`, `/driver/*` |

Unauthenticated access to protected routes → `/login`.

---

## Tenant stub

- Mock tenants: `t1` (demo-company), `t2` (lisbon-mobility).
- `switchTenant(id)` updates override + `fleetos-tenant-id` in `localStorage`.
- `tenantSlug` / `tenantBranding` exposed via `useTenant()`.
- No Supabase tenant resolution yet.

---

## RoleGuard

Supported roles (type `FleetosRole`):

`tenant_admin`, `fleet_manager`, `operations`, `dispatcher`, `finance`, `driver`, `owner`, `viewer`

Component is exported; wrap sensitive UI in Phase 3+ (e.g. Finance with `allowedRoles={['finance', 'tenant_admin']}`).

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** |
| `npm run lint` | **PASS** (0 errors, 35 warnings — pre-existing unused imports) |
| Mock data pages | **Unchanged** — still read `mock-data.ts` |
| Supabase | **Not connected** |
| Billing / Stripe | **Not connected** |

---

## Local testing (development builds only)

Mock SSO is **disabled when `import.meta.env.PROD` is true** — production builds cannot complete stub ticket consumption.

1. `npm run dev`
2. Visit `/login` → **Sign in with CodeVertex** (redirects to Auth Core in production).
3. For local session: visit `http://localhost:5173/sso/callback?ticket=dev-mock`
4. Open `/dashboard` — should load admin UI with stub session user from `auth.service.ts`.
5. Sign out from sidebar → returns to `/login`.
6. Visit `/book/demo-company` without session — should remain public.

### String audit note

| String | Locations |
|--------|-----------|
| `cv-u1`, `mock-sso-token` | `auth.service.ts` stub only (+ this report) |
| `dev-mock` | This report only (example ticket) |
| `Carlos Mendes` | `auth.service.ts` stub + pre-existing `mock-data.ts` / settings UI (not SSO-specific) |

---

## Next recommended phase (Phase 3)

1. Real Auth Core `consumeSsoTicket` HTTP call.
2. `ProtectedRoute` + redirect authenticated users away from `/login`.
3. Wire `RoleGuard` on finance/settings where needed.
4. Supabase client + `profiles.codevertex_user_id` upsert.
5. `tenant_users` resolution replacing mock tenants.
6. Progressive replacement of `mock-data.ts` (dashboard → vehicles → drivers).

**Do not** add Stripe or parallel auth in Phase 3.
