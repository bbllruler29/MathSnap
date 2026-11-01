import { createClient } from "@/lib/supabase/server";
import { toResponse } from "@/lib/api/errors";

export async function POST() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
    return Response.json({ success: true });
  } catch (err) {
    return toResponse(err);
  }
}
