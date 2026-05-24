/**
 * Help Service — CodeVertex Help Core
 * Service URL: https://help.codevertex.cc
 *
 * Links and helper functions to route users to the help center.
 */

export const HELP_CORE_URL = 'https://help.codevertex.cc';

export const HELP_ARTICLES = {
  gettingStarted: `${HELP_CORE_URL}/articles/getting-started`,
  addVehicle: `${HELP_CORE_URL}/articles/add-vehicle`,
  addDriver: `${HELP_CORE_URL}/articles/add-driver`,
  createBooking: `${HELP_CORE_URL}/articles/create-booking`,
  contracts: `${HELP_CORE_URL}/articles/contracts`,
  payouts: `${HELP_CORE_URL}/articles/payouts`,
  documents: `${HELP_CORE_URL}/articles/documents`,
  billing: `${HELP_CORE_URL}/articles/billing`,
  ownerPortal: `${HELP_CORE_URL}/articles/owner-portal`,
  driverApp: `${HELP_CORE_URL}/articles/driver-app`,
  customerApp: `${HELP_CORE_URL}/articles/customer-app`,
};

export interface HelpArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  url: string;
}

// TODO: Replace → GET https://help.codevertex.cc/api/search?q={query}
export async function searchHelp(_query: string): Promise<HelpArticle[]> {
  await delay(300);
  return [
    { id: '1', title: 'Getting started with FleetOS', excerpt: 'Set up your fleet in minutes...', category: 'Getting Started', url: HELP_ARTICLES.gettingStarted },
    { id: '2', title: 'How to add a vehicle', excerpt: 'Adding vehicles to your fleet...', category: 'Vehicles', url: HELP_ARTICLES.addVehicle },
    { id: '3', title: 'Managing driver payouts', excerpt: 'Configure settlement models and payouts...', category: 'Finance', url: HELP_ARTICLES.payouts },
  ];
}

// TODO: Replace → POST https://help.codevertex.cc/api/support
export async function submitSupportTicket(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
}): Promise<{ ticketId: string; message: string }> {
  await delay(500);
  void data;
  return { ticketId: `TKT-${Date.now()}`, message: 'Your request has been submitted. We\'ll respond within 24 hours.' };
}

// Opens help center in new tab
export function openHelpCenter(article?: keyof typeof HELP_ARTICLES) {
  const url = article ? HELP_ARTICLES[article] : HELP_CORE_URL;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
