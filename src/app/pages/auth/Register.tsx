import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { redirectToAuthCoreRegister } from '@/lib/auth-redirect';

/**
 * FleetOS does not host registration UI — immediate redirect to Auth Core (branded FLEETOS).
 */
export default function Register() {
  const location = useLocation();

  useLayoutEffect(() => {
    redirectToAuthCoreRegister(location);
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">Redirecting to create account…</p>
    </div>
  );
}
