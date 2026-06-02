import { useEffect } from 'react';
import { LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlatformAdminShellProps {
  title: string;
  subtitle?: string;
  onLogout?: () => void;
  logoutLoading?: boolean;
  children: React.ReactNode;
}

/** Forces dark theme for internal platform admin pages. */
export function PlatformAdminShell({
  title,
  subtitle,
  onLogout,
  logoutLoading,
  children,
}: PlatformAdminShellProps) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      // Restore user preference from App root on unmount
      try {
        const saved = localStorage.getItem('fleetos-dark') === 'true';
        if (!saved) {
          document.documentElement.classList.remove('dark');
        }
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#00B39A]/15 p-2">
              <Shield className="h-5 w-5 text-[#00B39A]" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                FleetOS Internal
              </p>
              <h1 className="text-lg font-semibold leading-tight">{title}</h1>
              {subtitle ? (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {onLogout ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={logoutLoading}
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
