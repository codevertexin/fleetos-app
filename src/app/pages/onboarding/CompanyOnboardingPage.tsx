import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { slugifyCompanyName } from '@/lib/company-slug';
import {
  COMPANY_ONBOARDING_DEFAULTS,
  isCompanyFormValid,
  validateCompanyForm,
  type CompanyFormFieldErrors,
  type CompanyFormValues,
} from '@/lib/company-onboarding-validation';
import { fetchMyAccess, isGetMyAccessConfigured } from '@/lib/services/fleetos-access.service';
import {
  isSubmitCompanyConfigured,
  SubmitCompanyError,
  submitCompanyApplication,
} from '@/lib/services/fleetos-submit-company.service';
import { useAuth } from '@/contexts/AuthProvider';

const COUNTRY_OPTIONS = [
  { code: 'PT', label: 'Portugal' },
  { code: 'ES', label: 'Spain' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
] as const;

const INITIAL_VALUES: CompanyFormValues = {
  name: '',
  legal_name: '',
  slug: '',
  ...COMPANY_ONBOARDING_DEFAULTS,
  tax_id: '',
};

export default function CompanyOnboardingPage() {
  const navigate = useNavigate();
  const { user, logout, codevertexEdgeJwt, patchOperationalAccess } = useAuth();

  const [values, setValues] = useState<CompanyFormValues>(INITIAL_VALUES);
  const [slugManual, setSlugManual] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CompanyFormFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const edgeConfigured = isSubmitCompanyConfigured();
  const clientErrors = useMemo(() => validateCompanyForm(values), [values]);
  const formValid = isCompanyFormValid(values);
  const taxLabel = values.country_code === 'PT' ? 'NIF (tax ID)' : 'Tax ID';

  useEffect(() => {
    if (slugManual) return;
    const next = slugifyCompanyName(values.name);
    setValues(prev => (prev.slug === next ? prev : { ...prev, slug: next }));
  }, [values.name, slugManual]);

  const setField = useCallback((key: keyof CompanyFormValues, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => {
      if (!prev[key] && !prev.form) return prev;
      const next = { ...prev };
      delete next[key];
      delete next.form;
      return next;
    });
    setFormError(null);
  }, []);

  const finishWithPreview = useCallback(
    async (access: Awaited<ReturnType<typeof submitCompanyApplication>>['access']) => {
      patchOperationalAccess(access);
      setSuccessMessage(
        access.accessState === 'pending_review'
          ? 'Application submitted. Opening preview workspace…'
          : 'Redirecting…',
      );
      window.setTimeout(() => {
        navigate('/preview', { replace: true });
      }, 600);
    },
    [navigate, patchOperationalAccess],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setFormError(null);
    setSuccessMessage(null);

    const errors = validateCompanyForm(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const jwt = codevertexEdgeJwt?.trim();
    if (!jwt) {
      setFormError('Session expired. Please sign in again.');
      return;
    }
    if (!edgeConfigured) {
      setFormError('Company submission is not configured for this environment.');
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

    try {
      const result = await submitCompanyApplication(jwt, values);
      await finishWithPreview(result.access);
    } catch (err) {
      if (err instanceof SubmitCompanyError) {
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        }
        if (err.code === 'slug_taken') {
          setFieldErrors(prev => ({
            ...prev,
            slug: err.message,
          }));
        }
        if (
          err.code === 'pending_application_exists' ||
          err.code === 'already_has_active_membership'
        ) {
          const jwtRefresh = codevertexEdgeJwt?.trim();
          if (jwtRefresh && isGetMyAccessConfigured()) {
            try {
              const access = await fetchMyAccess(jwtRefresh);
              await finishWithPreview(access);
              return;
            } catch {
              // fall through to message + manual navigation
            }
          }
          if (err.code === 'pending_application_exists') {
            navigate('/preview', { replace: true });
            return;
          }
        }
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const showFieldValidation = submitAttempted && !submitting;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="FleetOS" className="mx-auto mb-4 h-14 w-14" />
          <h1 className="text-2xl font-bold text-foreground">Register your company</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Submit your FleetOS workspace application. After review you will access the preview
            workspace while approval is pending.
          </p>
          {user?.email ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
          noValidate
        >
          {formError ? (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </div>
          ) : null}

          {successMessage ? (
            <div
              className="rounded-lg border border-[#00B39A]/30 bg-[#00B39A]/10 px-3 py-2 text-sm text-foreground"
              role="status"
            >
              {successMessage}
            </div>
          ) : null}

          <Input
            label="Company name"
            required
            autoComplete="organization"
            placeholder="Acme Transport Lda"
            value={values.name}
            onChange={e => setField('name', e.target.value)}
            error={fieldErrors.name ?? (showFieldValidation ? clientErrors.name : undefined)}
            icon={<Building2 className="h-4 w-4" />}
            disabled={submitting || Boolean(successMessage)}
          />

          <Input
            label="Legal name (recommended)"
            autoComplete="organization"
            placeholder="Same as company name if sole trader"
            value={values.legal_name}
            onChange={e => setField('legal_name', e.target.value)}
            error={fieldErrors.legal_name ?? (showFieldValidation ? clientErrors.legal_name : undefined)}
            disabled={submitting || Boolean(successMessage)}
          />

          <div className="space-y-1">
            <Input
              label="Workspace URL slug"
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="acme-transport"
              value={values.slug}
              onChange={e => {
                setSlugManual(true);
                setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              }}
              error={fieldErrors.slug ?? (showFieldValidation ? clientErrors.slug : undefined)}
              disabled={submitting || Boolean(successMessage)}
            />
            <p className="text-xs text-muted-foreground">
              fleetos.app/<span className="font-mono text-foreground">{values.slug || 'your-slug'}</span>
              {!slugManual && values.name ? (
                <button
                  type="button"
                  className="ml-2 text-[#00B39A] hover:underline"
                  onClick={() => setSlugManual(false)}
                  disabled={submitting}
                >
                  Auto-generate from name
                </button>
              ) : null}
            </p>
          </div>

          <Select
            label="Country"
            required
            value={values.country_code}
            onChange={e => setField('country_code', e.target.value)}
            disabled={submitting || Boolean(successMessage)}
          >
            {COUNTRY_OPTIONS.map(c => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
          {fieldErrors.country_code ? (
            <p className="text-xs text-destructive">{fieldErrors.country_code}</p>
          ) : null}

          <Input
            label={taxLabel}
            required
            autoComplete="off"
            inputMode={values.country_code === 'PT' ? 'numeric' : 'text'}
            placeholder={values.country_code === 'PT' ? '123456789' : ''}
            value={values.tax_id}
            onChange={e => setField('tax_id', e.target.value)}
            error={fieldErrors.tax_id ?? (showFieldValidation ? clientErrors.tax_id : undefined)}
            disabled={submitting || Boolean(successMessage)}
          />

          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Regional defaults: locale <span className="font-mono text-foreground">{values.locale}</span>
            , currency <span className="font-mono text-foreground">{values.currency}</span>, timezone{' '}
            <span className="font-mono text-foreground">{values.timezone}</span>
          </p>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={submitting}
            disabled={!formValid || submitting || Boolean(successMessage) || !edgeConfigured}
          >
            Submit application
          </Button>

          {!edgeConfigured ? (
            <p className="text-center text-xs text-destructive">
              Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable submission.
            </p>
          ) : null}
        </form>

        <div className="mt-6 flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full max-w-lg"
            onClick={() => logout()}
            disabled={submitting}
          >
            Sign out
          </Button>
          <a href="/login" className="text-sm text-[#00B39A] hover:underline">
            Back to login
          </a>
        </div>

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          Protected account access by CodeVertex
        </p>
      </div>
    </div>
  );
}
