import { createClient } from "@/lib/supabase/server";
import { toResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/requireUser";
import { listDistinctTopics } from "@/lib/solves/repository";

export async function GET() {
  try {
    const supabase = createClient();
    const user = await requireUser(supabase);
    const topics = await listDistinctTopics(supabase, user.id);
    return Response.json({ topics });
  } catch (err) {
    return toResponse(err);
  }
}
