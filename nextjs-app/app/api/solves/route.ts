import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, toResponse } from "@/lib/api/errors";
import { parseOrThrow } from "@/lib/api/parse";
import { requireUser } from "@/lib/auth/requireUser";
import { ipRateLimit, solveRateLimit, retryAfterSeconds } from "@/lib/rateLimit";
import { visionParse } from "@/lib/ai/visionParse";
import { solveAgent } from "@/lib/ai/solveAgent";
import { verifySolution } from "@/lib/ai/verify";
import {
  checkAndResetDailySolveUsage,
  consumeDailySolve,
  insertSolve,
  autoFlagFailedVerification,
  listSolves,
} from "@/lib/solves/repository";
import { solveHistoryQuerySchema } from "@/lib/validation/schemas";
import { validateImageUpload } from "@/lib/security/inputValidator";
import { SOLVE_CONFIDENCE_THRESHOLD } from "@/lib/security/tokenLimiter";

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await requireUser(supabase);

    const ip = getClientIp(request);
    const [userLimit, ipLimit] = await Promise.all([
      solveRateLimit.limit(user.id),
      ipRateLimit.limit(ip),
    ]);
    if (!userLimit.success) {
      throw new ApiError(
        429,
        "rate_limited",
        "You're solving problems faster than we can keep up — try again in a moment.",
        { retry_after_seconds: retryAfterSeconds(userLimit.reset) }
      );
    }
    if (!ipLimit.success) {
      throw new ApiError(
        429,
        "rate_limited",
        "Too many requests from this network — try again in a moment.",
        { retry_after_seconds: retryAfterSeconds(ipLimit.reset) }
      );
    }

    const { allowed } = await checkAndResetDailySolveUsage(supabase, user.id);
    if (!allowed) {
      throw new ApiError(
        402,
        "daily_limit_reached",
        "You've used today's free solves. Upgrade for unlimited solving.",
        { upgrade_url: "/app/billing" }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      throw new ApiError(400, "invalid_file", "Please attach a photo of your problem.");
    }
    const bytes = await validateImageUpload(image);

    const solveId = randomUUID();
    const extension = image.type === "image/png" ? "png" : "jpg";
    const imagePath = `${user.id}/${solveId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("problem-images")
      .upload(imagePath, bytes, { contentType: image.type, upsert: false });
    if (uploadError) {
      throw new ApiError(502, "storage_error", "We couldn't save your photo. Please try again.");
    }

    const base64 = Buffer.from(bytes).toString("base64");

    let parsed;
    try {
      parsed = await visionParse(base64, image.type as "image/jpeg" | "image/png", {
        userId: user.id,
      });
    } catch {
      throw new ApiError(502, "provider_error", "We couldn't reach the solver. Please try again.");
    }

    if (!parsed.is_math_problem || parsed.confidence < SOLVE_CONFIDENCE_THRESHOLD) {
      await consumeDailySolve(supabase, user.id);
      throw new ApiError(
        422,
        "low_confidence_parse",
        parsed.is_math_problem
          ? "We had trouble reading this photo clearly. Try moving to better light or cropping tighter."
          : "We couldn't find a math problem in this photo.",
        { suggested_action: "retake_or_crop", confidence: parsed.confidence }
      );
    }

    let solved;
    try {
      solved = await solveAgent(parsed.parsed_problem, parsed.topic_guess, { userId: user.id });
    } catch {
      throw new ApiError(502, "provider_error", "We couldn't solve this one. Please try again.");
    }

    const verificationStatus = await verifySolution(
      solved.topic,
      parsed.parsed_problem,
      solved.final_answer,
      { userId: user.id, solveId }
    );

    const solve = await insertSolve(supabase, {
      id: solveId,
      user_id: user.id,
      image_path: imagePath,
      parsed_problem: parsed.parsed_problem,
      topic: solved.topic,
      steps_json: solved.steps,
      final_answer: solved.final_answer,
      confidence_score: parsed.confidence,
      verification_status: verificationStatus,
    });

    const stillWithinLimit = await consumeDailySolve(supabase, user.id);
    if (!stillWithinLimit) {
      // Extremely rare: a concurrent request pushed the user over their
      // daily limit between the pre-check and now. The AI work is already
      // done — showing the answer is fairer than discarding it, so we just
      // log for visibility rather than blocking the response.
      console.warn(`Daily solve limit race for user ${user.id} — allowing this solve through anyway.`);
    }

    if (verificationStatus === "failed") {
      await autoFlagFailedVerification(supabase, solveId, user.id);
      return Response.json(
        {
          id: solve.id,
          parsed_problem: solve.parsed_problem,
          topic: solve.topic,
          steps: solve.steps_json,
          final_answer: null,
          confidence_score: solve.confidence_score,
          verification_status: solve.verification_status,
          message:
            "We're double-checking this one — our usual answer didn't pass our accuracy check. A correct solution will be available soon.",
        },
        { status: 201 }
      );
    }

    return Response.json(
      {
        id: solve.id,
        parsed_problem: solve.parsed_problem,
        topic: solve.topic,
        steps: solve.steps_json,
        final_answer: solve.final_answer,
        confidence_score: solve.confidence_score,
        verification_status: solve.verification_status,
      },
      { status: 201 }
    );
  } catch (err) {
    return toResponse(err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await requireUser(supabase);

    const url = new URL(request.url);
    const query = parseOrThrow(solveHistoryQuerySchema, {
      topic: url.searchParams.get("topic") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const result = await listSolves(supabase, user.id, query);
    return Response.json({ items: result.items, next_cursor: result.nextCursor });
  } catch (err) {
    return toResponse(err);
  }
}
