import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client that bypasses RLS. Used only where there is no
 * authenticated user session to scope a query to — currently just the
 * Stripe webhook handler, which must update a user's subscription from an
 * unauthenticated, Stripe-signed request. Never import this into anything
 * reachable from a user-initiated request.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
