/**
 * Billing Service — CodeVertex Billing Core
 * URLs via platformLinks — no direct Stripe integration.
 */

import { BILLING_BASE_URL, getBillingUrl } from '@/lib/platformLinks';

export { BILLING_BASE_URL as BILLING_CORE_URL };
export { getBillingUrl };

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  maxVehicles: number;
  maxDrivers: number;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void';
  date: string;
  pdfUrl?: string;
}

// TODO: Replace → GET https://billing.codevertex.cc/api/plans
export async function getPlans(): Promise<Plan[]> {
  await delay(300);
  return [
    { id: 'starter', name: 'Starter', price: 49, currency: 'EUR', interval: 'month', features: ['Up to 5 vehicles', 'Up to 10 drivers', 'Basic reports', 'Email support'], maxVehicles: 5, maxDrivers: 10 },
    { id: 'pro', name: 'Pro', price: 149, currency: 'EUR', interval: 'month', features: ['Up to 25 vehicles', 'Unlimited drivers', 'Advanced analytics', 'Priority support', 'Owner portal', 'API access'], maxVehicles: 25, maxDrivers: 999 },
    { id: 'enterprise', name: 'Enterprise', price: 399, currency: 'EUR', interval: 'month', features: ['Unlimited vehicles', 'Unlimited drivers', 'Custom integrations', 'Dedicated support', 'SLA', 'White label'], maxVehicles: 999, maxDrivers: 999 },
  ];
}

// TODO: Replace → GET https://billing.codevertex.cc/api/subscription
export async function getSubscription(): Promise<Subscription> {
  await delay(200);
  return {
    id: 'sub_mock',
    planId: 'pro',
    planName: 'Pro',
    status: 'active',
    currentPeriodEnd: '2024-07-10',
    cancelAtPeriodEnd: false,
  };
}

// TODO: Replace → GET https://billing.codevertex.cc/api/invoices
export async function getInvoices(): Promise<Invoice[]> {
  await delay(250);
  return [
    { id: 'inv_1', amount: 149, currency: 'EUR', status: 'paid', date: '2024-06-01' },
    { id: 'inv_2', amount: 149, currency: 'EUR', status: 'paid', date: '2024-05-01' },
    { id: 'inv_3', amount: 149, currency: 'EUR', status: 'paid', date: '2024-04-01' },
  ];
}

// TODO: Replace → POST https://billing.codevertex.cc/api/portal
export async function openCustomerPortal(): Promise<{ url: string }> {
  await delay(200);
  return { url: getBillingUrl() };
}

// TODO: Replace → POST https://billing.codevertex.cc/api/upgrade
export async function upgradePlan(_planId: string): Promise<void> {
  await delay(400);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
