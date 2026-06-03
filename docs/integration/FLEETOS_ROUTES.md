# FleetOS — Route map (frontend)

Canonical URL structure aligned with `src/app/pages/*` domains. Edge `redirect_path` values (`/app`, `/dashboard`) are **unchanged**; the SPA normalizes them on read.

## Canonical routes

| Prefix | Purpose | Access gate |
|--------|---------|-------------|
| `/admin/*` | Company Admin / setup | `active_unsubscribed`, `active` |
| `/operations/*` | Daily operations | `active` (`ProtectedRoute`) |
| `/driver/*` | Driver portal | `ProtectedRoute` |
| `/book/*` | Customer portal | Public |
| `/internal/admin/*` | Platform reviewer (CodeVertex) | BFF cookie |
| `/onboarding/company` | Company onboarding | `needs_onboarding` |
| `/preview` | Pending approval preview | `pending_review` |

### Company Admin (`/admin`)

| Path | Page | Notes |
|------|------|--------|
| `/admin` | Setup home | Checklist |
| `/admin/vehicles` | `VehiclesListPage` | **P2.1 real fleet** (Edge) |
| `/admin/drivers` | `DriversListPage` | **P2.2 real fleet** (Edge) |
| `/admin/settings` | — | Planned (alias → `/settings` legacy) |

### Operations (`/operations`)

| Path | Page | Notes |
|------|------|--------|
| `/operations/dashboard` | `admin/Dashboard` | Operational home |
| `/operations/bookings` | `admin/Bookings` | |
| `/operations/assignments` | `admin/Assignments` | |
| `/operations/alerts` | `admin/Alerts` | |
| `/operations/reports` | `admin/Reports` | |
| `/operations/finance` | `admin/Finance` | |
| `/operations/dispatch` | `operations/OperationsPortal` | Dispatcher tabs (was `/operations`) |

### Legacy (still mounted, not in primary nav)

| Path | Page | Nav |
|------|------|-----|
| `/vehicles`, `/vehicles/:id` | `admin/Vehicles` mock | Use `/admin/vehicles` instead |
| `/drivers`, `/drivers/:id` | `admin/Drivers` mock | Use `/admin/drivers` instead |
| `/contracts`, `/owners`, `/documents` | `pages/admin/*` | Flat paths until `/admin/*` migration |

## Temporary aliases

| Alias | Redirects to |
|-------|----------------|
| `/app` | `/admin` |
| `/app/vehicles` | `/admin/vehicles` |
| `/app/drivers` | `/admin/drivers` |
| `/app/*` | `/admin` |
| `/dashboard` | `/operations/dashboard` |
| `/bookings` | `/operations/bookings` |
| `/assignments` | `/operations/assignments` |
| `/alerts` | `/operations/alerts` |
| `/reports` | `/operations/reports` |
| `/finance`, `/expenses`, `/incomes`, `/payouts` | `/operations/finance` (or tab query) |
| `/operations` (index) | `/operations/dashboard` |

`normalizeFleetosRoutePath()` in `src/lib/fleetos-routes.ts` also maps Edge `redirect_path` `/app` → `/admin` in `access-routing.ts`.

## Navigation

- **AdminLayout** sidebar: Company admin → `/admin/*`; Operations → `/operations/*` (not `/app/vehicles` or legacy `/vehicles` mock).
- **AppShellLayout** (setup shell): `/admin`, `/admin/vehicles`, `/admin/drivers`.

## P2.1 / P2.2

Real vehicle CRUD: **`/admin/vehicles`** only. Do not link the operational menu to `/app/vehicles` or legacy `/vehicles`.

Real driver CRUD: **`/admin/drivers`** only. Do not link setup to legacy `/drivers` mock.
