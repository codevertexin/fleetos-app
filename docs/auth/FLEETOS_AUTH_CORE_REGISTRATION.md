# FleetOS — Auth Core app registration

**Status:** Registration specification (Phase 4)  
**Target:** CodeVertex Auth Core (`auth.codevertex.cc`)  
**Operational Supabase:** independent FleetOS project (Phase 3 applied)

---

## Purpose

Register FleetOS as a first-class CodeVertex ecosystem application so Auth Core screens show **FleetOS branding** (logo, colors, name, tagline) and SSO returns safely to FleetOS.

FleetOS must **not** implement local password authentication. All identity flows go through Auth Core.

---

## Required app registry metadata

| Field | Value |
|-------|--------|
| `app_code` | `FLEETOS` |
| `ecosystem_code` | `codevertex` |
| `brand_name` | `FleetOS` |
| `display_name` | `FleetOS` |
| `tagline` | `Fleet management operating system` |
| `category` | `business` |
| `profile_mode` | `business` |
| `requires_profile` | `true` |
| `status` | `active` |
| `base_url` | `https://fleetos.codevertex.cc` |
| `sso_callback_url` | `https://fleetos.codevertex.cc/sso/callback` |
| `return_url` | `https://fleetos.codevertex.cc` |

### Allowed return URLs

Must be allowlisted in Auth Core (no wildcards in production):

- `http://localhost:5173/sso/callback`
- `http://localhost:5174/sso/callback`
- `https://fleetos.codevertex.cc/sso/callback`

**Local dev note:** Vite in this repo defaults to port `4200`. Add `http://localhost:4200/sso/callback` to the allowlist while developing if you use the default dev server port.

### Branding (Auth Core `apps.metadata` or equivalent)

| Key | Value | Notes |
|-----|--------|--------|
| `brand_name` | `FleetOS` | Shown on Auth screens |
| `logo_url` | `https://fleetos.codevertex.cc/logo.png` | FleetOS logo asset |
| `favicon_url` | `https://fleetos.codevertex.cc/favicon.ico` | Browser tab on Auth host |
| `primary_color` | `#00B39A` | FleetOS teal/cyan (UI primary) |
| `secondary_color` | `#0D2535` | FleetOS dark navy / petrol sidebar tone |
| `accent_color` | `#00B39A` | Alias for primary (legacy Auth metadata) |
| `tagline` | `Fleet management operating system` | Subtitle on login/register |
| `return_url` | `https://fleetos.codevertex.cc` | Default post-auth landing |
| `allowed_return_urls` | see list above | SSO + safe redirects |

Palette reference (from FleetOS frontend):

- Primary teal: `#00B39A` (hover `#009B85`)
- Dark navy: `#0D2535`

---

## Auth screens — FleetOS-branded requirements

Auth Core must render FleetOS identity on:

| Screen | FleetOS requirements |
|--------|----------------------|
| **Login** | FleetOS logo, brand name, tagline, primary/secondary colors; copy e.g. “Sign in to FleetOS” |
| **Register** | Same branding; business profile mode |
| **Forgot password** | FleetOS logo + colors |
| **Reset password** | FleetOS logo + colors |
| **Logout return** | Redirect to FleetOS login (`/login`) after Auth Core session ends |
| **Profile** | `app=FLEETOS`; account managed in Auth Core |
| **Security** | `app=FLEETOS`; sessions/devices in Auth Core |

**Footer (all Auth screens):** subtle line — *Protected account access by CodeVertex*

Auth Core must **not** show generic “CodeVertex” as the product name on FleetOS flows (per `CODEVERTEX_AUTH_IMPLEMENTATION_STANDARD.md`).

---

## URL contracts (FleetOS frontend)

FleetOS builds links via `src/lib/platformLinks.ts`:

| Flow | URL pattern |
|------|-------------|
| Login | `{AUTH_BASE_URL}/auth/login?app=FLEETOS&return_url={sso_callback}` |
| Register | `{AUTH_BASE_URL}/auth/register?app=FLEETOS&return_url={sso_callback}` |
| Forgot password | `{AUTH_BASE_URL}/auth/forgot-password?app=FLEETOS&return_url={sso_callback}` |
| Reset password | `{AUTH_BASE_URL}/auth/reset-password?app=FLEETOS` (+ token from email) |
| Profile | `{AUTH_BASE_URL}/account/profile?app=FLEETOS` |
| Security | `{AUTH_BASE_URL}/account/security?app=FLEETOS` |
| Logout | `{AUTH_BASE_URL}/logout?app=FLEETOS&return_url={app_base}/login` |

`sso_callback` default: `{APP_BASE_URL}/sso/callback`

---

## SSO flow (after registration)

```txt
FleetOS /login
  → Auth Core login (app=FLEETOS)
  → redirect /sso/callback?ticket=...
  → FleetOS consumeSsoTicket (real endpoint in production)
  → map codevertex_user_id → local session
  → redirect /dashboard (or safe return_to)
```

FleetOS Phase 3 already provides `profiles.codevertex_user_id` and tenant helpers for post-SSO mapping (RLS rewrite deferred).

---

## Registration checklist (Auth Core operator)

1. Create or upsert app `FLEETOS` in Auth Core registry (`public.apps` or confirmed table name).
2. Set metadata JSON (branding block above).
3. Allowlist return URLs (including local dev ports in use).
4. Confirm SSO ticket create/consume functions are enabled for `FLEETOS`.
5. Smoke-test login → callback → FleetOS session.
6. Smoke-test logout → return to `https://fleetos.codevertex.cc/login`.

---

## Related files

- `docs/auth/FLEETOS_AUTH_CORE_APP_SEED.sql` — optional idempotent seed (verify schema first)
- `docs/integration/FLEETOS_AUTH_PHASE4_REPORT.md` — implementation status
- `docs/platform/CODEVERTEX_AUTH_IMPLEMENTATION_STANDARD.md` — ecosystem standard
- `docs/integration/FLEETOS_CORE_INTEGRATION_IMPLEMENTATION.md` — full integration guide
