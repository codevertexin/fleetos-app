# FLEETOS — MEMBERSHIP LIFECYCLE

## 1. Purpose

Define the lifecycle of:

* tenants
* tenant memberships
* customer relationships
* invitations
* approvals
* suspensions
* removals

This document formalizes the operational state machine for FleetOS multi-tenant access.

It must remain aligned with:

* FLEETOS_IDENTITY_AND_TENANCY_MODEL.md
* FLEETOS_RBAC_MODEL.md
* FLEETOS_AUTH_IMPLEMENTATION_PLAN.md

---

# 2. Core Principle

```txt id="8f0tlu"
Authentication does not automatically grant tenant access.
```

A user may:

* exist in Auth Core
* be authenticated globally
* still have no FleetOS tenant access

All operational access depends on FleetOS membership lifecycle state.

---

# 3. Core Entities

## Tenant

Represents a company/organization operating inside FleetOS.

---

## Tenant Member

Internal operational user belonging to a tenant.

Examples:

* owner
* admin
* dispatcher
* driver
* mechanic

---

## Tenant Customer

External customer relationship tied to a tenant.

Not an operational member.

---

## Tenant Invite

Pending invitation before membership activation.

---

# 4. Tenant Lifecycle

## 4.1 Tenant States

```txt id="aol38q"
pending_review
active
suspended
revoked
archived
```

---

## 4.2 State Definitions

### pending_review

Tenant created but awaiting approval/review.

Allowed:

* limited onboarding
* profile completion
* support access

Blocked:

* operational usage
* dispatch
* bookings management
* billing-sensitive operations

---

### active

Tenant fully operational.

All permitted functionality enabled according to role permissions.

---

### suspended

Temporary operational lock.

Possible reasons:

* billing issue
* compliance issue
* abuse investigation
* manual admin action

Users may still:

* access limited support
* access legal/account pages

Operational access blocked.

---

### revoked

Tenant permanently disabled.

No operational access allowed.

---

### archived

Inactive historical tenant retained for audit/compliance purposes.

---

# 5. Tenant Membership Lifecycle

## 5.1 Membership States

```txt id="74ov0n"
invited
pending
active
suspended
removed
```

---

## 5.2 State Definitions

### invited

Invite exists but not yet accepted.

No operational access.

---

### pending

User authenticated and linked but awaiting approval.

May occur when:

* company approval required
* manual admin review required
* compliance checks pending

Limited access only.

---

### active

Operational access granted according to RBAC role.

---

### suspended

Temporary membership restriction.

May be:

* disciplinary
* operational
* billing-related
* security-related

---

### removed

Membership terminated.

User loses tenant access.

Historical audit data preserved.

---

# 6. Membership Creation Flow

## 6.1 Owner Creation

```txt id="d13jk5"
register
↓
SSO callback
↓
tenant creation
↓
tenant_members(role=owner)
↓
pending_review or active
```

---

## 6.2 Invite Flow

```txt id="dnix2j"
invite created
↓
email sent
↓
user login/register
↓
SSO callback
↓
invite resolved
↓
membership created
↓
pending or active
```

---

# 7. Invite Lifecycle

## 7.1 Invite States

```txt id="e1srqy"
pending
accepted
expired
cancelled
revoked
```

---

## 7.2 Invite Rules

### pending

Invite active and usable.

---

### accepted

Invite already consumed.

Cannot be reused.

---

### expired

Past expiration date.

Requires new invite.

---

### cancelled

Cancelled manually before acceptance.

---

### revoked

Revoked due to security/admin action.

---

# 8. Existing User vs New User

## Existing Auth Core User

```txt id="imhy0m"
login
↓
resolve invite
↓
membership attached
```

---

## New User

```txt id="k3m0xu"
register
↓
login
↓
resolve invite
↓
membership attached
```

---

# 9. Role Assignment Rules

Roles are assigned only by:

* owner
* admin
* authorized management flows

Frontend role assignment alone is never trusted.

Backend must validate:

```txt id="f1y8ht"
tenant_id
membership state
RBAC permissions
```

---

# 10. Customer Lifecycle

## 10.1 Customer States

Suggested:

```txt id="fwhk79"
active
blocked
archived
```

---

## 10.2 Customer Rules

Customers:

* are not operational members
* do not access dispatch/admin tools
* only access customer-facing functionality

---

# 11. Suspension Rules

Suspension may happen at:

## Tenant Level

Blocks:

* all operational activity

---

## Membership Level

Blocks:

* specific user access

---

## Customer Level

Blocks:

* booking/payment activity

---

# 12. Access Resolution Priority

FleetOS should resolve access in this order:

```txt id="2mqj5m"
1. Authenticated?
2. Tenant exists?
3. Membership exists?
4. Membership active?
5. Tenant active?
6. Role allows action?
```

Failure at any step blocks operational access.

---

# 13. Approval Rules

approval_required may apply to:

* tenant creation
* memberships
* operational activation

Approval logic must remain backend-controlled.

Frontend must never self-activate memberships.

---

# 14. Audit Requirements

FleetOS should preserve auditability for:

* invites
* role changes
* suspensions
* removals
* activations
* approvals

Future audit tables may include:

```txt id="qhqhva"
membership_audit_logs
tenant_audit_logs
invite_audit_logs
```

---

# 15. Security Principles

FleetOS must never:

* trust frontend-only roles
* trust local cached permissions alone
* bypass tenant state validation
* bypass membership lifecycle checks

All operational access must be server-validated.

---

# 16. Recommended Future Tables

```txt id="3lgtj6"
tenant_invites
membership_audit_logs
tenant_audit_logs
invite_audit_logs
tenant_customers
```

---

# 17. Golden Rule

```txt id="q8j1q8"
Authentication grants identity.
Membership lifecycle grants operational access.
```
