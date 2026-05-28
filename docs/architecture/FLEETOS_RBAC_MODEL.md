# FLEETOS — RBAC MODEL

## 1. Purpose

Define FleetOS roles, permissions and access boundaries in a multi-tenant environment.

FleetOS uses:

```txt
Auth Core = identity
FleetOS = tenant-level permissions
```

A user may belong to multiple tenants with different roles.

---

## 2. Core Principle

```txt
Global identity belongs to Auth Core.
Tenant permissions belong to FleetOS.
```

FleetOS must never infer permissions only from frontend state.

---

## 3. Roles

| Role       | Scope           | Description                                  |
| ---------- | --------------- | -------------------------------------------- |
| owner      | tenant          | Full tenant owner                            |
| admin      | tenant          | Manages users, fleet, bookings and settings  |
| manager    | tenant          | Manages operations but not billing/ownership |
| dispatcher | tenant          | Assigns trips, drivers and vehicles          |
| driver     | tenant          | Views assigned trips and updates trip status |
| mechanic   | tenant          | Views/updates maintenance tasks              |
| viewer     | tenant          | Read-only internal access                    |
| customer   | tenant_customer | Books and views own trips                    |

---

## 4. Permissions Matrix

| Capability             | owner | admin      | manager | dispatcher | driver  | mechanic | viewer | customer |
| ---------------------- | ----- | ---------- | ------- | ---------- | ------- | -------- | ------ | -------- |
| Manage tenant settings | yes   | yes        | no      | no         | no      | no       | no     | no       |
| Manage billing         | yes   | no/limited | no      | no         | no      | no       | no     | no       |
| Invite internal users  | yes   | yes        | limited | no         | no      | no       | no     | no       |
| Manage vehicles        | yes   | yes        | yes     | no         | no      | limited  | read   | no       |
| Manage drivers         | yes   | yes        | yes     | limited    | no      | no       | read   | no       |
| Create bookings        | yes   | yes        | yes     | yes        | no      | no       | no     | yes      |
| Assign trips           | yes   | yes        | yes     | yes        | no      | no       | no     | no       |
| View assigned trips    | yes   | yes        | yes     | yes        | own     | no       | read   | own      |
| Update trip status     | yes   | yes        | yes     | yes        | own     | no       | no     | no       |
| Manage maintenance     | yes   | yes        | yes     | no         | limited | yes      | read   | no       |
| View reports           | yes   | yes        | yes     | limited    | no      | no       | read   | no       |
| Export data            | yes   | yes        | limited | no         | no      | no       | no     | no       |
| Open support ticket    | yes   | yes        | yes     | yes        | yes     | yes      | yes    | yes      |

---

## 5. Suggested Tables

```txt
tenant_members
- id
- tenant_id
- codevertex_user_id
- role
- status
- permissions jsonb
- created_at
- updated_at
```

```txt
tenant_customers
- id
- tenant_id
- codevertex_user_id
- customer_status
- created_at
- updated_at
```

---

## 6. Status Values

Internal users:

```txt
invited
active
suspended
removed
```

Customers:

```txt
active
blocked
archived
```

---

## 7. Access Rules

Every FleetOS query must be scoped by:

```txt
tenant_id
codevertex_user_id
role/status
```

No user may access data from another tenant unless explicitly linked to that tenant.

---

## 8. Auth Core Relationship

Auth Core controls:

* login
* password
* email
* account security
* global profile

FleetOS controls:

* tenant role
* operational permissions
* customer relationship
* fleet access

---

## 9. Golden Rule

```txt
A user can be globally authenticated and still have no access to a FleetOS tenant.
```
