import { createClient } from "@/lib/supabase/server";
import { ApiError, toResponse } from "@/lib/api/errors";
import { parseOrThrow } from "@/lib/api/parse";
import { loginSchema } from "@/lib/validation/schemas";
import { authRateLimit, retryAfterSeconds } from "@/lib/rateLimit";

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = await authRateLimit.limit(ip);
    if (!limit.success) {
      throw new ApiError(
        429,
        "rate_limited",
        "Too many attempts. Please wait a moment and try again.",
        { retry_after_seconds: retryAfterSeconds(limit.reset) }
      );
    }

    const body = parseOrThrow(loginSchema, await request.json());
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(body);

    if (error) {
      // Deliberately generic — never reveal whether the email exists.
      throw new ApiError(401, "invalid_credentials", "Invalid email or password.");
    }

    return Response.json({ success: true });
  } catch (err) {
    return toResponse(err);
  }
}
