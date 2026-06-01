import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { inferAccessFromMembership, readAccessRedirect, shouldSyncIdentityAfterSso } from '@/lib/access-routing';
import { APP_CODE } from '@/lib/platformLinks';
import { readAuthSession } from '@/lib/session-storage';
import {
  fetchMyAccess,
  isGetMyAccessConfigured,
} from '@/lib/services/fleetos-access.service';
import {
  AuthCoreError,
  consumeSsoTicket,
  isSsoConsumeConfigured,
} from '@/lib/services/auth.service';
import { syncOperationalIdentityAfterSso } from '@/lib/services/fleetos-identity-sync.service';
import { useAuth } from '@/contexts/AuthProvider';
import type { FleetosOperationalAccess } from '@/types/fleetos-access';
import type { SsoConsumeResult } from '@/lib/services/auth.service';

const SSO_DONE_PREFIX = 'fleetos-sso-consumed:';
const SSO_PROCESSING_PREFIX = 'fleetos-sso-processing:';

/** One in-flight consume per ticket (survives StrictMode remount; avoids duplicate POST). */
const inFlightConsumeByTicket = new Map<string, Promise<SsoConsumeResult>>();

function devLog(event: string, detail?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  if (detail) {
    console.info(`[fleetos:sso-callback] ${event}`, detail);
  } else {
    console.info(`[fleetos:sso-callback] ${event}`);
  }
}

function warnDevEnvOnce(): void {
  if (!import.meta.env.DEV || isSsoConsumeConfigured()) return;
  console.warn(
    '[fleetos:sso-callback] VITE_AUTH_SSO_CONSUME_URL is not set — using DEV mock only. ' +
      'Real Auth Core tickets will NOT be consumed. Set VITE_AUTH_SSO_CONSUME_URL in .env.local and restart the dev server.',
  );
}

function resolveCachedDestination(): string {
  const stored = readAuthSession();
  if (stored?.operationalAccess) {
    return readAccessRedirect(stored.operationalAccess);
  }
  if (stored?.fleetosMembershipStatus) {
    return readAccessRedirect(inferAccessFromMembership(stored.fleetosMembershipStatus));
  }
  return '/onboarding/company';
}

async function resolveOperationalAccess(
  result: SsoConsumeResult,
): Promise<FleetosOperationalAccess | null> {
  const edgeJwt = result.codevertexEdgeJwt?.trim();
  if (edgeJwt && isGetMyAccessConfigured()) {
    return fetchMyAccess(edgeJwt);
  }
  if (import.meta.env.DEV) {
    return inferAccessFromMembership(result.fleetosMembershipStatus);
  }
  return null;
}

function consumeTicketOnce(ticket: string): Promise<SsoConsumeResult> {
  const existing = inFlightConsumeByTicket.get(ticket);
  if (existing) {
    devLog('consume called', { ticket, deduped: true });
    return existing;
  }

  devLog('consume called', {
    ticket,
    mode: isSsoConsumeConfigured() ? 'auth-core' : 'dev-mock',
  });

  const promise = consumeSsoTicket({ app_code: APP_CODE, ticket }).finally(() => {
    inFlightConsumeByTicket.delete(ticket);
  });
  inFlightConsumeByTicket.set(ticket, promise);
  return promise;
}

function clearOrphanProcessingKey(processingKey: string, doneKey: string): void {
  if (!sessionStorage.getItem(processingKey) || sessionStorage.getItem(doneKey)) {
    return;
  }
  sessionStorage.removeItem(processingKey);
  devLog('processing retry', { reason: 'orphan processingKey cleared' });
}

export default function SsoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeSsoLogin } = useAuth();
  const [asyncError, setAsyncError] = useState<string | null>(null);

  const ticket = searchParams.get('ticket');

  useEffect(() => {
    if (!ticket) return;

    warnDevEnvOnce();

    const doneKey = `${SSO_DONE_PREFIX}${ticket}`;
    const processingKey = `${SSO_PROCESSING_PREFIX}${ticket}`;

    if (sessionStorage.getItem(doneKey)) {
      devLog('callback completed', { ticket, fromCache: true });
      navigate(resolveCachedDestination(), { replace: true });
      return;
    }

    clearOrphanProcessingKey(processingKey, doneKey);
    sessionStorage.setItem(processingKey, '1');

    devLog('callback started', {
      ticket,
      app: searchParams.get('app') ?? APP_CODE,
      consumeMode: isSsoConsumeConfigured() ? 'auth-core' : 'dev-mock',
    });

    let cancelled = false;

    (async () => {
      try {
        const result = await consumeTicketOnce(ticket);
        if (cancelled) return;

        let access: FleetosOperationalAccess | null = null;
        try {
          access = await resolveOperationalAccess(result);
          devLog('get-my-access ok', {
            access_state: access?.accessState,
            redirect: access ? readAccessRedirect(access) : null,
          });
        } catch (e) {
          console.warn('[fleetos:sso-callback] get-my-access error', e);
          if (import.meta.env.DEV) {
            access = inferAccessFromMembership(result.fleetosMembershipStatus);
          } else {
            throw e;
          }
        }

        if (cancelled) return;

        let operational: Awaited<ReturnType<typeof syncOperationalIdentityAfterSso>> = null;
        const shouldSync =
          shouldSyncIdentityAfterSso(access?.accessState) &&
          Boolean(result.codevertexEdgeJwt?.trim());

        if (shouldSync) {
          devLog('sync called', { access_state: access?.accessState });
          try {
            operational = await syncOperationalIdentityAfterSso(result);
          } catch (e) {
            console.warn('[fleetos:sso-callback] sync error', e);
          }
        } else {
          devLog('sync skipped', {
            access_state: access?.accessState,
            hasEdgeJwt: Boolean(result.codevertexEdgeJwt?.trim()),
          });
        }

        if (cancelled) return;

        completeSsoLogin(result, operational ?? undefined, access ?? undefined);
        sessionStorage.setItem(doneKey, '1');
        sessionStorage.removeItem(processingKey);

        const destination = access ? readAccessRedirect(access) : '/onboarding/company';
        devLog('callback completed', { ticket, destination });
        navigate(destination, { replace: true });
      } catch (error) {
        if (cancelled) return;
        sessionStorage.removeItem(processingKey);
        const message =
          error instanceof AuthCoreError
            ? error.message
            : 'Unable to complete sign-in. Please try again.';
        devLog('callback error', {
          ticket,
          message: error instanceof Error ? error.message : String(error),
        });
        setAsyncError(message);
      }
    })();

    return () => {
      cancelled = true;
      if (sessionStorage.getItem(processingKey) && !sessionStorage.getItem(doneKey)) {
        sessionStorage.removeItem(processingKey);
        devLog('processing retry', { reason: 'cleanup removed processingKey (StrictMode)' });
      }
    };
  }, [ticket, navigate, completeSsoLogin, searchParams]);

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00B39A] border-t-transparent" />
      <span className="sr-only">Completing sign-in…</span>
      {import.meta.env.DEV && !isSsoConsumeConfigured() && (
        <p className="max-w-md text-center text-xs text-muted-foreground">
          Dev mock: set <code className="text-foreground">VITE_AUTH_SSO_CONSUME_URL</code> in{' '}
          <code className="text-foreground">.env.local</code> to consume real Auth Core tickets.
        </p>
      )}
    </div>
  );
}
