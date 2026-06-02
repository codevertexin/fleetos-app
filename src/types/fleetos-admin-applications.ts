export interface AdminApplicationTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  submitted_at: string;
  created_at?: string;
  subscription_status?: string;
}

export interface AdminApplicationOnboarding {
  legal_name?: string | null;
  tax_id?: string | null;
  country_code?: string | null;
  submitted_at?: string | null;
  submitted_by_codevertex_user_id?: string | null;
  review_notes?: string | null;
}

export interface AdminApplicationSubmitter {
  id: string;
  role: string;
  status: string;
  codevertex_user_id: string;
  is_active?: boolean;
}

export interface AdminApplicationItem {
  tenant: AdminApplicationTenant;
  onboarding: AdminApplicationOnboarding | null;
  submitter_membership: AdminApplicationSubmitter | null;
  counts: { pending_members: number };
}

export interface AdminApplicationsListResponse {
  ok: boolean;
  items: AdminApplicationItem[];
  page?: {
    limit: number;
    next_cursor: string | null;
    total_estimate: number;
  };
}

export interface AdminSessionResponse {
  ok: boolean;
  authenticated: boolean;
  reviewer_label?: string | null;
}

export interface AdminReviewResponse {
  ok: boolean;
  decision: 'approve' | 'reject';
  idempotent?: boolean;
  tenant?: { id: string; name?: string; slug?: string; status?: string };
  error?: string;
  message?: string;
}
