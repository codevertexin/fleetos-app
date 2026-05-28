import { useAuth } from '@/contexts/AuthProvider';
import { getLegalUrl, getRegisterUrl } from '@/lib/platformLinks';
import { Button } from '@/components/ui/button';

export default function Login() {
  const { login, isLoading } = useAuth();

  const handleSignIn = () => {
    login();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0D2535] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full border-2 border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-white" />
        </div>
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-4 mb-8">
            <img src="/logo.png" alt="FleetOS" className="w-20 h-20" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">FleetOS</h1>
          <p className="text-white/60 text-lg mb-2">by CodeVertex</p>
          <p className="text-white/40 max-w-xs mt-4 leading-relaxed">
            Modern fleet management for TVDE companies, rental operators, and transfer services.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[['Active Fleets', '280+'], ['Drivers', '1,400+'], ['Trips/Month', '42K']].map(([label, value]) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-[#00B39A]">{value}</p>
                <p className="text-white/40 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="FleetOS" className="w-10 h-10" />
            <div>
              <h1 className="font-bold text-foreground">FleetOS</h1>
              <p className="text-xs text-muted-foreground">by CodeVertex</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground mb-8">
            Sign in with your CodeVertex account. FleetOS does not store passwords locally.
          </p>

          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={isLoading}
            onClick={handleSignIn}
          >
            Sign in with CodeVertex
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{' '}
            <a
              href={getRegisterUrl('/dashboard')}
              className="text-[#00B39A] hover:underline font-medium"
            >
              Create account
            </a>
          </p>

          {import.meta.env.DEV && (
            <p className="mt-6 text-xs text-center text-muted-foreground rounded-lg bg-muted/50 p-3">
              Local dev: see Phase 2 integration report for SSO callback testing.
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <a href={getLegalUrl('privacy')} target="_blank" rel="noopener noreferrer" className="hover:text-[#00B39A] hover:underline">
              Privacy
            </a>
            <a href={getLegalUrl('terms')} target="_blank" rel="noopener noreferrer" className="hover:text-[#00B39A] hover:underline">
              Terms
            </a>
            <a href={getLegalUrl('cookies')} target="_blank" rel="noopener noreferrer" className="hover:text-[#00B39A] hover:underline">
              Cookies
            </a>
            <a href={getLegalUrl('gdpr')} target="_blank" rel="noopener noreferrer" className="hover:text-[#00B39A] hover:underline">
              GDPR
            </a>
          </div>
          <p className="mt-3 text-xs text-center text-muted-foreground">
            FleetOS is part of the{' '}
            <a href="https://codevertex.cc" target="_blank" rel="noopener noreferrer" className="text-[#00B39A] hover:underline">
              CodeVertex
            </a>{' '}
            ecosystem
          </p>
        </div>
      </div>
    </div>
  );
}
