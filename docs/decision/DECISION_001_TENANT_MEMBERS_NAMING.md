# DECISION_001 — TENANT MEMBERS NAMING

## Status

```txt id="6evvwy"
ACCEPTED
```

---

# Decision

FleetOS adopts:

```txt id="az57s2"
tenant_members
```

as the canonical naming for internal tenant operational relationships.

---

# Previous Naming

Legacy/internal naming currently present in parts of the codebase:

```txt id="s8k6zt"
tenant_users
```

This naming is now considered transitional/legacy.

---

# Rationale

## 1. Semantic Accuracy

The word:

```txt id="6p34a5"
member
```

better represents:

* tenant participation
* operational belonging
* organization-scoped access

than:

```txt id="e63x66"
user
```

which is overly generic.

---

## 2. Separation of Concerns

FleetOS distinguishes:

```txt id="cc3cl5"
Global identity
↓
Auth Core users

Tenant operational relationships
↓
tenant_members

External commercial relationships
↓
tenant_customers
```

Using `tenant_users` creates ambiguity between:

* Auth Core users
* operational memberships
* customers

---

## 3. Enterprise SaaS Alignment

The term:

```txt id="r6plgx"
tenant_members
```

aligns better with enterprise multi-tenant SaaS patterns.

Examples conceptually aligned:

* organization members
* workspace members
* team members

---

## 4. Future Scalability

FleetOS must support:

* multi-tenant memberships
* different roles per tenant
* customer relationships
* operational separation
* invite lifecycle
* approvals
* suspensions

The term `member` scales more cleanly for these scenarios.

---

# Canonical Concepts

## Global Identity

Managed by Auth Core:

```txt id="a3gfh7"
auth.users
profiles
codevertex_user_id
```

---

## Operational Membership

Managed by FleetOS:

```txt id="qddsl9"
tenant_members
```

---

## Customer Relationship

Managed by FleetOS:

```txt id="1v7p8h"
tenant_customers
```

---

# Migration Strategy

## Phase 2A

Introduce compatibility layer.

Allowed temporarily:

```txt id="3sm6lg"
tenant_users
tenant_members
```

Goal:
avoid destructive migration during architectural stabilization.

---

## Phase 2B

Rename:

* DB tables
* services
* APIs
* Edge Functions
* TypeScript types
* repositories
* RLS references
* documentation

towards canonical naming.

---

## Phase 2C

Remove legacy naming:

```txt id="j08o2t"
tenant_users
```

except where historical migrations require preservation.

---

# Compatibility Requirements

During transition:

* old APIs may continue working temporarily
* compatibility adapters may exist
* migration scripts must preserve integrity
* audit history must remain intact

---

# Non-Goals

This decision does NOT yet define:

* final schema
* RBAC implementation details
* invite architecture
* customer booking model
* billing integration

These are handled separately.

---

# Architectural Principle

```txt id="4xv3rk"
Authentication creates identity.
Membership creates operational belonging.
```

---

# Final Rule

FleetOS should avoid introducing new:

```txt id="m0j0c6"
tenant_users
```

references in:

* new schema
* new APIs
* new services
* new documentation
* new frontend components

New development should prefer:

```txt id="u6ib9m"
tenant_members
```
