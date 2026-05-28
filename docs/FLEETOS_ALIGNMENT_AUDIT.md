# FLEETOS — ALIGNMENT AUDIT

> **Canonical copy:** [docs/architecture/FLEETOS_ALIGNMENT_AUDIT.md](./architecture/FLEETOS_ALIGNMENT_AUDIT.md) (includes Phase 1 applied status).

## Audit Status

```txt
Status: PASS WITH WARNINGS
Production-final: NO
```

FleetOS already contains strong foundations for a serious multi-tenant SaaS architecture, including:

* Auth Core integration
* tenant-aware structures
* SSO callback flow
* Edge JWT verification
* RLS foundations
* tenant-based operational separation

However, several architectural areas are still partially aligned or inconsistent with the newly defined platform models.

This document tracks:

* current alignment
* architectural drift
* pending decisions
* required corrections
* production blockers

---

# 1. Identity & Auth Alignment

## Current State

FleetOS already uses:

* CodeVertex Auth Core
* SSO callback
* codevertex_user_id
* approval gating concepts
* tenant-aware access

Existing components:

```txt
fleetos-sync-identity
fleetos-list-tenants
SSO callback routes
Edge verification JWT
```

---

## Current Gaps

### 1.1 Settings / Security still partially local

FleetOS still exposes local UX patterns for:

* password management
* sessions
* MFA / 2FA

These responsibilities belong exclusively to Auth Core.

### Required Direction

FleetOS must:

* delegate profile/security management to Auth Core
* use standalone account layout
* never imply local auth ownership

---

## 1.2 Auth links not fully standardized

Help/Auth/Profile/Billing URLs still use mixed formats.

FleetOS must adopt:

```txt
Auth:
auth.codevertex.cc

Help:
help.codevertex.cc/help?...context

Legal:
legal.codevertex.cc/... ?app=FLEETOS

Billing:
billing.codevertex.cc
```

---

# 2. Tenant Architecture Alignment

## Current State

FleetOS already contains:

```txt
tenants
tenant_users
tenant-aware RLS
```

This is positive and already compatible with the platform direction.

---

## Current Gaps

### 2.1 Naming inconsistency

Current code/database:

```txt
tenant_users
```

New architecture docs:

```txt
tenant_members
```

### Decision Pending

Choose canonical naming:

OPTION A:
Keep tenant_users

OPTION B:
Migrate to tenant_members

Recommendation:
Do not rename immediately unless schema is still unstable.

---

## 2.2 Invitation model incomplete

The architecture docs now formally define:

```txt
tenant_invites
```

FleetOS does not yet fully implement:

* invite lifecycle
* invite acceptance
* pending membership linking
* role assignment flow

---

# 3. RBAC Alignment

## Current State

FleetOS already contains operational roles.

Observed examples:

```txt
tenant_admin
fleet_manager
operations
dispatcher
finance
driver
owner
viewer
```

---

## Current Gaps

### 3.1 Roles not standardized

Current implementation differs from new RBAC document.

New target model:

```txt
owner
admin
manager
dispatcher
driver
mechanic
viewer
customer
```

---

## 3.2 Customer role not clearly separated

Current architecture still partially mixes:

```txt
internal members
customers/passengers
```

Target model requires:

```txt
tenant_members
≠
tenant_customers
```

---

# 4. Customer Model Alignment

## Current State

FleetOS already contains booking flows and public/company booking routes.

Observed route example:

```txt
/book/:companySlug
```

This indicates correct tenant-scoped public booking direction.

---

## Current Gaps

### 4.1 tenant_customers not formally implemented

The new architecture requires:

```txt
tenant_customers
```

linked to:

```txt
codevertex_user_id
```

for:

* payment history
* support
* customer portal
* invoices
* repeat bookings

---

## 4.2 Guest vs registered customer strategy still implicit

Architecture now defines:

```txt
lead/pre-booking
registered customer
```

FleetOS still needs explicit implementation decision.

Current recommendation:

```txt
Paid bookings require Auth Core account.
```

---

# 5. Booking & Trip Model Alignment

## Current State

FleetOS already contains booking/assignment operational logic.

This is a good foundation.

---

## Current Gaps

### 5.1 Booking vs Trip separation still unclear

Current implementation still appears partially operationally mixed.

Architecture now defines:

```txt
Booking = commercial/customer request
Trip = operational execution
```

This distinction must become explicit in:

* schema
* services
* naming
* APIs
* UI
* dispatch logic

---

## 5.2 Future recurring scheduling not yet formalized

Recurring bookings/trips should eventually support:

```txt
recurring_booking_rules
```

without infinite trip duplication.

---

# 6. Billing Alignment

## Current State

Billing integration still appears partially mocked/TODO.

This is acceptable during architecture stabilization.

---

## Production Blocker

FleetOS cannot become production-final until:

* Billing Core integration is real
* entitlement strategy is defined
* tenant billing ownership is defined
* customer payment model is defined

---

# 7. Help & Legal Alignment

## Current State

Legal links already mostly externalized.

Positive direction.

---

## Current Gaps

### 7.1 Help URLs outdated

Current pattern:

```txt
/help/FLEETOS?app=FLEETOS
```

Target standard:

```txt
/help?app_code=FLEETOS&module_code=...&screen_code=...&source_surface=external_app_help&return_to=...
```

---

# 8. Production Blockers

FleetOS should NOT be considered production-final until:

## Auth / Identity

* standalone account mode fully adopted
* no misleading local auth UX
* invite flow implemented

## Multi-tenant

* tenant/customer separation explicit
* RBAC standardized
* customer model formalized

## Booking model

* booking vs trip separation finalized
* dispatch lifecycle stabilized

## Billing

* Billing Core real integration
* tenant billing ownership model
* customer payment model

## Help / Legal

* Help URL standard adopted
* support context standardized

---

# 9. Recommended Next Phase

Recommended implementation order:

## Phase 1 — Platform Alignment

* Auth links
* Help links
* Settings cleanup
* standalone account mode
* Security panel cleanup
* docs alignment

## Phase 2 — Tenant/RBAC Stabilization

* canonical role model
* tenant/customer separation
* invitation system

## Phase 3 — Booking Model Stabilization

* booking/trip separation
* dispatch lifecycle
* recurring model

## Phase 4 — Billing

* Billing Core integration
* subscriptions
* invoices
* payments

---

# 10. Final Architectural Principle

```txt
Identity belongs to Auth Core.
Operational relationships belong to FleetOS.
Bookings are commercial requests.
Trips are operational execution.
```
