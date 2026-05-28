# FLEETOS — ALIGNMENT AUDIT

## Audit Status

```txt
Status: PASS WITH WARNINGS
Production-final: NO
Phase 1 Platform Alignment: PASS (2026-05-28)
```

FleetOS already contains strong foundations for a serious multi-tenant SaaS architecture, including:

* Auth Core integration
* tenant-aware structures
* SSO callback flow
* Edge JWT verification
* RLS foundations
* tenant-based operational separation

This document tracks alignment, drift, pending decisions, and production blockers.

**Compliance detail:** [FLEETOS_CODEVERTEX_COMPLIANCE.md](./FLEETOS_CODEVERTEX_COMPLIANCE.md)

---

# Phase 1 Platform Alignment — applied / pending

## Applied (2026-05-28)

| Item | Implementation |
|------|----------------|
| Auth login/register URLs | `return_url` = SSO callback; `return_to` = FleetOS destination (`platformLinks.ts`) |
| Profile / security standalone | `layout=standalone` + `return_to` current URL |
| Settings security panel | Local password / 2FA / sessions UI removed; Auth + Billing + Legal cards |
| Help URLs | Help Core `/help?app_code=FLEETOS&module_code&screen_code&…` via `getHelpUrl()` |
| Legal URLs | `legal.codevertex.cc/{page}?app=FLEETOS` + `noopener` on frontend links |
| Forgot password route | PROD redirect to Auth Core; DEV link only |
| Auth service legacy mocks | `@deprecated` on `login`, `forgotPassword`, `resetPassword`, `changePassword`, `updateProfile` |

## Pending (Phase 2+)

| Item | Notes |
|------|-------|
| Billing Core real API | URL aligned; `billing.service.ts` still mock |
| Owner portal local profile edit | Still mock UX — not Phase 1 scope |
| Help/Legal API mocks | Search, tickets, document acceptance still TODO |
| Deep RBAC / customer / booking models | See sections 3–5 below |

---

# 1. Identity & Auth Alignment

## Current State

FleetOS uses CodeVertex Auth Core, SSO callback, Edge-verified identity sync, and tenant-aware access.

## Gaps (post–Phase 1)

### 1.1 Settings / Security — **resolved in Phase 1**

FleetOS no longer exposes production UI for local password, 2FA, or session revocation.

### 1.2 Auth links — **resolved in Phase 1**

Standardized in `src/lib/platformLinks.ts`.

### 1.3 Invitation model — **pending**

`tenant_invites` lifecycle not fully implemented.

---

# 2. Tenant Architecture Alignment

(Unchanged — Phase 2)

* Naming: `tenant_users` vs `tenant_members` — decision pending
* Invitations incomplete

---

# 3. RBAC Alignment

(Unchanged — Phase 2)

* Role standardization pending
* `tenant_members` vs `tenant_customers` separation pending

---

# 4. Customer Model Alignment

(Unchanged — Phase 2)

* `tenant_customers` not formalized
* Guest vs registered strategy implicit

---

# 5. Booking & Trip Model Alignment

(Unchanged — Phase 3)

* Booking vs trip separation unclear in implementation
* Recurring rules not formalized

---

# 6. Billing Alignment

(Unchanged — Phase 4)

Billing mock/TODO acceptable during stabilization; production blocker remains.

---

# 7. Help & Legal Alignment

### 7.1 Help URLs — **resolved in Phase 1**

Target standard adopted via `getHelpUrl()`.

Legal links were already externalized; Phase 1 confirmed `noopener` on in-app links.

---

# 8. Production Blockers

FleetOS is **not** production-final until billing, RBAC/customer/booking models, and real operational data paths are complete.

Phase 1 removes **misleading local auth UX** and **non-standard platform URLs** as blockers.

---

# 9. Recommended Next Phase

## Phase 1 — Platform Alignment — **DONE**

## Phase 2 — Tenant/RBAC Stabilization

* canonical role model
* tenant/customer separation
* invitation system

## Phase 3 — Booking Model Stabilization

## Phase 4 — Billing

---

# 10. Final Architectural Principle

```txt
Identity belongs to Auth Core.
Operational relationships belong to FleetOS.
Bookings are commercial requests.
Trips are operational execution.
```
