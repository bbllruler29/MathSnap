import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FlaggedSolve,
  FlaggedSolveWithDetail,
  FlagStatus,
  Solve,
  SolveMessage,
  SolveSummary,
  VerificationStatus,
} from "@/types/solve";
import type { UserProfile } from "@/types/user";
import { DAILY_FREE_SOLVE_LIMIT } from "@/lib/security/tokenLimiter";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Reads the user's current daily usage, lazily resetting the counter if the
 * stored date has rolled over, and reports whether they're allowed another
 * solve. Per docs/specs/billing-and-subscription.md §4, the reset happens
 * here rather than via a scheduled job.
 */
export async function checkAndResetDailySolveUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; profile: UserProfile }> {
  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new Error("User profile not found");
  }

  const today = todayDateString();
  let current = profile as UserProfile;

  if (current.daily_solve_count_date !== today) {
    const { data: updated } = await supabase
      .from("users")
      .update({ daily_solve_count: 0, daily_solve_count_date: today })
      .eq("id", userId)
      .select("*")
      .single();
    current = (updated as UserProfile) ?? { ...current, daily_solve_count: 0, daily_solve_count_date: today };
  }

  const allowed = current.subscription_tier === "paid" || current.daily_solve_count < DAILY_FREE_SOLVE_LIMIT;
  return { allowed, profile: current };
}

/**
 * Atomically rolls over the daily counter (if the date changed) and
 * increments it in a single UPDATE via the consume_daily_solve() Postgres
 * function — see nextjs-app/supabase/rls-policies.sql. This replaces a
 * read-then-write pattern that allowed concurrent requests to all read the
 * same stale count and all pass the free-tier check, bypassing the daily
 * cap. Returns false if the limit had already been reached by the time this
 * ran (a narrow race against the earlier pre-check is still possible, but
 * is now bounded and never lets usage drift from the true count).
 */
export async function consumeDailySolve(
  supabase: SupabaseClient,
  userId: string,
  dailyLimit: number = DAILY_FREE_SOLVE_LIMIT
): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_daily_solve", {
    p_user_id: userId,
    p_daily_limit: dailyLimit,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export interface InsertSolveInput {
  id: string;
  user_id: string;
  image_path: string;
  parsed_problem: string | null;
  topic: string | null;
  steps_json: Solve["steps_json"];
  final_answer: string | null;
  confidence_score: number | null;
  verification_status: VerificationStatus;
}

export async function insertSolve(supabase: SupabaseClient, input: InsertSolveInput): Promise<Solve> {
  const { data, error } = await supabase.from("solves").insert(input).select("*").single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to persist solve");
  }
  return data as Solve;
}

export async function getSolveById(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<Solve | null> {
  const { data } = await supabase.from("solves").select("*").eq("id", id).eq("user_id", userId).single();
  return (data as Solve) ?? null;
}

export interface ListSolvesFilters {
  topic?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit: number;
}

export interface ListSolvesResult {
  items: SolveSummary[];
  nextCursor: string | null;
}

export async function listSolves(
  supabase: SupabaseClient,
  userId: string,
  filters: ListSolvesFilters
): Promise<ListSolvesResult> {
  let query = supabase
    .from("solves")
    .select("id, topic, final_answer, confidence_score, verification_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(filters.limit + 1);

  if (filters.topic) query = query.eq("topic", filters.topic);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);
  if (filters.cursor) {
    const decoded = Buffer.from(filters.cursor, "base64").toString("utf-8");
    query = query.lt("created_at", decoded);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as SolveSummary[];
  const hasMore = rows.length > filters.limit;
  const items = hasMore ? rows.slice(0, filters.limit) : rows;
  const nextCursor =
    hasMore && items.length > 0
      ? Buffer.from(items[items.length - 1].created_at, "utf-8").toString("base64")
      : null;

  return { items, nextCursor };
}

export async function listDistinctTopics(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("solves").select("topic").eq("user_id", userId).not("topic", "is", null);
  if (error) throw new Error(error.message);
  const topics = new Set((data ?? []).map((row) => row.topic as string));
  return Array.from(topics).sort();
}

export async function insertMessage(
  supabase: SupabaseClient,
  solveId: string,
  role: "user" | "agent",
  content: string
): Promise<SolveMessage> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ solve_id: solveId, role, content })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to persist message");
  }
  return data as SolveMessage;
}

export async function listMessages(supabase: SupabaseClient, solveId: string): Promise<SolveMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("solve_id", solveId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SolveMessage[];
}

export async function insertFlag(
  supabase: SupabaseClient,
  solveId: string,
  flaggedBy: string,
  reason: string | undefined
): Promise<{ flag: FlaggedSolve | null; alreadyFlagged: boolean }> {
  const { data, error } = await supabase
    .from("flagged_solves")
    .insert({ solve_id: solveId, flagged_by: flaggedBy, reason: reason ?? null })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { flag: null, alreadyFlagged: true };
    }
    throw new Error(error.message);
  }

  return { flag: data as FlaggedSolve, alreadyFlagged: false };
}

export async function autoFlagFailedVerification(
  supabase: SupabaseClient,
  solveId: string,
  solveOwnerId: string
): Promise<void> {
  await supabase.from("flagged_solves").insert({
    solve_id: solveId,
    flagged_by: solveOwnerId,
    reason: "auto: symbolic verification mismatch",
    status: "open",
  });
}

export interface ListFlaggedSolvesResult {
  items: FlaggedSolveWithDetail[];
  nextCursor: string | null;
}

export async function listFlaggedSolves(
  supabase: SupabaseClient,
  status: FlagStatus,
  cursor: string | undefined,
  limit = 20
): Promise<ListFlaggedSolvesResult> {
  let query = supabase
    .from("flagged_solves")
    .select("*, solve:solves(*)")
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(limit + 1);

  if (cursor) {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    query = query.gt("created_at", decoded);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as FlaggedSolveWithDetail[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && items.length > 0
      ? Buffer.from(items[items.length - 1].created_at, "utf-8").toString("base64")
      : null;

  return { items, nextCursor };
}

export async function updateFlag(
  supabase: SupabaseClient,
  id: string,
  status: "resolved" | "escalated",
  reviewerId: string,
  reviewerNotes: string | undefined
): Promise<FlaggedSolve | null> {
  const { data, error } = await supabase
    .from("flagged_solves")
    .update({
      status,
      reviewer_notes: reviewerNotes ?? null,
      reviewer_id: reviewerId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as FlaggedSolve) ?? null;
}
