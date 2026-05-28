# FleetOS — CodeVertex Core compliance (Phase 1)

**Date:** 2026-05-28  
**Scope:** Platform link alignment and settings/security ownership — **not** deep RBAC, booking schema, billing implementation, or Edge identity.

---

## Integration summary

| Core service | FleetOS integration | Status |
|--------------|---------------------|--------|
| **Auth Core** | SSO login/register, logout, standalone profile & security URLs | **Aligned** (Phase 1) |
| **Help Core** | `getHelpUrl()` standard query params | **Aligned** (Phase 1) |
| **Legal Core** | External links (`privacy`, `terms`, `cookies`, …) | **Aligned** (Phase 1) |
| **Billing Core** | `getBillingUrl()` from settings; service still mock/TODO | **Partial** |

**Source of truth:** `src/lib/platformLinks.ts`

---

## Auth Core integration

| Flow | URL pattern |
|------|-------------|
| Login | `auth/login?app=FLEETOS&return_url=<sso_callback>&return_to=<fleetos_dest>` |
| Register | `auth/register?app=FLEETOS&return_url=<sso_callback>&return_to=<fleetos_dest>` |
| Profile | `account/profile?app=FLEETOS&return_to=<current>&layout=standalone` |
| Security | `account/security?app=FLEETOS&return_to=<current>&layout=standalone` |
| Logout | `logout?app=FLEETOS&return_url=<fleetos_login>` |

**Contract:**

- `return_url` — always FleetOS SSO callback (`/sso/callback`).
- `return_to` — final in-app destination after SSO or when returning from standalone account.

Production sign-in uses **Auth Core redirect + SSO**, not `auth.service.login()` mock.

---

## Help Core integration

```
https://help.codevertex.cc/help?app_code=FLEETOS&locale=...&module_code=...&screen_code=...&source_surface=external_app_help&return_to=...
```

Helper: `getHelpUrl({ moduleCode?, screenCode?, locale?, returnTo?, sourceSurface? })`

Legacy path `/help/FLEETOS?app=FLEETOS` is **not** used.

---

## Legal Core integration

```
https://legal.codevertex.cc/{page}?app=FLEETOS
```

Frontend links use `target="_blank"` and `rel="noopener noreferrer"`.

Helper: `getLegalUrl(page)`

---

## Settings / security ownership

FleetOS **does not** present local password, 2FA, or session management in production UI.

`SecurityPanel` links to:

- Personal details → Auth Core profile (standalone)
- Security settings → Auth Core security (standalone)
- Billing & subscription → Billing Core (placeholder copy while integration pending)
- Legal documents → Legal Core

---

## Pending blockers (out of Phase 1 scope)

| Area | Blocker |
|------|---------|
| **Billing** | Real Billing Core API / entitlements; `billing.service.ts` still mock |
| **RBAC** | Canonical role model (`owner`, `admin`, `manager`, …) vs current `tenant_admin`, `fleet_manager`, … |
| **Customer model** | `tenant_customers` vs mixed passenger/company booking flows |
| **Booking / trip** | Explicit booking vs trip separation in schema and services |
| **Invitations** | `tenant_invites` lifecycle not implemented |
| **Naming** | `tenant_users` vs architecture `tenant_members` (no rename in Phase 1) |
| **Edge / RLS / DB** | Unchanged in Phase 1 — Phase 6 Edge + Phase 7 RLS remain as deployed |

---

## Phase 1 verdict

**FleetOS passes Phase 1 Platform Alignment** for frontend URL contracts and settings/security UX delegation to CodeVertex Core.

Production-final for the full product remains blocked by billing, RBAC/customer/booking model stabilization, and operational data migration off mocks.

---

## Related docs

- `docs/architecture/FLEETOS_ALIGNMENT_AUDIT.md`
- `docs/architecture/FLEETOS_IDENTITY_AND_TENANCY_MODEL.md`
- `docs/architecture/FLEETOS_RBAC_MODEL.md`
- `docs/integration/FLEETOS_CORE_INTEGRATION_PHASE1_REPORT.md`
