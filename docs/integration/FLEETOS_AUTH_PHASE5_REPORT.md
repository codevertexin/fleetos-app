# FleetOS — Auth Core Phase 5 Report

**Date:** 2026-05-27  
**Scope:** Real SSO consume wiring + FleetOS membership gate (`approval_required`)  
**Out of scope:** Billing, Stripe, RLS rewrite, operational mock data replacement

---

## Summary

Phase 5 separates **CodeVertex identity** (signed in) from **FleetOS operational access** (active membership). SSO consume uses Auth Core when `VITE_AUTH_SSO_CONSUME_URL` is set; otherwise dev mock remains available in `import.meta.env.DEV` only.

---

## Membership model

| Auth Core status | FleetOS behaviour |
|------------------|-------------------|
| `active` | Full app access via `ProtectedRoute` |
| `pending` | Redirect `/pending-approval` |
| `suspended` | Redirect `/access-suspended` |
| `revoked` | Redirect `/access-revoked` |
| missing (no `FLEETOS` membership) | Treated as `pending` → `/pending-approval` |

`FLEETOS` membership mode: **approval_required** (Auth Core registry).

---

## Files changed / added

| File | Change |
|------|--------|
| `src/types/session.ts` | `FleetosMembershipStatus`; session field `fleetosMembershipStatus` |
| `src/lib/membership-gate.ts` | **New** — gate path helpers |
| `src/lib/services/auth.service.ts` | Real/mock routing; parse memberships + status; `findFleetosMembership` |
| `src/lib/session-storage.ts` | Back-compat default status `active` for old sessions |
| `src/contexts/AuthProvider.tsx` | Exposes `fleetosMembershipStatus`, `hasActiveFleetosAccess` |
| `src/components/auth/ProtectedRoute.tsx` | Requires auth **and** active membership; `AuthenticatedGateRoute` |
| `src/components/auth/MembershipGatePage.tsx` | **New** — shared gate UI |
| `src/app/pages/auth/PendingApproval.tsx` | **New** |
| `src/app/pages/auth/AccessSuspended.tsx` | **New** |
| `src/app/pages/auth/AccessRevoked.tsx` | **New** |
| `src/app/pages/auth/SsoCallback.tsx` | Post-SSO redirect by membership status |
| `src/app/App.tsx` | Gate routes; `/book/*` remains public |
| `.env.example` | `VITE_AUTH_SSO_CONSUME_URL` documented |

---

## SSO consume behaviour

```txt
consumeSsoTicket(ticket)
  → if VITE_AUTH_SSO_CONSUME_URL set → consumeSsoTicketReal (POST JSON)
  → else if DEV → consumeSsoTicketDevMock
  → else → user-safe AuthCoreError
```

**Production:** mock SSO is never used.

**Dev mock ticket prefixes** (when URL not configured):

| Ticket prefix | Simulated status |
|---------------|------------------|
| `pending-*` | pending |
| `suspended-*` | suspended |
| `revoked-*` | revoked |
| `missing-*` | missing |
| (default) | active |

Example: `/sso/callback?ticket=pending-test`

---

## Protected routes

`ProtectedRoute` requires:

1. Authenticated session (`fleetos-session`)
2. `fleetosMembershipStatus === 'active'`

Non-active users are redirected to the appropriate gate page.

**Public (unchanged):**

- `/login`, `/forgot-password`, `/sso/callback`
- `/book/:companySlug/*` customer booking portal

---

## Configuration

```env
VITE_AUTH_SSO_CONSUME_URL=https://auth.codevertex.cc/functions/v1/consume-sso-ticket
```

Confirm exact URL and JSON response shape with Auth Core team.

Expected membership fields (flexible parser): `status`, `membership_status`, or `state` on each membership row with `app_code=FLEETOS`.

---

## Remaining blockers

| Item | Notes |
|------|--------|
| Confirm consume endpoint URL + response contract | Set `VITE_AUTH_SSO_CONSUME_URL` in `.env.local` |
| Auth Core `FLEETOS` registration + approval workflow | `docs/auth/FLEETOS_AUTH_CORE_REGISTRATION.md` |
| Upsert `profiles.codevertex_user_id` after SSO | Phase 5b / Supabase client |
| Sync `tenant_users` from memberships | Phase 5b |
| RLS tenant policies | Deferred |

---

## Build / lint

| Check | Result |
|-------|--------|
| `npm run build` | Pass |
| `npm run lint` | Pass (0 errors; pre-existing warnings only) |

---

## Next steps

1. Set `VITE_AUTH_SSO_CONSUME_URL` in `.env.local` and test real consume.
2. Register / approve test users in Auth Core for `FLEETOS`.
3. Wire Supabase profile upsert on successful active SSO.
4. Phase 6: RLS + `tenant_users` sync (no Billing yet).
