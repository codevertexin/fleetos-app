# FLEETOS — CUSTOMER MODEL

## 1. Purpose

Define how FleetOS handles customers, passengers, payers and customer accounts.

FleetOS customers may book and pay for transportation services.

Because customers pay, they should generally have Auth Core accounts.

---

## 2. Core Principle

```txt
Customers with paid bookings must exist in Auth Core.
FleetOS stores their relationship with a specific tenant.
```

---

## 3. Customer Types

## Registered Customer

A customer with:

```txt
Auth Core account
FleetOS tenant_customer record
```

Used for:

* bookings
* payments
* invoices
* trip history
* customer portal
* support

## Lead / Pre-booking Contact

A person who has not paid or confirmed yet.

Used for:

* quote request
* contact request
* pre-booking
* inquiry

May exist only locally until conversion.

---

## 4. Suggested Tables

```txt
tenant_customers
- id
- tenant_id
- codevertex_user_id
- customer_status
- default_billing_name
- default_phone
- preferences jsonb
- created_at
- updated_at
```

```txt
customer_leads
- id
- tenant_id
- name
- email
- phone
- request_details
- status
- converted_customer_id
- created_at
```

---

## 5. Passenger vs Customer

A customer is the account/person responsible for the booking.

A passenger is a person travelling.

They may be the same person or different people.

Examples:

```txt
Parent books for child
Company books for employee
Assistant books for executive
Customer books for themselves
```

Suggested table:

```txt
booking_passengers
- id
- tenant_id
- booking_id
- customer_id nullable
- name
- phone
- passenger_notes
```

---

## 6. Payer vs Passenger

The payer may be:

```txt
customer
company
tenant account
third party
```

Future billing should support this distinction.

Do not assume:

```txt
payer = passenger
```

---

## 7. Customer Access

Customers may access:

* own profile
* own bookings
* own trip history
* own invoices/receipts
* own support tickets

Customers must not access:

* tenant dashboard
* vehicle data
* driver management
* dispatch tools
* other customers’ bookings

---

## 8. Support Relationship

Customer support should be scoped by:

```txt
tenant_id
codevertex_user_id
booking_id optional
```

HELP Core can later use this context.

---

## 9. Conversion Flow

Lead to customer:

```txt
lead created
↓
quote accepted
↓
customer creates/logs into Auth Core account
↓
tenant_customer created
↓
booking confirmed
```

---

## 10. Golden Rule

```txt
A FleetOS customer is not an internal tenant member.
A FleetOS customer is a tenant-specific commercial relationship linked to an Auth Core identity.
```
