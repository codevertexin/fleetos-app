# FleetOS --- Multi Tenant Architecture

## Core Tables

-   tenants
-   tenant_domains
-   tenant_settings
-   tenant_branding
-   tenant_users

## Operational Tables

All operational tables contain tenant_id.

Examples: - vehicles - drivers - owners_suppliers - bookings -
assignments - contracts - expenses - incomes - payouts - documents

## Identity

Identity source = AUTH Core

users.id codevertex_user_id

## Ownership

ownership_type: - company_owned - external_company - individual_owner -
leasing_partner

Critical: tenant != owner tenant != supplier
