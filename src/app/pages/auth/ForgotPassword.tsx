import { useLayoutEffect } from 'react';
import { redirectToAuthCoreForgotPassword } from '@/lib/auth-redirect';

/**
 * Password recovery is owned by Auth Core — no local form.
 */
export default function ForgotPassword() {
  useLayoutEffect(() => {
    redirectToAuthCoreForgotPassword();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">Redirecting to account recovery…</p>
    </div>
  );
}
