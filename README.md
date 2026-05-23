# FleetOS — Fleet Management Platform

**by CodeVertex** · Frontend-only SaaS · Ready for Vercel

---

## Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + Vite 7 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + tw-animate-css |
| Components | Custom shadcn-style UI (src/components/ui/) |
| Routing | React Router v7 |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |

---

## Project Structure

```
src/
  app/
    App.tsx                  ← root router
    pages/
      admin/                 ← Dashboard, Vehicles, Drivers, Bookings,
      |                        BookingDetail, VehicleDetail, DriverDetail,
      |                        Contracts, Assignments, Finance, Documents,
      |                        Alerts, Reports, Settings
      auth/                  ← Login, ForgotPassword
      customer/              ← CustomerBook, CustomerTrips, CustomerSupport, CustomerProfile
      driver/                ← DriverHome, DriverAssignments, DriverSchedule,
      |                        DriverDocuments, DriverProfile
      owner/                 ← OwnerPortal
      operations/            ← OperationsPortal (Dispatcher)
  components/
    layout/                  ← AdminLayout, MobileLayout
    ui/                      ← Button, Card, Badge, Input, Table, Tabs,
                               Modal, Skeleton, Separator
  lib/
    mock-data.ts             ← All demo data (replace with Supabase queries)
    utils.ts                 ← cn(), formatCurrency(), formatDateTime()
    services/
      auth.service.ts        ← Placeholder → auth.codevertex.cc
      billing.service.ts     ← Placeholder → billing.codevertex.cc
      help.service.ts        ← Placeholder → help.codevertex.cc
      legal.service.ts       ← Placeholder → legal.codevertex.cc
      supabase.service.ts    ← Placeholder → Supabase (commented out)
  types/
    index.ts                 ← All TypeScript types
  styles.css                 ← Tailwind + CSS variables (light/dark)
  main.tsx                   ← Entry point
public/
  logo.png
  favicon.ico
```

---

## Routes

| Path | Portal | Layout |
|---|---|---|
| `/login` | Auth | Standalone |
| `/forgot-password` | Auth | Standalone |
| `/dashboard` | Admin | AdminLayout (sidebar + topbar) |
| `/vehicles`, `/vehicles/:id` | Admin | AdminLayout |
| `/drivers`, `/drivers/:id` | Admin | AdminLayout |
| `/bookings`, `/bookings/:id` | Admin | AdminLayout |
| `/contracts` | Admin | AdminLayout |
| `/assignments` | Admin | AdminLayout |
| `/finance` | Admin | AdminLayout |
| `/documents` | Admin | AdminLayout |
| `/alerts` | Admin | AdminLayout |
| `/reports` | Admin | AdminLayout |
| `/settings` | Admin | AdminLayout |
| `/owner/*` | Owner Portal | Standalone (tabs) |
| `/operations/*` | Operations / Dispatcher | Standalone (tabs) |
| `/driver` | Driver App | MobileLayout (bottom nav) |
| `/driver/assignments` | Driver App | MobileLayout |
| `/driver/schedule` | Driver App | MobileLayout |
| `/driver/documents` | Driver App | MobileLayout |
| `/driver/profile` | Driver App | MobileLayout |
| `/book/:companySlug` | Customer App | MobileLayout |
| `/book/:companySlug/trips` | Customer App | MobileLayout |
| `/book/:companySlug/support` | Customer App | MobileLayout |
| `/book/:companySlug/profile` | Customer App | MobileLayout |

---

## Dev

```bash
bun install
bun run dev          # http://localhost:5173
bun run build        # production build → dist/
bun run preview      # preview production build
```

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Framework: **Vite** (auto-detected)
4. Build command: `bun run build`
5. Output dir: `dist`
6. No environment variables needed (mock data only)

The `vercel.json` at root handles SPA routing rewrites.

---

## Connecting Supabase (future)

1. `bun add @supabase/supabase-js`
2. Add to Vercel env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Uncomment `src/lib/services/supabase.service.ts`
4. Replace `mockXxx` imports in pages with real Supabase queries

---

## CodeVertex External Services

| Service | Placeholder file | Future endpoint |
|---|---|---|
| Auth | `src/lib/services/auth.service.ts` | `auth.codevertex.cc` |
| Billing | `src/lib/services/billing.service.ts` | `billing.codevertex.cc` |
| Help | `src/lib/services/help.service.ts` | `help.codevertex.cc` |
| Legal | `src/lib/services/legal.service.ts` | `legal.codevertex.cc` |
