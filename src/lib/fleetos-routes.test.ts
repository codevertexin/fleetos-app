import { describe, expect, it } from 'vitest';
import {
  COMPANY_ADMIN,
  isCompanyAdminPath,
  isFleetSetupDashboardNavActive,
  isFleetSetupWorkspaceNavActive,
  isOperationalAreaPath,
  LEGACY_ALIASES,
  normalizeFleetosRoutePath,
  OPERATIONS,
} from './fleetos-routes';

describe('normalizeFleetosRoutePath', () => {
  it('maps /app aliases to /admin', () => {
    expect(normalizeFleetosRoutePath('/app')).toBe(COMPANY_ADMIN.root);
    expect(normalizeFleetosRoutePath('/app/vehicles')).toBe(COMPANY_ADMIN.vehicles);
  });

  it('maps legacy dashboard to operations dashboard', () => {
    expect(normalizeFleetosRoutePath('/dashboard')).toBe(OPERATIONS.dashboard);
  });

  it('maps flat operational paths under /operations', () => {
    expect(normalizeFleetosRoutePath('/bookings')).toBe(OPERATIONS.bookings);
    expect(normalizeFleetosRoutePath('/bookings/abc')).toBe(`${OPERATIONS.bookings}/abc`);
  });
});

describe('path guards', () => {
  it('detects company admin and operational areas', () => {
    expect(isCompanyAdminPath('/admin/vehicles')).toBe(true);
    expect(isCompanyAdminPath('/app')).toBe(true);
    expect(isOperationalAreaPath('/operations/dashboard')).toBe(true);
    expect(isOperationalAreaPath(LEGACY_ALIASES.dashboard)).toBe(true);
    expect(isCompanyAdminPath('/operations/dashboard')).toBe(false);
  });
});

describe('Fleet Setup sidebar nav active', () => {
  it('highlights Dashboard only on operational paths, not /admin', () => {
    expect(isFleetSetupDashboardNavActive('/dashboard')).toBe(true);
    expect(isFleetSetupDashboardNavActive('/operations/dashboard')).toBe(true);
    expect(isFleetSetupDashboardNavActive('/admin')).toBe(false);
    expect(isFleetSetupDashboardNavActive('/admin/vehicles')).toBe(false);
  });

  it('highlights Setup on workspace setup paths', () => {
    expect(isFleetSetupWorkspaceNavActive('/admin')).toBe(true);
    expect(isFleetSetupWorkspaceNavActive('/admin/drivers')).toBe(true);
    expect(isFleetSetupWorkspaceNavActive('/dashboard')).toBe(false);
  });
});
