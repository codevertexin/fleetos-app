import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  topbar?: React.ReactNode;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

export function MobileLayout({ children, navItems, topbar }: MobileLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background overflow-hidden relative shadow-2xl">
      {/* Topbar */}
      {topbar && (
        <header className="flex-shrink-0 bg-[#0D2535] text-white z-10">
          {topbar}
        </header>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="absolute bottom-0 left-0 right-0 bg-card border-t border-border z-10">
        <div className="flex">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 px-2 transition-colors min-h-[56px] justify-center',
                  isActive ? 'text-[#00B39A]' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn('w-5 h-5', isActive && 'text-[#00B39A]')}>{item.icon}</div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
