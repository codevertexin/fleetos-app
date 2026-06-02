import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { PlatformAdminShell } from '@/components/internal/admin/PlatformAdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AdminBffError,
  createAdminSession,
  fetchAdminSession,
} from '@/lib/services/fleetos-admin-bff.service';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState('');
  const [reviewerLabel, setReviewerLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await fetchAdminSession();
        if (!cancelled && session.authenticated) {
          navigate('/internal/admin/applications', { replace: true });
          return;
        }
      } catch {
        // BFF unavailable — show login form
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const trimmed = token.trim();
      if (!trimmed) {
        setError('Operator token is required.');
        return;
      }

      setSubmitting(true);
      try {
        const res = await createAdminSession(trimmed, reviewerLabel);
        if (res.authenticated) {
          navigate('/internal/admin/applications', { replace: true });
          return;
        }
        setError('Sign-in did not create a session. Check your token and try again.');
      } catch (err) {
        if (err instanceof AdminBffError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : 'Sign-in failed.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [navigate, reviewerLabel, token],
  );

  if (checking) {
    return (
      <PlatformAdminShell title="Platform Admin">
        <div className="flex min-h-[40vh] items-center justify-center" role="status">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00B39A] border-t-transparent" />
        </div>
      </PlatformAdminShell>
    );
  }

  return (
    <PlatformAdminShell
      title="Platform Admin"
      subtitle="Sign in with your operator token to review company applications."
    >
      <div className="mx-auto max-w-md">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <Input
            label="Operator token"
            type="password"
            autoComplete="off"
            placeholder="Paste token from secure vault"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            icon={<KeyRound className="h-4 w-4" />}
            disabled={submitting}
          />
          <Input
            label="Reviewer label (optional)"
            type="text"
            autoComplete="email"
            placeholder="ops@codevertex.cc"
            value={reviewerLabel}
            onChange={(e) => setReviewerLabel(e.target.value)}
            disabled={submitting}
          />
          {error ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" loading={submitting}>
            Sign in
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Session is stored in an HttpOnly cookie. Tokens are never saved in the browser.
          </p>
        </form>
      </div>
    </PlatformAdminShell>
  );
}
