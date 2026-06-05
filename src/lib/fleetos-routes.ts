/**
 * FleetOS route map — canonical paths and temporary legacy aliases.
 * @see docs/integration/FLEETOS_ROUTES.md
 */

/** Company Admin / setup (real config: vehicles P2.1+, drivers, billing, settings). */
export const COMPANY_ADMIN = {
  root: '/admin',
  vehicles: '/admin/vehicles',
  drivers: '/admin/drivers',
  team: '/admin/team',
  billing: '/admin/billing',
  settings: '/admin/settings',
} as const;

/** Daily operations (legacy `pages/admin/*` components; paths under `/operations/*`). */
export const OPERATIONS = {
  root: '/operations',
  dashboard: '/operations/dashboard',
  bookings: '/operations/bookings',
  assignments: '/operations/assignments',
  alerts: '/operations/alerts',
  reports: '/operations/reports',
  finance: '/operations/finance',
  /** Dispatcher portal (tabs) — was `/operations/*`. */
  dispatch: '/operations/dispatch',
} as const;

export const OPERATIONAL_HOME = OPERATIONS.dashboard;

/** Temporary aliases (Edge / bookmarks may still use these). */
export const LEGACY_ALIASES = {
  app: '/app',
  appVehicles: '/app/vehicles',
  appDrivers: '/app/drivers',
  dashboard: '/dashboard',
  vehiclesMock: '/vehicles',
  bookings: '/bookings',
  assignments: '/assignments',
  alerts: '/alerts',
  reports: '/reports',
  finance: '/finance',
} as const;

const COMPANY_ADMIN_PREFIXES = ['/admin', '/app'] as const;
const OPERATIONS_PREFIXES = ['/operations', '/dashboard'] as const;

export function isCompanyAdminPath(pathname: string): boolean {
  return COMPANY_ADMIN_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isOperationalAreaPath(pathname: string): boolean {
  return OPERATIONS_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Fleet Setup sidebar — Dashboard item (not workspace setup at `/admin`). */
export function isFleetSetupDashboardNavActive(pathname: string): boolean {
  return (
    pathname === LEGACY_ALIASES.dashboard ||
    pathname.startsWith(`${OPERATIONS.root}/`)
  );
}

/** Fleet Setup sidebar — Setup item (`/admin` workspace setup). */
export function isFleetSetupWorkspaceNavActive(pathname: string): boolean {
  return pathname === COMPANY_ADMIN.root || pathname.startsWith(`${COMPANY_ADMIN.root}/`);
}

/** Maps legacy `/app` and flat operational paths to canonical routes. */
export function normalizeFleetosRoutePath(path: string): string {
  const p = path.trim();
  if (!p) return COMPANY_ADMIN.root;

  if (p === LEGACY_ALIASES.app || p === `${LEGACY_ALIASES.app}/`) {
    return COMPANY_ADMIN.root;
  }
  if (p.startsWith(`${LEGACY_ALIASES.app}/`)) {
    return `${COMPANY_ADMIN.root}${p.slice(LEGACY_ALIASES.app.length)}`;
  }

  if (p === LEGACY_ALIASES.dashboard) {
    return OPERATIONS.dashboard;
  }

  const operationalRedirects: Record<string, string> = {
    [LEGACY_ALIASES.bookings]: OPERATIONS.bookings,
    [LEGACY_ALIASES.assignments]: OPERATIONS.assignments,
    [LEGACY_ALIASES.alerts]: OPERATIONS.alerts,
    [LEGACY_ALIASES.reports]: OPERATIONS.reports,
    [LEGACY_ALIASES.finance]: OPERATIONS.finance,
    '/expenses': OPERATIONS.finance,
    '/incomes': `${OPERATIONS.finance}?tab=incomes`,
    '/payouts': `${OPERATIONS.finance}?tab=payouts`,
  };

  if (operationalRedirects[p]) {
    return operationalRedirects[p];
  }

  if (p.startsWith(`${LEGACY_ALIASES.bookings}/`)) {
    return `${OPERATIONS.bookings}${p.slice(LEGACY_ALIASES.bookings.length)}`;
  }

  return p;
}
