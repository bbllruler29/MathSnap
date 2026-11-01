import { createClient } from "@/lib/supabase/server";
import { ApiError, toResponse } from "@/lib/api/errors";
import { parseOrThrow } from "@/lib/api/parse";
import { requireUser } from "@/lib/auth/requireUser";
import { insertFlag } from "@/lib/solves/repository";
import { flagSolveSchema } from "@/lib/validation/schemas";
import { verifySolveOwnership } from "@/lib/security/chatSecurity";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const user = await requireUser(supabase);

    const rawBody = await request.text();
    const body = parseOrThrow(flagSolveSchema, rawBody ? JSON.parse(rawBody) : {});

    const solve = await verifySolveOwnership(supabase, params.id, user.id);

    const { flag, alreadyFlagged } = await insertFlag(supabase, solve.id, user.id, body.reason);
    if (alreadyFlagged) {
      throw new ApiError(409, "already_flagged", "This solve has already been flagged for review.");
    }

    return Response.json({ id: flag!.id, status: flag!.status }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
