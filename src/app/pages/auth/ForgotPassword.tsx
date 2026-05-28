import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getForgotPasswordUrl } from '@/lib/platformLinks';

/**
 * Production: password reset is owned by Auth Core — no local reset form.
 */
export default function ForgotPassword() {
  const authForgotUrl = getForgotPasswordUrl('/login');

  useEffect(() => {
    if (import.meta.env.PROD) {
      window.location.replace(authForgotUrl);
    }
  }, [authForgotUrl]);

  if (import.meta.env.PROD) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Redirecting to CodeVertex account recovery…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F2F5F8] dark:bg-background">
      <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.png" alt="FleetOS" className="w-8 h-8" />
          <span className="font-bold text-foreground">FleetOS</span>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">Reset your password</h2>
        <p className="text-sm text-muted-foreground mb-6">
          FleetOS does not reset passwords locally. Use CodeVertex Auth Core to recover access to
          your account.
        </p>

        <a
          href={authForgotUrl}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Continue in CodeVertex
          <ExternalLink className="w-4 h-4" aria-hidden />
        </a>

        <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
