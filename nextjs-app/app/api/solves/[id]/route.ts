import { createClient } from "@/lib/supabase/server";
import { ApiError, toResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/requireUser";
import { getSolveById, listMessages } from "@/lib/solves/repository";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const user = await requireUser(supabase);

    const solve = await getSolveById(supabase, params.id, user.id);
    if (!solve) {
      throw new ApiError(404, "not_found", "We couldn't find that solve.");
    }

    const messages = await listMessages(supabase, solve.id);

    return Response.json({
      id: solve.id,
      parsed_problem: solve.parsed_problem,
      topic: solve.topic,
      steps: solve.steps_json,
      final_answer: solve.verification_status === "failed" ? null : solve.final_answer,
      confidence_score: solve.confidence_score,
      verification_status: solve.verification_status,
      created_at: solve.created_at,
      messages,
    });
  } catch (err) {
    return toResponse(err);
  }
}
