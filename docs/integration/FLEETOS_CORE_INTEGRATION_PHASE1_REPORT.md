# FleetOS — CodeVertex Core Integration (Phase 1 Report)

**Date:** 2026-05-24  
**Scope:** Platform links only — no real auth, no Supabase, mock data unchanged

---

## Files changed

| File | Change |
|------|--------|
| `.env.example` | CodeVertex Core env vars (`VITE_APP_CODE`, bases, Supabase placeholders) |
| `src/vite-env.d.ts` | **New** — TypeScript types for `import.meta.env` |
| `src/lib/platformLinks.ts` | **New** — `getLoginUrl`, `getRegisterUrl`, `getAccountUrl`, `getSecurityUrl`, `getBillingUrl`, `getHelpUrl`, `getLegalUrl`, `getHelpScreenFromPath` |
| `src/lib/services/auth.service.ts` | Re-exports platform auth URLs |
| `src/lib/services/billing.service.ts` | Portal URL via `getBillingUrl()` |
| `src/lib/services/help.service.ts` | Contextual help URLs via `getHelpUrl(screen)` |
| `src/lib/services/legal.service.ts` | Legal URLs via `getLegalUrl()`; legacy key mapping kept |
| `src/components/layout/AdminLayout.tsx` | Contextual Help icon (route → screen) |
| `src/features/settings/SecurityPanel.tsx` | Account / Security / Billing links to Core |
| `src/app/pages/auth/Login.tsx` | Legal footer (privacy, terms, cookies, gdpr) |
| `src/app/pages/admin/Settings.tsx` | Help link (`settings` screen) |
| `src/app/pages/operations/OperationsPortal.tsx` | Help link (`operations`) |
| `src/app/pages/owner/OwnerPortal.tsx` | Help link in header |
| `src/app/pages/customer/CustomerBook.tsx` | Help link (`customer_booking`) |
| `src/app/pages/customer/CustomerProfile.tsx` | Full Legal Core links + contextual help |
| `src/app/pages/customer/CustomerSupport.tsx` | Contextual help |
| `src/features/driver-home/ShiftDashboard.tsx` | Help link (`driver_home`) |
| `src/app/pages/driver/DriverProfile.tsx` | Help + legal actions |
| `src/features/owner-portal/ProfileTab.tsx` | Expanded Legal Core links |

---

## Links replaced

| Area | Before | After |
|------|--------|-------|
| Auth service | Hardcoded `AUTH_CORE_URL` | `AUTH_BASE_URL` from env + `getLoginUrl` / `getRegisterUrl` exports |
| Billing portal mock | `https://billing.codevertex.cc/portal?session=mock` | `getBillingUrl()` |
| Help service | `/articles/...` paths on help domain | `getHelpUrl(screen)` — `/help/FLEETOS?app=...&screen=...` |
| Legal service | Hardcoded `LEGAL_CORE_URL/*` | `getLegalUrl(page)?app=FLEETOS` |
| Customer profile/support | `HELP_CORE_URL`, legacy legal keys | `openHelpCenter('customer_booking')`, `openLegal('privacy' \| 'terms' \| …)` |
| Owner profile | 3 static legal URLs | 7 Legal Core pages |
| Admin layout | — | Contextual help per route |
| Login | — | Privacy, Terms, Cookies, GDPR |
| Settings security | — | Account, Security, Billing (Auth/Billing Core) |

### Screen-aware Help (Phase 1)

| Screen code | Where used |
|-------------|------------|
| `dashboard` | AdminLayout on `/dashboard` |
| `vehicles` | AdminLayout on `/vehicles/*` |
| `drivers` | AdminLayout on `/drivers/*` |
| `bookings` | AdminLayout on `/bookings/*` |
| `finance` | AdminLayout on `/finance`, legacy finance redirects |
| `reports` | AdminLayout on `/reports` |
| `settings` | AdminLayout on `/settings`, Settings page, Owner portal |
| `operations` | OperationsPortal header |
| `driver_home` | ShiftDashboard, DriverProfile help |
| `customer_booking` | CustomerBook, CustomerProfile, CustomerSupport |

### Legal Core (Phase 1)

| Page | Where linked |
|------|----------------|
| `privacy` | Login, CustomerProfile, Owner portal, DriverProfile |
| `terms` | Login, CustomerProfile, Owner portal, DriverProfile |
| `cookies` | Login, CustomerProfile, Owner ProfileTab |
| `gdpr` | Login, CustomerProfile, Owner ProfileTab |
| `data-request` | CustomerProfile, Owner ProfileTab |
| `delete-request` | CustomerProfile, Owner ProfileTab |
| `dpa` | Owner portal (Overview + Profile) |

---

## Remaining hardcoded URLs

| URL | Location | Notes |
|-----|----------|-------|
| `https://codevertex.cc` | `Login.tsx` | Marketing / ecosystem link — intentional |
| Default fallbacks in `platformLinks.ts` | `src/lib/platformLinks.ts` | Used when env vars unset (dev-safe) |
| TODO comments in `*.service.ts` | Service files | Future API endpoints only — not runtime links |
| Mock login at `/login` | `Login.tsx` | Phase 2: redirect to `getLoginUrl()` |
| Sign out → `/login` | `AdminLayout.tsx` | Phase 2: optional Auth Core logout URL |

No runtime links to `auth.*`, `billing.*`, `help.*`, or `legal.*` remain outside `platformLinks.ts` (except defaults and comments).

---

## Verification

- `npm run build` — **PASS**
- `npm run lint` — **PASS** (0 errors, 34 warnings — pre-existing unused imports)

---

## Next recommended phase (Phase 2 — AUTH skeleton)

Per `docs/integration/FLEETOS_CORE_INTEGRATION_IMPLEMENTATION.md`:

1. Replace mock `Login` submit with redirect to `getLoginUrl(getSsoCallbackUrl())`
2. Add route `/sso/callback` (ticket consume placeholder)
3. Add `ProtectedRoute` / auth context (session stub)
4. Wire `auth.service.ts` consume API when backend ready
5. Keep mock data for all fleet screens until Supabase Phase 3

**Do not** connect Supabase or Stripe in Phase 2.
