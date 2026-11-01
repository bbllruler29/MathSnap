import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, toResponse } from "@/lib/api/errors";
import { parseOrThrow } from "@/lib/api/parse";
import { requireUser } from "@/lib/auth/requireUser";
import { messageRateLimit, retryAfterSeconds } from "@/lib/rateLimit";
import { followUp } from "@/lib/ai/followUp";
import { insertMessage, listMessages } from "@/lib/solves/repository";
import { followUpMessageSchema } from "@/lib/validation/schemas";
import { verifySolveOwnership } from "@/lib/security/chatSecurity";
import { sanitizeForLLM } from "@/lib/security/promptInjectionGuard";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const user = await requireUser(supabase);

    const body = parseOrThrow(followUpMessageSchema, await request.json());

    const injectionCheck = sanitizeForLLM(body.content);
    if (!injectionCheck.safe) {
      throw new ApiError(400, "prompt_injection", injectionCheck.reason);
    }

    const solve = await verifySolveOwnership(supabase, params.id, user.id);

    const limit = await messageRateLimit.limit(user.id);
    if (!limit.success) {
      throw new ApiError(
        429,
        "rate_limited",
        "You're sending messages faster than we can keep up — try again in a moment.",
        { retry_after_seconds: retryAfterSeconds(limit.reset) }
      );
    }

    const priorMessages = await listMessages(supabase, solve.id);
    await insertMessage(supabase, solve.id, "user", body.content);

    let agentText: string;
    try {
      agentText = await followUp(solve, priorMessages, body.content, { userId: user.id });
    } catch {
      throw new ApiError(502, "provider_error", "We couldn't get a response. Please try again.");
    }

    const agentMessage = await insertMessage(supabase, solve.id, "agent", agentText);

    return Response.json(
      {
        id: agentMessage.id,
        role: agentMessage.role,
        content: agentMessage.content,
        created_at: agentMessage.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    return toResponse(err);
  }
}
