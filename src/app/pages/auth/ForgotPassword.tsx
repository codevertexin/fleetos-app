import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F2F5F8] dark:bg-background">
      <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.png" alt="FleetOS" className="w-8 h-8" />
          <span className="font-bold text-foreground">FleetOS</span>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-[#00B39A] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground mb-6">
              We sent a password reset link to <strong>{email}</strong>
            </p>
            <Link to="/login">
              <Button variant="outline">Back to sign in</Button>
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-1">Forgot password?</h2>
            <p className="text-muted-foreground mb-6">Enter your email and we'll send you a reset link</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                Send Reset Link
              </Button>
            </form>

            <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
