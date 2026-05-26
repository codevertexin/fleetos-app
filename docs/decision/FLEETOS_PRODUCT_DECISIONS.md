# FleetOS --- Product Decisions

Status: Canonical Product Decisions Owner: CodeVertex Type: Multi-tenant
White-label B2B SaaS

## Product Positioning

FleetOS serves TVDE companies, rental companies, transfer businesses and
fleet operators.

Operational data never belongs inside CodeVertex Core.

## Ecosystem Position

FleetOS belongs to CodeVertex ecosystem.

Shared Core: - AUTH - BILLING - HELP - LEGAL

FleetOS owns: - own Supabase - own schema - own Edge Functions - own
Storage - own RLS

## Multi Tenant

Tenant = FleetOS customer company.

Tenant may manage: - own vehicles - leasing vehicles - external company
vehicles - private owner vehicles

Rules: - tenant != owner - tenant != supplier

## White Label

Supports custom domains, branding, colors, locale, currency and
timezone.

Development domain: fleetos.codevertex.cc

## Identity

Canonical identity: codevertex_user_id

## Billing

FleetOS -\> Billing Core -\> Stripe

Never Stripe directly.
