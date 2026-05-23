import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Login() {
  const [email, setEmail] = useState('carlos@fleetos.app');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'admin' | 'driver' | 'customer'>('admin');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    if (role === 'admin') navigate('/dashboard');
    else if (role === 'driver') navigate('/driver');
    else navigate('/book/demo-company');
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
          <p className="text-muted-foreground mb-8">Sign in to your account</p>

          {/* Role selector (demo only) */}
          <div className="mb-6 p-1 bg-muted rounded-xl flex gap-1">
            {(['admin', 'driver', 'customer'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${role === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mb-6 text-center -mt-3">Demo: pick a role to preview different experiences</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-input" /> Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-[#00B39A] hover:underline">Forgot password?</Link>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-xs text-center text-muted-foreground">
            FleetOS is part of the{' '}
            <a href="https://codevertex.cc" className="text-[#00B39A] hover:underline">CodeVertex</a>{' '}
            ecosystem
          </p>
        </div>
      </div>
    </div>
  );
}
