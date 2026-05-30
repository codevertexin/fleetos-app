import { useLayoutEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { redirectToAuthCoreLogin } from '@/lib/auth-redirect';
import { Button } from '@/components/ui/button';

/**
 * FleetOS does not host login UI — redirect to Auth Core unless user just signed out.
 */
export default function Login() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const signedOut = searchParams.get('signed_out') === '1';

  useLayoutEffect(() => {
    if (signedOut) return;
    redirectToAuthCoreLogin(location);
  }, [location, signedOut]);

  if (signedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center space-y-2 max-w-md">
          <h1 className="text-xl font-semibold text-foreground">Signed out</h1>
          <p className="text-sm text-muted-foreground">
            Your FleetOS session was cleared. Sign in again when you are ready to continue.
          </p>
        </div>
        <Button
          type="button"
          className="min-w-[200px]"
          onClick={() => {
            redirectToAuthCoreLogin({
              pathname: '/login',
              search: '',
              state: null,
            });
          }}
        >
          Sign in with CodeVertex
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
    </div>
  );
}
