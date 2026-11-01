import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { getSolveById } from "@/lib/solves/repository";
import type { Solve } from "@/types/solve";

/**
 * Verifies a solve exists and belongs to the requesting user before any
 * follow-up chat or flagging action touches it. Returns 404 (never 403) on
 * a mismatch so a caller can't distinguish "doesn't exist" from "belongs to
 * someone else" — consistent across every route that scopes data by
 * ownership.
 */
export async function verifySolveOwnership(
  supabase: SupabaseClient,
  solveId: string,
  userId: string
): Promise<Solve> {
  const solve = await getSolveById(supabase, solveId, userId);
  if (!solve) {
    throw new ApiError(404, "not_found", "We couldn't find that solve.");
  }
  return solve;
}
