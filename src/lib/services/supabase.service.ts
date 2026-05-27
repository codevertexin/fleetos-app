/**
 * FleetOS operational Supabase client (anon key, RLS unchanged in Phase 5b).
 * Identity sync uses SECURITY DEFINER RPCs until Edge verification lands.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let operationalClient: SupabaseClient | null = null;

export function isOperationalSupabaseConfigured(): boolean {
  return Boolean(
    (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() &&
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim(),
  );
}

/** Singleton anon client for operational DB (no Supabase Auth session in Phase 5b). */
export function getOperationalSupabase(): SupabaseClient | null {
  if (!isOperationalSupabaseConfigured()) {
    return null;
  }
  if (!operationalClient) {
    operationalClient = createClient(
      (import.meta.env.VITE_SUPABASE_URL as string).trim(),
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim(),
    );
  }
  return operationalClient;
}

/** @deprecated use isOperationalSupabaseConfigured */
export const supabasePlaceholder = {
  ready: isOperationalSupabaseConfigured(),
  message: isOperationalSupabaseConfigured()
    ? 'Supabase operational client initialised.'
    : 'Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
};
