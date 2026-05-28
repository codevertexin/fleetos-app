/**
 * Help Service — CodeVertex Help Core
 * URLs are built via platformLinks (do not host a parallel help center).
 */

import {
  getHelpUrl,
  openExternalUrl,
  HELP_BASE_URL,
  type FleetosHelpScreen,
} from '@/lib/platformLinks';

export { HELP_BASE_URL as HELP_CORE_URL };

function articleUrl(screen: FleetosHelpScreen) {
  return getHelpUrl({ screenCode: screen });
}

/** Contextual help URLs keyed by feature area */
export const HELP_ARTICLES = {
  gettingStarted: articleUrl('dashboard'),
  addVehicle: articleUrl('vehicles'),
  addDriver: articleUrl('drivers'),
  createBooking: articleUrl('bookings'),
  contracts: articleUrl('settings'),
  payouts: articleUrl('finance'),
  documents: articleUrl('settings'),
  billing: articleUrl('settings'),
  ownerPortal: articleUrl('settings'),
  driverApp: articleUrl('driver_home'),
  customerApp: articleUrl('customer_booking'),
} as const;

export type HelpArticleKey = keyof typeof HELP_ARTICLES;

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

export function openHelpCenter(screen?: FleetosHelpScreen | keyof typeof HELP_ARTICLES) {
  if (screen && screen in HELP_ARTICLES) {
    openExternalUrl(HELP_ARTICLES[screen as keyof typeof HELP_ARTICLES]);
    return;
  }
  openExternalUrl(getHelpUrl({ screenCode: screen ?? 'dashboard' }));
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
