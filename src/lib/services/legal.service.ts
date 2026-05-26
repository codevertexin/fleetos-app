/**
 * Legal Service — CodeVertex Legal Core
 * URLs are built via platformLinks (do not duplicate legal pages locally).
 */

import {
  getLegalUrl,
  openExternalUrl,
  LEGAL_BASE_URL,
  type LegalPage,
} from '@/lib/platformLinks';

export { LEGAL_BASE_URL as LEGAL_CORE_URL };

/** @deprecated Prefer getLegalUrl() — kept for existing imports */
export const LEGAL_LINKS = {
  privacyPolicy: getLegalUrl('privacy'),
  termsOfService: getLegalUrl('terms'),
  cookiePolicy: getLegalUrl('cookies'),
  gdpr: getLegalUrl('gdpr'),
  dataRequest: getLegalUrl('data-request'),
  deleteRequest: getLegalUrl('delete-request'),
  security: getLegalUrl('security'),
  dpa: getLegalUrl('dpa'),
  subprocessors: getLegalUrl('subprocessors'),
  contact: getLegalUrl('contact'),
} as const;

export type LegalLinkKey = keyof typeof LEGAL_LINKS;

export interface LegalDocument {
  id: string;
  title: string;
  version: string;
  updatedAt: string;
  url: string;
  required: boolean;
  acceptedAt?: string;
}

// TODO: Replace → GET https://legal.codevertex.cc/api/documents
export async function getLegalDocuments(): Promise<LegalDocument[]> {
  await delay(200);
  return [
    { id: 'pp', title: 'Privacy Policy', version: '2.1', updatedAt: '2024-01-01', url: LEGAL_LINKS.privacyPolicy, required: true, acceptedAt: '2024-01-15' },
    { id: 'tos', title: 'Terms of Service', version: '3.0', updatedAt: '2024-01-01', url: LEGAL_LINKS.termsOfService, required: true, acceptedAt: '2024-01-15' },
    { id: 'dpa', title: 'Data Processing Agreement', version: '1.2', updatedAt: '2023-06-01', url: LEGAL_LINKS.dpa, required: true, acceptedAt: '2024-01-15' },
    { id: 'gdpr', title: 'GDPR Compliance Statement', version: '1.0', updatedAt: '2023-01-01', url: LEGAL_LINKS.gdpr, required: false },
  ];
}

// TODO: Replace → POST https://legal.codevertex.cc/api/accept
export async function acceptDocument(_documentId: string): Promise<void> {
  await delay(200);
}

// TODO: Replace → POST https://legal.codevertex.cc/api/request-deletion
export async function requestDataDeletion(_reason: string): Promise<{ requestId: string }> {
  await delay(400);
  return { requestId: `DEL-${Date.now()}` };
}

export function openLegal(page: LegalPage | LegalLinkKey) {
  const legacyMap: Record<LegalLinkKey, LegalPage> = {
    privacyPolicy: 'privacy',
    termsOfService: 'terms',
    cookiePolicy: 'cookies',
    gdpr: 'gdpr',
    dataRequest: 'data-request',
    deleteRequest: 'delete-request',
    security: 'security',
    dpa: 'dpa',
    subprocessors: 'subprocessors',
    contact: 'contact',
  };
  const resolved =
    page in legacyMap ? legacyMap[page as LegalLinkKey] : (page as LegalPage);
  openExternalUrl(getLegalUrl(resolved));
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
