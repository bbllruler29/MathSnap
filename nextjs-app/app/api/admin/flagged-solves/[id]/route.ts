import { createClient } from "@/lib/supabase/server";
import { ApiError, toResponse } from "@/lib/api/errors";
import { parseOrThrow } from "@/lib/api/parse";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { updateFlag } from "@/lib/solves/repository";
import { adminFlagUpdateSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const admin = await requireAdmin(supabase);

    const body = parseOrThrow(adminFlagUpdateSchema, await request.json());

    const updated = await updateFlag(supabase, params.id, body.status, admin.id, body.reviewer_notes);
    if (!updated) {
      throw new ApiError(404, "not_found", "We couldn't find that flag.");
    }

    return Response.json(updated);
  } catch (err) {
    return toResponse(err);
  }
}
