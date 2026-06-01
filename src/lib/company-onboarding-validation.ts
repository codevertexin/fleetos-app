import { isValidCompanySlug } from '@/lib/company-slug';

export interface CompanyFormValues {
  name: string;
  legal_name: string;
  slug: string;
  country_code: string;
  tax_id: string;
  locale: string;
  currency: string;
  timezone: string;
}

export type CompanyFormFieldErrors = Partial<Record<keyof CompanyFormValues | 'form', string>>;

export const COMPANY_ONBOARDING_DEFAULTS: Pick<
  CompanyFormValues,
  'country_code' | 'locale' | 'currency' | 'timezone'
> = {
  country_code: 'PT',
  locale: 'pt-PT',
  currency: 'EUR',
  timezone: 'Europe/Lisbon',
};

export function validateCompanyForm(values: CompanyFormValues): CompanyFormFieldErrors {
  const errors: CompanyFormFieldErrors = {};
  const name = values.name.trim();
  const legalName = values.legal_name.trim();
  const slug = values.slug.trim().toLowerCase();
  const country = values.country_code.trim().toUpperCase();
  const taxId = values.tax_id.trim().replace(/\s/g, '');

  if (name.length < 2 || name.length > 120) {
    errors.name = 'Company name must be 2–120 characters.';
  }
  if (legalName.length > 0 && (legalName.length < 2 || legalName.length > 200)) {
    errors.legal_name = 'Legal name must be 2–200 characters when provided.';
  }
  if (!isValidCompanySlug(slug)) {
    errors.slug = 'Slug must be 3–48 characters: lowercase letters, numbers, and hyphens only.';
  }
  if (!/^[A-Z]{2}$/.test(country)) {
    errors.country_code = 'Select a valid country (ISO code).';
  }
  if (!taxId) {
    errors.tax_id = 'Tax ID is required.';
  } else if (country === 'PT' && !/^\d{9}$/.test(taxId)) {
    errors.tax_id = 'Portuguese NIF must be 9 digits.';
  }

  return errors;
}

export function isCompanyFormValid(values: CompanyFormValues): boolean {
  return Object.keys(validateCompanyForm(values)).length === 0;
}

/** Payload sent to `fleetos-submit-company` (legal_name falls back to name). */
export function buildCompanySubmitBody(values: CompanyFormValues): { company: Record<string, string> } {
  const name = values.name.trim();
  const legalName = values.legal_name.trim() || name;
  return {
    company: {
      name,
      legal_name: legalName,
      slug: values.slug.trim().toLowerCase(),
      country_code: values.country_code.trim().toUpperCase(),
      tax_id: values.tax_id.trim().replace(/\s/g, ''),
      locale: values.locale.trim() || COMPANY_ONBOARDING_DEFAULTS.locale,
      currency: values.currency.trim() || COMPANY_ONBOARDING_DEFAULTS.currency,
      timezone: values.timezone.trim() || COMPANY_ONBOARDING_DEFAULTS.timezone,
    },
  };
}

const API_FIELD_KEYS: (keyof CompanyFormValues)[] = [
  'name',
  'legal_name',
  'slug',
  'country_code',
  'tax_id',
  'locale',
  'currency',
  'timezone',
];

export function mapApiFieldErrors(fields: Record<string, string>): CompanyFormFieldErrors {
  const out: CompanyFormFieldErrors = {};
  for (const [key, message] of Object.entries(fields)) {
    const field = key.replace(/^company\./, '') as keyof CompanyFormValues;
    if (API_FIELD_KEYS.includes(field)) {
      out[field] = message;
    } else {
      out.form = message;
    }
  }
  return out;
}
