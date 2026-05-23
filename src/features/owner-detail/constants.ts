export const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'statements', label: 'Statements' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'documents', label: 'Documents' },
  { id: 'contacts', label: 'Contacts' },
] as const;

export type TabId = typeof TABS[number]['id'];

export const settlementLabels: Record<string, string> = {
  fixed: 'Fixed Monthly',
  percent_gross: '% of Gross',
  percent_net: '% of Net',
  hybrid: 'Hybrid',
};

export const ownershipTypeLabels: Record<string, string> = {
  individual_owner: 'Individual Owner',
  external_company: 'External Company',
  leasing_partner: 'Leasing Partner',
  company_owned: 'Company Owned',
};
