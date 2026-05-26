import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APP_CODE } from '@/lib/platformLinks';
import { consumeSsoTicket } from '@/lib/services/auth.service';
import { useAuth } from '@/contexts/AuthProvider';

const SSO_DONE_PREFIX = 'fleetos-sso-consumed:';
const SSO_PROCESSING_PREFIX = 'fleetos-sso-processing:';

export default function SsoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeSsoLogin } = useAuth();
  const [asyncError, setAsyncError] = useState<string | null>(null);

  const ticket = searchParams.get('ticket');
  const returnTo = searchParams.get('return_to') ?? '/dashboard';
  const safePath = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard';

  useEffect(() => {
    if (!ticket) return;

    const doneKey = `${SSO_DONE_PREFIX}${ticket}`;
    const processingKey = `${SSO_PROCESSING_PREFIX}${ticket}`;

    if (sessionStorage.getItem(doneKey)) {
      navigate(safePath, { replace: true });
      return;
    }

    if (sessionStorage.getItem(processingKey)) {
      return;
    }

    sessionStorage.setItem(processingKey, '1');

    let cancelled = false;

    (async () => {
      try {
        const result = await consumeSsoTicket({ app_code: APP_CODE, ticket });
        if (cancelled) return;
        completeSsoLogin(result);
        sessionStorage.setItem(doneKey, '1');
        sessionStorage.removeItem(processingKey);
        navigate(safePath, { replace: true });
      } catch {
        if (cancelled) return;
        sessionStorage.removeItem(processingKey);
        setAsyncError('Unable to complete sign-in. Please try again.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticket, safePath, navigate, completeSsoLogin]);

  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-destructive">Missing SSO ticket. Return to login and try again.</p>
        <a href="/login" className="text-sm text-[#00B39A] hover:underline">
          Back to login
        </a>
      </div>
    );
  }

  if (asyncError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-destructive">{asyncError}</p>
        <a href="/login" className="text-sm text-[#00B39A] hover:underline">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00B39A] border-t-transparent" />
      <span className="sr-only">Completing sign-in…</span>
    </div>
  );
}
