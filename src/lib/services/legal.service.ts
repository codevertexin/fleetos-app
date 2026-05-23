/**
 * Legal Service — CodeVertex Legal Core
 * Service URL: https://legal.codevertex.cc
 *
 * Links to legal documents and compliance functions.
 */

export const LEGAL_CORE_URL = 'https://legal.codevertex.cc';

export const LEGAL_LINKS = {
  privacyPolicy: `${LEGAL_CORE_URL}/privacy`,
  termsOfService: `${LEGAL_CORE_URL}/terms`,
  dpa: `${LEGAL_CORE_URL}/dpa`,         // Data Processing Agreement
  gdpr: `${LEGAL_CORE_URL}/gdpr`,
  cookiePolicy: `${LEGAL_CORE_URL}/cookies`,
  aml: `${LEGAL_CORE_URL}/aml`,          // Anti-Money Laundering
  tvdeCompliance: `${LEGAL_CORE_URL}/tvde`, // TVDE (Portugal rideshare law)
};

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

// Opens legal doc in new tab
export function openLegal(page: keyof typeof LEGAL_LINKS) {
  window.open(LEGAL_LINKS[page], '_blank', 'noopener,noreferrer');
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
