import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { redirectToAuthCoreLogin } from '@/lib/auth-redirect';

/**
 * FleetOS does not host login UI — immediate redirect to Auth Core (branded FLEETOS).
 */
export default function Login() {
  const location = useLocation();

  useLayoutEffect(() => {
    redirectToAuthCoreLogin(location);
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
    </div>
  );
}
