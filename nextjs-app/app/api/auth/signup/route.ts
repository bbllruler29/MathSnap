import { createClient } from "@/lib/supabase/server";
import { ApiError, toResponse } from "@/lib/api/errors";
import { parseOrThrow } from "@/lib/api/parse";
import { signupSchema } from "@/lib/validation/schemas";
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

    const body = parseOrThrow(signupSchema, await request.json());

    // Re-checked server-side — the client-side age gate on the signup page
    // is a UX convenience, not a security boundary; a request crafted
    // directly against this endpoint must still be blocked.
    const age = new Date().getFullYear() - body.birth_year;
    if (age < 13) {
      throw new ApiError(
        403,
        "underage",
        "MathSnap requires a parent or guardian to create the account for users under 13."
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
    });

    if (error) {
      const alreadyRegistered = error.message.toLowerCase().includes("already registered");
      throw new ApiError(
        alreadyRegistered ? 409 : 502,
        alreadyRegistered ? "email_taken" : "signup_failed",
        alreadyRegistered
          ? "An account with this email already exists. Try logging in."
          : "We couldn't create your account. Please try again."
      );
    }

    if (data.user) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ birth_year: body.birth_year })
        .eq("id", data.user.id);
      if (updateError) {
        console.error("Failed to save birth_year during signup:", updateError.message);
      }
    }

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
