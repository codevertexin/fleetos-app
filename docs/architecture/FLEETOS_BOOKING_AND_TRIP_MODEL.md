# FLEETOS — BOOKING AND TRIP MODEL

## 1. Purpose

Define how FleetOS handles bookings, trips, dispatch, passengers, vehicles and trip lifecycle.

This model supports:

* customer bookings
* internal bookings
* dispatch operations
* assigned drivers
* assigned vehicles
* future billing and invoices

---

## 2. Core Definitions

## Booking

A booking is a customer or internal request for transportation.

A booking answers:

```txt
Who wants transport?
When?
From where?
To where?
For how many passengers?
With what requirements?
```

## Trip

A trip is the operational execution of a booking.

A trip answers:

```txt
Which driver?
Which vehicle?
What status?
What route?
What operational events?
```

A booking may generate one or more trips.

---

## 3. Booking Types

```txt
one_way
round_trip
hourly
airport_transfer
recurring
corporate
custom
```

---

## 4. Booking Statuses

```txt
draft
requested
pending_payment
confirmed
assigned
in_progress
completed
cancelled
rejected
no_show
```

---

## 5. Trip Statuses

```txt
unassigned
assigned
driver_notified
driver_en_route
arrived_pickup
passenger_onboard
in_progress
completed
cancelled
incident
```

---

## 6. Suggested Tables

```txt
bookings
- id
- tenant_id
- customer_id
- requested_by_user_id
- booking_type
- pickup_location
- dropoff_location
- pickup_time
- passenger_count
- status
- price_estimate
- payment_status
- notes
- created_at
- updated_at
```

```txt
trips
- id
- tenant_id
- booking_id
- driver_id
- vehicle_id
- status
- scheduled_start
- actual_start
- actual_end
- route_data
- operational_notes
- created_at
- updated_at
```

```txt
trip_passengers
- id
- tenant_id
- trip_id
- customer_id
- name
- phone
- notes
```

---

## 7. Dispatch Model

Dispatch assigns:

```txt
booking → trip → driver + vehicle
```

Dispatchers and managers may:

* assign drivers
* assign vehicles
* change trip status
* notify drivers
* monitor trip lifecycle

Drivers may only access their assigned trips.

---

## 8. Customer Flow

Recommended flow:

```txt
Customer logs in
↓
Creates booking
↓
Payment or confirmation
↓
Booking confirmed
↓
FleetOS creates/updates trip
↓
Dispatcher assigns driver/vehicle
↓
Trip completed
↓
Invoice/receipt generated
```

---

## 9. Payment Relationship

Bookings may be:

```txt
unpaid
pending_payment
paid
refunded
cancelled
```

Billing/payment details should integrate with Billing Core or payment provider later.

FleetOS should not hardcode billing assumptions into booking logic.

---

## 10. Recurring Bookings

Recurring bookings should not duplicate infinite trips immediately.

Recommended model:

```txt
recurring_booking_rule
↓
generates trips within scheduling window
```

Future table:

```txt
recurring_booking_rules
- id
- tenant_id
- customer_id
- pattern
- start_date
- end_date
- status
```

---

## 11. Golden Rule

```txt
Booking = commercial/customer request.
Trip = operational execution.
```
