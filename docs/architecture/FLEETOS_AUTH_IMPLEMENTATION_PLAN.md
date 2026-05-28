# FLEETOS — AUTH IMPLEMENTATION PLAN

## 1. Purpose

Define the operational authentication and identity lifecycle for FleetOS.

This document transforms the architectural models into real application flows.

It defines:

* internal staff onboarding
* customer onboarding
* tenant creation
* invite flows
* approval flows
* SSO lifecycle
* Auth Core integration boundaries
* customer booking authentication
* standalone account UX

This document must remain aligned with:

* FLEETOS_IDENTITY_AND_TENANCY_MODEL.md
* FLEETOS_RBAC_MODEL.md
* FLEETOS_CUSTOMER_MODEL.md
* FLEETOS_BOOKING_AND_TRIP_MODEL.md

---

# 2. Core Principle

```txt id="j4hjq9"
Auth Core manages identity.
FleetOS manages operational relationships.
```

FleetOS must never implement local authentication ownership.

FleetOS must delegate:

* login
* register
* password reset
* sessions
* MFA
* account security

to CodeVertex Auth Core.

---

# 3. Internal Staff Authentication Flow

## 3.1 Owner Registration Flow

### Goal

Create the first tenant owner.

---

## Flow

```txt id="5ep6gd"
User opens FleetOS
↓
User selects "Create company account"
↓
Redirect to Auth Core register
↓
User creates account
↓
Auth Core validates profile_mode=business
↓
SSO callback to FleetOS
↓
FleetOS creates tenant
↓
FleetOS creates tenant_members role=owner
↓
Tenant enters approval_required state
↓
Platform/admin approval (if enabled)
↓
Tenant activated
```

---

## Required Data

### Auth Core

```txt id="2ejmxj"
codevertex_user_id
email
global profile
business profile requirements
```

### FleetOS

```txt id="9y8bsl"
tenant
tenant_members
membership status
approval status
```

---

# 4. approval_required Lifecycle

FleetOS uses:

```txt id="jxbepz"
membership_mode = approval_required
```

---

## 4.1 Pending States

Suggested statuses:

### Tenant

```txt id="wdq8nq"
pending_review
active
suspended
revoked
```

### Tenant Member

```txt id="m72bsa"
invited
pending
active
suspended
removed
```

---

## 4.2 Access Rules

While pending:

### Allowed

* profile access
* limited onboarding
* support/help
* legal pages

### Blocked

* operational dashboard
* dispatch
* billing-sensitive actions
* customer management
* trip execution

---

# 5. Internal Invite Flow

## 5.1 Goal

Allow owners/admins to invite staff members.

---

## 5.2 Suggested Table

```txt id="2z5l7u"
tenant_invites
- id
- tenant_id
- email
- intended_role
- invite_token
- status
- expires_at
- invited_by
- created_at
```

---

## 5.3 Invite Acceptance Flow

```txt id="yjl4zu"
Owner/Admin sends invite
↓
FleetOS creates tenant_invite
↓
Email sent
↓
User clicks invite
↓
Auth Core login/register
↓
SSO callback to FleetOS
↓
FleetOS resolves pending invite
↓
tenant_member created or activated
↓
Role assigned
```

---

## 5.4 Existing User vs New User

### Existing Auth Core user

```txt id="xg5ovd"
login
→ attach membership
```

### New user

```txt id="zqwezn"
register
→ login
→ attach membership
```

---

# 6. Customer Authentication Flow

## 6.1 Core Principle

All customers that complete paid bookings should have Auth Core accounts.

---

## 6.2 Customer Booking Flow

```txt id="mwxsls"
Customer opens booking page
↓
Customer selects trip
↓
Customer login/register required
↓
Auth Core flow
↓
SSO callback
↓
FleetOS creates tenant_customer relationship
↓
Booking created
↓
Payment flow
↓
Trip lifecycle
```

---

## 6.3 tenant_customer Creation

Suggested logic:

```txt id="pprrff"
If tenant_customer does not exist:
create relationship

If already exists:
reuse relationship
```

Customers may belong to multiple tenants.

---

# 7. Customer vs Passenger

FleetOS must not assume:

```txt id="bt0m5z"
customer = passenger
```

Examples:

* parent booking for child
* company booking for employee
* assistant booking for executive

---

## Suggested Model

```txt id="a0l11l"
Customer
→ commercial/account entity

Passenger
→ traveller entity
```

---

# 8. Booking Authentication Rules

## Public Booking Pages

Allowed:

```txt id="dtf0m0"
/book/:companySlug
```

---

## Before Payment

FleetOS may optionally allow:

* quote requests
* pre-bookings
* lead capture

without account.

---

## Before Confirmed Paid Booking

Authentication required.

---

# 9. Standalone Auth UX

FleetOS must use:

```txt id="lm4wmk"
layout=standalone
```

for Auth Core account pages.

---

## Required Behaviour

### Allowed

* branding
* minimal header
* back to FleetOS
* sign out

### Not Allowed

* cross-app navigation
* ecosystem sidebar
* unrelated app navigation

---

# 10. Profile & Security Ownership

## Auth Core owns

* password
* MFA
* sessions
* email
* recovery
* profile security

---

## FleetOS owns

* tenant memberships
* operational preferences
* fleet settings
* dispatch permissions
* customer relationships

---

# 11. Tenant Creation Rules

## 11.1 Recommended Rule

A tenant is created only after:

```txt id="4l4ryz"
successful Auth Core identity creation
```

---

## 11.2 Multiple Tenants

A user may eventually belong to:

* multiple tenants
* different roles per tenant

FleetOS must support this architecturally.

---

# 12. Logout Flow

FleetOS logout should:

```txt id="q5by3u"
clear local operational session
↓
redirect to Auth Core logout if needed
↓
preserve return_to
```

---

# 13. Support Integration

Support flows should include:

```txt id="y8n79s"
tenant_id
role
membership status
booking_id optional
customer_id optional
```

HELP Core may later consume this context.

---

# 14. Billing Relationship

Billing ownership remains pending Phase 4.

Current direction:

### Tenant billing

* subscriptions
* platform plans
* operational limits

### Customer billing

* bookings
* invoices
* trip payments

---

# 15. Security Requirements

FleetOS must:

* never store passwords
* never manage MFA locally
* never manage auth sessions locally
* never bypass Auth Core
* never trust frontend-only permissions

All operational permissions must be validated server-side.

---

# 16. Recommended Next Phases

## Phase 2

* canonical RBAC
* tenant_customers
* tenant_invites
* approval lifecycle
* membership lifecycle

## Phase 3

* booking/trip separation
* dispatch lifecycle
* recurring scheduling

## Phase 4

* Billing Core integration
* subscriptions
* payments
* invoices

---

# 17. Golden Rule

```txt id="u0u9n4"
Authentication is global.
Permissions are tenant-scoped.
Bookings are commercial.
Trips are operational.
```
