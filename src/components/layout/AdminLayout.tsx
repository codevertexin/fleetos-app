import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { mockUser, mockAlerts } from '@/lib/mock-data';
import {
  LayoutDashboard, Car, Users, Calendar, FileText, Link2,
  DollarSign, Receipt, TrendingUp, Send, Files, Bell,
  BarChart2, Settings, ChevronLeft, ChevronRight, Search,
  LogOut, Moon, Sun, AlertTriangle, Menu, X, User, Building2,
} from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Operations', items: [
    { path: '/vehicles', label: 'Vehicles', icon: Car },
    { path: '/drivers', label: 'Drivers', icon: Users },
    { path: '/bookings', label: 'Bookings', icon: Calendar },
    { path: '/assignments', label: 'Assignments', icon: Link2 },
    { path: '/owners', label: 'Suppliers & Owners', icon: Building2 },
  ]},
  { section: 'Finance', items: [
    { path: '/contracts', label: 'Contracts', icon: FileText },
    { path: '/finance', label: 'Finance', icon: Receipt },
  ]},
  { section: 'Compliance', items: [
    { path: '/documents', label: 'Documents', icon: Files },
    { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  ]},
  { section: 'Analytics', items: [
    { path: '/reports', label: 'Reports', icon: BarChart2 },
  ]},
  { section: 'System', items: [
    { path: '/settings', label: 'Settings', icon: Settings },
  ]},
];

interface AdminLayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

export function AdminLayout({ children, darkMode, setDarkMode }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const unreadAlerts = mockAlerts.filter(a => !a.isRead).length;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:relative inset-y-0 left-0 z-50 flex flex-col transition-all duration-300',
        'bg-[#0D2535] border-r border-white/5',
        collapsed ? 'w-16' : 'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-white/5', collapsed && 'justify-center px-2')}>
          <img src="/logo.png" alt="FleetOS" className="w-8 h-8 flex-shrink-0" />
          {!collapsed && (
            <div>
              <div className="font-bold text-white text-sm">FleetOS</div>
              <div className="text-xs text-white/40">by CodeVertex</div>
            </div>
          )}
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden text-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
          {navItems.map(section => (
            <div key={section.section}>
              {!collapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-2 mb-1">
                  {section.section}
                </p>
              )}
              {section.items.map(item => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors',
                      collapsed ? 'justify-center' : '',
                      isActive
                        ? 'bg-[#00B39A]/20 text-[#00B39A] font-medium'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.path === '/alerts' && unreadAlerts > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadAlerts}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-white/5 p-2">
          {!collapsed && (
            <div className="flex items-center gap-3 px-2 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-[#00B39A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                CM
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-xs font-medium truncate">{mockUser.name}</p>
                <p className="text-white/40 text-[10px] truncate">{mockUser.role.replace('_', ' ')}</p>
              </div>
            </div>
          )}
          <Link to="/login" className={cn('flex items-center gap-3 px-2 py-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 text-sm transition-colors', collapsed && 'justify-center')}>
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </Link>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-[#0D2535] border border-white/10 rounded-full p-1 text-white/60 hover:text-white hidden lg:flex"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search vehicles, drivers, bookings..."
                className="w-full bg-muted rounded-lg pl-9 pr-4 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadAlerts > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {unreadAlerts}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-xl w-80">
                    <div className="px-4 py-3 border-b border-border font-semibold text-sm">Alerts</div>
                    <div className="divide-y divide-border max-h-72 overflow-y-auto">
                      {mockAlerts.filter(a => !a.isRead).map(alert => (
                        <div key={alert.id} className="px-4 py-3 hover:bg-muted/50">
                          <p className="text-sm font-medium">{alert.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-border">
                      <Link to="/alerts" onClick={() => setNotificationsOpen(false)} className="text-xs text-[#00B39A] hover:underline">View all alerts</Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-8 h-8 rounded-full bg-[#00B39A] flex items-center justify-center text-white text-xs font-bold cursor-pointer">
              CM
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#F2F5F8] dark:bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
