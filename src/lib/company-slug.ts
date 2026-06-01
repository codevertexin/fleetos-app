const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Generate URL slug from company display name (P0 onboarding). */
export function slugifyCompanyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48)
    .replace(/-+$/, '');

  if (base.length >= 3 && SLUG_RE.test(base)) {
    return base;
  }
  if (base.length > 0) {
    const padded = `${base}-co`.slice(0, 48).replace(/-+$/, '');
    if (padded.length >= 3 && SLUG_RE.test(padded)) {
      return padded;
    }
  }
  return 'company';
}

export function isValidCompanySlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 3 && slug.length <= 48;
}
