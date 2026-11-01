import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/requireUser";

export async function requireAdmin(supabase: SupabaseClient): Promise<User> {
  const user = await requireUser(supabase);

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new ApiError(403, "forbidden", "You don't have access to this.");
  }

  return user;
}
