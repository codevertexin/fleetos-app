# FleetOS — CodeVertex Core Integration Implementation Guide

Status: Implementation reference  
Scope: FleetOS integration with AUTH, BILLING, HELP and LEGAL Core  
Target app code: `FLEETOS`  
Ecosystem: `codevertex`  
Canonical app domain: `https://fleetos.codevertex.cc`  
Architecture model: federated CodeVertex app + independent operational Supabase  
Updated: 2026-05-24

---

## 0. Purpose

This document defines how FleetOS must integrate with the CodeVertex Core ecosystem.

FleetOS is not a standalone isolated app. It is a CodeVertex ecosystem application that reuses:

- `auth.codevertex.cc` for identity, login, registration, profile policies and SSO
- `billing.codevertex.cc` for monetization, checkout, products and entitlements
- `help.codevertex.cc` for contextual support and knowledge base
- `legal.codevertex.cc` for legal/compliance pages

FleetOS keeps its own operational Supabase because fleet data is app-specific.

FleetOS operational data must not be stored in CodeVertex Core.

---

## 1. Architectural Position

### 1.1 CodeVertex principle

CodeVertex Core owns transversal platform concerns:

- authentication
- identity
- memberships
- roles
- billing
- products
- entitlements
- shared help
- shared legal/compliance

FleetOS owns operational business data:

- tenants
- vehicles
- drivers
- bookings
- assignments
- owners/suppliers
- contracts
- expenses
- incomes
- payouts
- documents
- maintenance
- vehicle damage
- driver availability

### 1.2 FleetOS deployment model

Frontend:

```txt
fleetos.codevertex.cc
```

Future white-label domains:

```txt
app.clientdomain.com
fleet.clientdomain.pt
tvde.clientdomain.pt
```

Backend:

```txt
FleetOS Supabase project
```

Core services:

```txt
auth.codevertex.cc
billing.codevertex.cc
help.codevertex.cc
legal.codevertex.cc
```

---

## 2. Required Environment Variables

FleetOS must define these public frontend variables:

```env
VITE_APP_CODE=FLEETOS
VITE_ECOSYSTEM_CODE=codevertex

VITE_APP_BASE_URL=https://fleetos.codevertex.cc

VITE_AUTH_BASE_URL=https://auth.codevertex.cc
VITE_BILLING_BASE_URL=https://billing.codevertex.cc
VITE_HELP_BASE_URL=https://help.codevertex.cc
VITE_LEGAL_BASE_URL=https://legal.codevertex.cc

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

For local development:

```env
VITE_APP_BASE_URL=http://localhost:5173
```

Never expose in the frontend:

```txt
SUPABASE_SERVICE_ROLE_KEY
SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
OPENAI_API_KEY
GEMINI_API_KEY
```

---

## 3. AUTH Core Integration

## 3.1 AUTH responsibility

FleetOS must not create an independent authentication system.

AUTH Core handles:

- login
- registration
- password reset
- profile management
- SSO ticket creation
- SSO ticket consumption
- membership validation
- role/profile policies
- contextual branding

FleetOS handles:

- local session mapping
- operational tenant access
- FleetOS-specific roles
- app data access
- tenant-aware RLS

---

## 3.2 FleetOS app registry requirements in AUTH Core

FleetOS must exist in the CodeVertex app registry with:

```txt
app_code: FLEETOS
ecosystem_code: codevertex
base_url: https://fleetos.codevertex.cc
sso_callback_url: https://fleetos.codevertex.cc/sso/callback
requires_profile: true
profile_mode: business
status: active
```

Recommended metadata:

```json
{
  "tagline": "Fleet management operating system for modern mobility companies",
  "category": "business",
  "accent_color": "#00B39A",
  "logo_url": "https://fleetos.codevertex.cc/logo.png",
  "favicon_url": "https://fleetos.codevertex.cc/favicon.ico",
  "requires_profile": true,
  "profile_mode": "business",
  "allowed_return_urls": [
    "http://localhost:5173/sso/callback",
    "http://localhost:5174/sso/callback",
    "https://fleetos.codevertex.cc/sso/callback"
  ]
}
```

For custom-domain tenants, add allowlisted callback URLs only when the domain is verified:

```txt
https://app.clientdomain.com/sso/callback
```

Do not use wildcard callbacks in production.

---

## 3.3 AUTH flow

### Login flow

```txt
FleetOS
→ auth.codevertex.cc/auth/login?app=FLEETOS&return_url=https://fleetos.codevertex.cc/sso/callback
→ user logs in
→ AUTH creates SSO ticket
→ redirects to FleetOS /sso/callback?ticket=...
→ FleetOS consumes ticket
→ FleetOS maps CodeVertex identity to local profile/tenant user
→ FleetOS creates local app session
```

### Register flow

```txt
FleetOS
→ auth.codevertex.cc/auth/register?app=FLEETOS&return_url=https://fleetos.codevertex.cc/sso/callback
→ user registers
→ accepts Terms + Privacy through Legal Core
→ profile completeness checked by AUTH
→ SSO ticket returned
→ FleetOS consumes ticket
```

### Logout flow

FleetOS should clear its local session.

Optionally redirect to:

```txt
https://auth.codevertex.cc/logout?app=FLEETOS&return_url=https://fleetos.codevertex.cc/login
```

Do not assume global logout exists unless AUTH Core confirms it.

---

## 3.4 SSO callback route

FleetOS must implement:

```txt
/sso/callback
```

Responsibilities:

1. Read `ticket` and optional `return_to`.
2. Prevent double consume caused by React Strict Mode.
3. Call AUTH Core consume endpoint.
4. Receive CodeVertex user/profile/memberships/roles.
5. Validate membership for `FLEETOS`.
6. Upsert local FleetOS profile.
7. Resolve tenant access.
8. Store local session data.
9. Redirect to the requested safe route.

Pseudo flow:

```ts
const ticket = searchParams.get("ticket");

const result = await authService.consumeSsoTicket({
  app_code: "FLEETOS",
  ticket,
});

await fleetosIdentityService.upsertLocalProfile({
  codevertex_user_id: result.profile.id,
  email: result.profile.email,
  display_name: result.profile.display_name,
});

await tenantService.resolveTenantAccess(result.profile.id);

navigate("/dashboard");
```

---

## 3.5 Local identity mapping

FleetOS must store CodeVertex identity.

Recommended local profile fields:

```sql
alter table public.profiles
  add column if not exists codevertex_user_id uuid,
  add column if not exists email text,
  add column if not exists display_name text,
  add column if not exists preferred_language text,
  add column if not exists timezone text,
  add column if not exists country text,
  add column if not exists default_currency text;
```

Canonical rule:

```txt
codevertex_user_id is the ecosystem identity.
Do not use email as canonical identity.
```

---

## 3.6 Tenant access model

Authentication does not mean FleetOS tenant access.

FleetOS must validate:

```txt
tenant_users
```

Recommended table:

```sql
create table if not exists public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  codevertex_user_id uuid not null,
  profile_id uuid references public.profiles(id),
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, codevertex_user_id)
);
```

Roles:

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

## 3.7 Profile mode

FleetOS is a business app.

AUTH Core should enforce:

```txt
profile_mode = business
requires_profile = true
```

Required business profile fields:

```txt
full_name
country
timezone
default_currency
```

FleetOS should not duplicate profile completion logic unless needed for tenant-specific onboarding.

---

## 3.8 Protected routes

FleetOS must protect:

```txt
/dashboard
/vehicles
/drivers
/bookings
/contracts
/assignments
/finance
/documents
/reports
/alerts
/settings
/owners
/operations
/owner
/driver
```

Public routes:

```txt
/login
/sso/callback
/book/:companySlug
/book/:companySlug/new
```

Potentially public but tenant-scoped:

```txt
/book/:companySlug
```

---

## 3.9 AUTH implementation phases

### Phase A — safe frontend integration

- Add environment variables.
- Implement platform links.
- Implement `auth.service.ts`.
- Implement login redirect.
- Implement `/sso/callback`.
- Implement local session context.
- Add route guards.

### Phase B — database identity mapping

- Add `codevertex_user_id` to local profiles.
- Add `tenant_users`.
- Backfill existing test users if needed.
- Add helper functions for current tenant/user.

### Phase C — tenant-aware app session

- Resolve tenant by domain/slug.
- Resolve current user tenant membership.
- Store selected tenant in session state.
- Apply tenant context to all data queries.

---

# 4. BILLING Core Integration

## 4.1 Billing responsibility

FleetOS must not integrate Stripe directly.

Billing flow:

```txt
FleetOS
→ Billing Core
→ Stripe
→ Billing Core webhook
→ entitlements
→ FleetOS validates entitlements
```

FleetOS must never send:

```txt
Stripe price IDs
Stripe product IDs
amounts
prices
lookup keys
Stripe secrets
```

FleetOS sends product codes only.

---

## 4.2 Product vs entitlement rule

Products are monetization entities.

Entitlements are permissions.

FleetOS must not check product codes for feature access.

Correct:

```ts
hasEntitlement("FLEETOS_BOOKINGS")
```

Incorrect:

```ts
hasEntitlement("FLEETOS_PRO")
```

---

## 4.3 Suggested FleetOS products

Product codes:

```txt
FLEETOS_STARTER
FLEETOS_PRO
FLEETOS_ENTERPRISE
FLEETOS_EXTRA_DRIVER_PACK
FLEETOS_EXTRA_VEHICLE_PACK
FLEETOS_SMS_WHATSAPP_PACK
FLEETOS_WHITE_LABEL_ADDON
```

Product examples:

### FLEETOS_STARTER

For small fleet businesses.

Suggested entitlements:

```txt
FLEETOS_CORE
FLEETOS_VEHICLES_LIMIT_10
FLEETOS_DRIVERS_LIMIT_10
FLEETOS_BOOKINGS_BASIC
FLEETOS_DOCUMENTS
FLEETOS_BASIC_REPORTS
```

### FLEETOS_PRO

For growing companies.

Suggested entitlements:

```txt
FLEETOS_CORE
FLEETOS_VEHICLES_LIMIT_50
FLEETOS_DRIVERS_LIMIT_50
FLEETOS_BOOKINGS
FLEETOS_ASSIGNMENTS
FLEETOS_FINANCE
FLEETOS_OWNER_PORTAL
FLEETOS_DRIVER_PORTAL
FLEETOS_REPORTS
FLEETOS_EXPORTS
```

### FLEETOS_ENTERPRISE

For larger operators.

Suggested entitlements:

```txt
FLEETOS_CORE
FLEETOS_UNLIMITED_VEHICLES
FLEETOS_UNLIMITED_DRIVERS
FLEETOS_ADVANCED_BOOKINGS
FLEETOS_DISPATCHER
FLEETOS_ADVANCED_FINANCE
FLEETOS_WHITE_LABEL
FLEETOS_CUSTOM_DOMAIN
FLEETOS_API_ACCESS
FLEETOS_ADVANCED_REPORTS
FLEETOS_PRIORITY_SUPPORT
```

---

## 4.4 Suggested entitlement matrix

| Entitlement | Purpose |
|---|---|
| `FLEETOS_CORE` | Basic access to FleetOS |
| `FLEETOS_VEHICLES` | Vehicle management |
| `FLEETOS_DRIVERS` | Driver management |
| `FLEETOS_BOOKINGS_BASIC` | Basic booking requests |
| `FLEETOS_BOOKINGS` | Full booking management |
| `FLEETOS_ADVANCED_BOOKINGS` | Advanced booking, buffers, recurrence |
| `FLEETOS_ASSIGNMENTS` | Driver/vehicle assignments |
| `FLEETOS_DRIVER_PORTAL` | Mobile driver portal |
| `FLEETOS_CUSTOMER_PORTAL` | Customer booking/trips portal |
| `FLEETOS_OWNER_PORTAL` | Owners/suppliers portal |
| `FLEETOS_FINANCE` | Expenses, incomes and payouts |
| `FLEETOS_REPORTS` | Reports dashboards |
| `FLEETOS_ADVANCED_REPORTS` | Advanced analytics |
| `FLEETOS_EXPORTS` | CSV/PDF exports |
| `FLEETOS_DOCUMENTS` | Document compliance |
| `FLEETOS_WHITE_LABEL` | Tenant branding |
| `FLEETOS_CUSTOM_DOMAIN` | Custom domain support |
| `FLEETOS_API_ACCESS` | API access |
| `FLEETOS_PRIORITY_SUPPORT` | Higher support tier |

Limit entitlements can be implemented as either:

```txt
FLEETOS_VEHICLES_LIMIT_10
FLEETOS_VEHICLES_LIMIT_50
```

or through Billing metadata/tenant plan limits.

For MVP, fixed entitlement codes are simpler.

---

## 4.5 Checkout contract

FleetOS should request checkout through Billing Core.

Canonical endpoint pattern:

```txt
POST /functions/v1/billing-core/v1/checkout
```

Payload:

```json
{
  "ecosystem_code": "codevertex",
  "app_code": "FLEETOS",
  "code": "FLEETOS_PRO",
  "success_url": "https://fleetos.codevertex.cc/billing/success",
  "cancel_url": "https://fleetos.codevertex.cc/billing/cancel"
}
```

For tenant-aware billing, include metadata only if Billing Core supports it:

```json
{
  "tenant_id": "..."
}
```

Do not add this until Billing Core explicitly accepts it.

---

## 4.6 Entitlement checks

FleetOS must fetch entitlements from Billing Core.

Endpoint pattern:

```txt
GET /functions/v1/billing-core/v1/users/{codevertex_user_id}/entitlements?app_code=FLEETOS
```

Rules:

- JWT required.
- User ID must match authenticated user.
- Only active entitlements should be returned.
- FleetOS should cache entitlements in the frontend session but never treat cache as source of truth for backend security.

---

## 4.7 Tenant billing model

FleetOS is B2B and multi-tenant.

Billing should eventually be tenant/organization-aware.

Recommended local tables:

```sql
create table if not exists public.tenant_billing_state (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  billing_customer_id text,
  billing_plan_code text,
  subscription_status text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
```

Do not store Stripe secrets locally.

Do not process Stripe webhooks in FleetOS.

---

## 4.8 Feature gates

Frontend gates:

```ts
if (!hasEntitlement("FLEETOS_FINANCE")) {
  return <PremiumLock feature="Finance" />;
}
```

Backend/RLS gates:

For hard business rules, use database or Edge Function checks.

Example:

```txt
Cannot create more than 10 active vehicles if tenant plan limit is 10.
```

This should not rely only on frontend checks.

---

## 4.9 Billing implementation phases

### Phase A — frontend placeholders

- Add Billing link in Settings.
- Add upgrade/plan screen.
- Add entitlement provider.
- Add premium locks.

### Phase B — Billing Core checkout

- Create checkout request through Billing Core.
- Use product code only.
- Redirect to Billing/Stripe Checkout.

### Phase C — entitlements

- Fetch entitlements.
- Gate UI.
- Gate backend actions later.

### Phase D — tenant plan limits

- Add tenant plan status.
- Enforce vehicle/driver limits.
- Add billing admin view for tenant owner.

---

# 5. HELP Core Integration

## 5.1 HELP responsibility

FleetOS must use:

```txt
https://help.codevertex.cc
```

HELP provides:

- contextual support
- FAQs
- articles by app
- onboarding guides
- troubleshooting
- future tickets
- future AI support

FleetOS must not build a parallel help center.

---

## 5.2 Required HELP variables

```env
VITE_HELP_BASE_URL=https://help.codevertex.cc
VITE_APP_CODE=FLEETOS
```

---

## 5.3 HELP URL helper

Create:

```ts
const APP_CODE = import.meta.env.VITE_APP_CODE || "FLEETOS";
const HELP_BASE_URL =
  import.meta.env.VITE_HELP_BASE_URL || "https://help.codevertex.cc";

export function getHelpUrl(screen?: string, locale = "pt-PT") {
  const params = new URLSearchParams({
    app: APP_CODE,
    locale,
  });

  if (screen) {
    params.set("screen", screen);
  }

  return `${HELP_BASE_URL}/help/${APP_CODE}?${params.toString()}`;
}
```

---

## 5.4 Required HELP context

FleetOS must send:

```txt
app=FLEETOS
screen=...
locale=...
```

Examples:

```txt
https://help.codevertex.cc/help/FLEETOS?app=FLEETOS&screen=vehicles&locale=pt-PT
```

---

## 5.5 Recommended FleetOS screen contexts

Admin/backoffice:

```txt
dashboard
vehicles
vehicle_detail
drivers
driver_detail
bookings
booking_detail
assignments
contracts
owners
suppliers
finance
expenses
incomes
payouts
documents
reports
alerts
settings
operations
dispatcher
```

Driver portal:

```txt
driver_home
driver_assignments
driver_schedule
driver_documents
driver_profile
driver_check_in
driver_check_out
damage_report
```

Customer booking portal:

```txt
customer_booking
customer_new_booking
customer_trips
customer_support
customer_profile
```

Billing/account:

```txt
billing
premium
subscription
account
login
sso_callback
```

---

## 5.6 Required HELP placements

FleetOS should include Help links in:

- Admin sidebar or topbar
- Settings
- Empty states
- Error states
- Billing/premium locks
- Booking form
- Driver portal
- Customer portal
- Owner/supplier portal
- Operations/dispatcher screens

Examples:

```ts
<a href={getHelpUrl("bookings", currentLocale)}>
  Help with bookings
</a>
```

```ts
<a href={getHelpUrl("driver_check_in", currentLocale)}>
  Help with vehicle check-in
</a>
```

---

## 5.7 Minimum HELP article package for FleetOS

Create at least these articles in HELP:

### Introduction

- What is FleetOS?
- How FleetOS works
- Who FleetOS is for

### Account/Auth

- How to access FleetOS
- Why I cannot access a company account
- How FleetOS roles work

### Tenants/Companies

- What is a FleetOS company workspace?
- How custom domains and branding work

### Vehicles

- How to add a vehicle
- How vehicle ownership works
- Company-owned vs external vehicles
- Vehicle document alerts

### Drivers

- How to add a driver
- How driver availability works
- How driver documents work

### Bookings

- How customer bookings work
- How to assign a driver
- Booking statuses explained

### Driver Portal

- How drivers check in
- How drivers check out
- How damage reporting works

### Finance

- How expenses and incomes work
- How payouts are calculated
- Owner/supplier payouts explained

### Reports

- How to read fleet reports
- How to export reports

### Billing

- How FleetOS plans work
- How to upgrade FleetOS
- What features are included in each plan

### Troubleshooting

- Booking not visible
- Driver cannot access portal
- Vehicle not available
- Document alert not updating
- Payout seems wrong

---

# 6. LEGAL Core Integration

## 6.1 LEGAL responsibility

FleetOS must use:

```txt
https://legal.codevertex.cc
```

Legal Core centralizes:

- Privacy Policy
- Terms of Service
- Cookie Policy
- Security
- GDPR rights
- Data Processing Agreement
- Subprocessors
- Data Request
- Delete Request

FleetOS must not duplicate legal documents locally.

---

## 6.2 Required LEGAL variables

```env
VITE_LEGAL_BASE_URL=https://legal.codevertex.cc
VITE_APP_CODE=FLEETOS
```

---

## 6.3 LEGAL URL helper

Create:

```ts
const APP_CODE = import.meta.env.VITE_APP_CODE || "FLEETOS";
const LEGAL_BASE_URL =
  import.meta.env.VITE_LEGAL_BASE_URL || "https://legal.codevertex.cc";

export function getLegalUrl(
  page:
    | "privacy"
    | "terms"
    | "cookies"
    | "security"
    | "gdpr"
    | "data-request"
    | "delete-request"
    | "dpa"
    | "subprocessors"
    | "contact" = "privacy"
) {
  return `${LEGAL_BASE_URL}/${page}?app=${APP_CODE}`;
}
```

---

## 6.4 Required legal links

FleetOS must link to:

```txt
https://legal.codevertex.cc/privacy?app=FLEETOS
https://legal.codevertex.cc/terms?app=FLEETOS
https://legal.codevertex.cc/cookies?app=FLEETOS
https://legal.codevertex.cc/gdpr?app=FLEETOS
https://legal.codevertex.cc/data-request?app=FLEETOS
https://legal.codevertex.cc/delete-request?app=FLEETOS
https://legal.codevertex.cc/security?app=FLEETOS
https://legal.codevertex.cc/dpa?app=FLEETOS
https://legal.codevertex.cc/subprocessors?app=FLEETOS
```

---

## 6.5 Required LEGAL placements

FleetOS must include Legal links in:

- login screen
- registration/signup redirect context
- footer/settings
- account/profile area
- billing area
- delete account/data request flows
- tenant admin settings
- customer booking portal footer/support
- owner portal profile/settings

---

## 6.6 Legal consent

AUTH Core should handle central Terms + Privacy acceptance during register.

FleetOS should not duplicate central consent.

However, FleetOS may later track tenant-specific operational consents if needed, for example:

- driver operational terms
- customer booking terms
- tenant-specific privacy notice
- supplier contract acknowledgement

These are not a replacement for Legal Core.

---

# 7. Combined Platform Links Service

Create one platform links file:

```ts
// src/lib/platformLinks.ts

export const APP_CODE = import.meta.env.VITE_APP_CODE || "FLEETOS";

export const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_BASE_URL || "https://auth.codevertex.cc";

export const BILLING_BASE_URL =
  import.meta.env.VITE_BILLING_BASE_URL || "https://billing.codevertex.cc";

export const HELP_BASE_URL =
  import.meta.env.VITE_HELP_BASE_URL || "https://help.codevertex.cc";

export const LEGAL_BASE_URL =
  import.meta.env.VITE_LEGAL_BASE_URL || "https://legal.codevertex.cc";

export function getLoginUrl(returnUrl = window.location.href) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: returnUrl,
  });

  return `${AUTH_BASE_URL}/auth/login?${params.toString()}`;
}

export function getRegisterUrl(returnUrl = window.location.href) {
  const params = new URLSearchParams({
    app: APP_CODE,
    return_url: returnUrl,
  });

  return `${AUTH_BASE_URL}/auth/register?${params.toString()}`;
}

export function getAccountUrl() {
  return `${AUTH_BASE_URL}/account/profile?app=${APP_CODE}`;
}

export function getSecurityUrl() {
  return `${AUTH_BASE_URL}/account/security?app=${APP_CODE}`;
}

export function getBillingUrl() {
  return `${BILLING_BASE_URL}?app=${APP_CODE}`;
}

export function getHelpUrl(screen?: string, locale = "pt-PT") {
  const params = new URLSearchParams({
    app: APP_CODE,
    locale,
  });

  if (screen) {
    params.set("screen", screen);
  }

  return `${HELP_BASE_URL}/help/${APP_CODE}?${params.toString()}`;
}

export function getLegalUrl(page = "privacy") {
  return `${LEGAL_BASE_URL}/${page}?app=${APP_CODE}`;
}
```

---

# 8. FleetOS Frontend Implementation Checklist

## AUTH

```txt
[ ] Add VITE_APP_CODE=FLEETOS
[ ] Add VITE_ECOSYSTEM_CODE=codevertex
[ ] Add Auth Core URLs
[ ] Implement platformLinks.ts
[ ] Implement auth.service.ts
[ ] Replace mock login with Auth Core redirect
[ ] Create /sso/callback
[ ] Prevent double ticket consume
[ ] Upsert local profile with codevertex_user_id
[ ] Resolve tenant access
[ ] Add ProtectedRoute
[ ] Add role-aware route guards
```

## BILLING

```txt
[ ] Add billing.service.ts
[ ] Add entitlement provider
[ ] Define FleetOS product codes
[ ] Define FleetOS entitlement codes
[ ] Add premium/plan UI in Settings
[ ] Add checkout call to Billing Core
[ ] Fetch entitlements
[ ] Gate premium features
[ ] Add tenant billing state
```

## HELP

```txt
[ ] Add getHelpUrl()
[ ] Add Help links in topbar/sidebar
[ ] Add Help links in empty states
[ ] Add Help links in errors
[ ] Add screen context per page
[ ] Pass locale
[ ] Prepare FleetOS HELP article package
```

## LEGAL

```txt
[ ] Add getLegalUrl()
[ ] Add legal links in login/settings/footer
[ ] Add privacy/terms/cookies/GDPR/delete request links
[ ] Ensure no local legal documents exist
[ ] Use ?app=FLEETOS everywhere
```

---

# 9. FleetOS Supabase Integration Checklist

FleetOS must adapt the existing Supabase project.

Required before real production use:

```txt
[ ] Add tenants
[ ] Add tenant_domains
[ ] Add tenant_settings
[ ] Add tenant_users
[ ] Add codevertex_user_id to profiles
[ ] Add tenant_id to operational tables
[ ] Backfill existing data
[ ] Add tenant helper functions
[ ] Update RLS to tenant-aware rules
[ ] Keep existing functions/triggers until replaced safely
[ ] Avoid destructive migrations
```

---

# 10. Recommended Implementation Order for Cursor

Use this order.

## Step 1 — Documentation commit

Add these docs to the repo:

```txt
docs/decisions/FLEETOS_PRODUCT_DECISIONS.md
docs/architecture/FLEETOS_MULTI_TENANT_ARCHITECTURE.md
docs/database/FLEETOS_SCHEMA_MIGRATION_V1.md
docs/integration/FLEETOS_CORE_INTEGRATION_IMPLEMENTATION.md
```

## Step 2 — Frontend platform links

- Add env variables.
- Add platform links service.
- Replace hardcoded Help/Legal/Auth/Billing URLs.

## Step 3 — AUTH skeleton

- Replace mock login.
- Add `/sso/callback`.
- Add protected route wrapper.
- Add auth context.

## Step 4 — FleetOS Supabase connection

- Add Supabase client.
- Add local profile upsert.
- Add tenant resolver.

## Step 5 — Tenant-aware data services

- Replace mock-data progressively.
- Start with dashboard/vehicles/drivers.
- Then bookings.
- Then finance/contracts/documents.

## Step 6 — Billing Core

- Add entitlement provider.
- Add plan/premium UI.
- Add checkout.
- Gate features.

## Step 7 — Help/Legal polish

- Add contextual screen helpers.
- Validate all links.

## Step 8 — Production hardening

- RLS test.
- Route guard test.
- Tenant isolation test.
- Vercel preview.
- Security audit.

---

# 11. Critical Rules

## Do

```txt
Use CodeVertex Auth.
Use CodeVertex Billing.
Use CodeVertex Help.
Use CodeVertex Legal.
Use codevertex_user_id.
Use tenant_id everywhere operational.
Use entitlements for feature gating.
Use app_code=FLEETOS.
```

## Do not

```txt
Do not create parallel auth.
Do not use email as canonical identity.
Do not call Stripe directly.
Do not store Stripe secrets in FleetOS.
Do not duplicate legal pages.
Do not store FleetOS operational data inside Core.
Do not remove existing FleetOS DB functions without replacement.
Do not rewrite RLS destructively in one pass.
```

---

# 12. Final Target State

FleetOS should operate as:

```txt
CodeVertex Core
  AUTH
  BILLING
  HELP
  LEGAL

FleetOS App
  React/Vite frontend
  FleetOS Supabase
  tenant-aware operational database
  white-label support
  CodeVertex identity mapping
  Billing entitlements
  contextual Help
  centralized Legal
```

This gives FleetOS both:

```txt
CodeVertex ecosystem consistency
+
independent white-label SaaS flexibility
```
