import { NavLink, Outlet } from 'react-router-dom';
import { Car, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantProvider';
import { COMPANY_ADMIN } from '@/lib/fleetos-routes';

const NAV = [
  { to: COMPANY_ADMIN.root, label: 'Setup', icon: LayoutDashboard, end: true },
  { to: COMPANY_ADMIN.vehicles, label: 'Vehicles', icon: Car, end: false },
  { to: COMPANY_ADMIN.drivers, label: 'Drivers', icon: Users, end: false },
] as const;

export default function AppShellLayout() {
  const { logout } = useAuth();
  const { currentTenant, tenantBranding } = useTenant();
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
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#00B39A]/15 text-[#00B39A]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
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
          <Outlet />
        </div>
      </div>
    </div>
  );
}
