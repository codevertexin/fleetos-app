import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Car, Home, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantProvider';
import {
  COMPANY_ADMIN,
  isFleetSetupDashboardNavActive,
  isFleetSetupWorkspaceNavActive,
  LEGACY_ALIASES,
} from '@/lib/fleetos-routes';

type FleetSetupNavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  matchActive?: (pathname: string) => boolean;
};

const NAV: FleetSetupNavItem[] = [
  {
    to: LEGACY_ALIASES.dashboard,
    label: 'Dashboard',
    icon: LayoutDashboard,
    matchActive: isFleetSetupDashboardNavActive,
  },
  {
    to: COMPANY_ADMIN.root,
    label: 'Setup',
    icon: Home,
    matchActive: isFleetSetupWorkspaceNavActive,
  },
  { to: COMPANY_ADMIN.vehicles, label: 'Vehicles', icon: Car },
  { to: COMPANY_ADMIN.drivers, label: 'Drivers', icon: Users },
];

function navItemIsActive(
  pathname: string,
  to: string,
  custom?: (path: string) => boolean,
): boolean {
  if (custom) return custom(pathname);
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function AppShellLayout() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const {
    currentTenant,
    tenantBranding,
    isWorkspaceTenantsLoading,
    noWorkspaceAvailable,
  } = useTenant();
  const companyName = tenantBranding?.companyName ?? currentTenant?.name ?? 'FleetOS';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="border-b md:border-b-0 md:border-r border-border bg-card md:w-56 md:shrink-0">
        <div className="px-4 py-4 border-b border-border">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fleet setup
          </p>
          <p className="font-semibold truncate">{companyName}</p>
        </div>
        <nav className="flex md:flex-col gap-1 p-2 overflow-x-auto">
          {NAV.map(({ to, label, icon: Icon, matchActive }) => {
            const active = navItemIsActive(pathname, to, matchActive);
            return (
            <NavLink
              key={to}
              to={to}
              className={() =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#00B39A]/15 text-[#00B39A]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
            );
          })}
        </nav>
        <div className="hidden md:block p-2 mt-auto border-t border-border">
          <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <span className="font-semibold truncate">{companyName}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 overflow-auto">
          {isWorkspaceTenantsLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center p-6" role="status">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00B39A] border-t-transparent" />
            </div>
          ) : noWorkspaceAvailable ? (
            <div className="p-6 max-w-lg">
              <Card className="p-6 space-y-3">
                <h1 className="text-lg font-semibold">No workspace available</h1>
                <p className="text-sm text-muted-foreground">
                  Your account is signed in, but FleetOS could not find an active workspace to
                  manage. Complete company onboarding or ask an administrator to grant you access
                  to a tenant.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
                  Sign out
                </Button>
              </Card>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}
