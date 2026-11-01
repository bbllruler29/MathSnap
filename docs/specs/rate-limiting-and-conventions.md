# Spec: Rate Limiting, Validation & Shared API Conventions

Cross-cutting conventions referenced by every other spec in `docs/specs/`. Implement this first — other feature specs assume these utilities exist.

---

## 1. Rate Limiting

**Library:** `@upstash/ratelimit` + `@upstash/redis`, backed by `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.

**File:** `lib/rateLimit.ts`

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const solveRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 solve requests/min/user
});

export const messageRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 follow-ups/min/user
});

export const ipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 requests/min/IP, catches pre-auth abuse
});
```

**Applied to:**
- `POST /api/solves` → `solveRateLimit` keyed by `auth.uid()`, plus `ipRateLimit` keyed by request IP (covers unauthenticated/scripted abuse hitting auth-gated routes repeatedly).
- `POST /api/solves/:id/messages` → `messageRateLimit` keyed by `auth.uid()`.
- Both: exceeding the limit returns `429 { error: "rate_limited", retry_after_seconds }`.

## 2. Validation

**Library:** Zod. **File:** `lib/validation/schemas.ts` — one exported schema per request body/query, named `<feature><Request|Query>Schema` (e.g., `signupSchema`, `followUpMessageSchema`, `solveHistoryQuerySchema`, `flagSolveSchema`, `checkoutRequestSchema`).

**Convention:** every API route handler parses its input through the relevant schema via a shared helper:

```ts
// lib/api/parse.ts
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError(400, "validation_error", result.error.flatten());
  return result.data;
}
```

## 3. Error Response Shape

Every API error response (across all specs) follows:

```json
{ "error": "<machine_readable_code>", "message": "<human-readable>", "...optional extra fields" }
```

Implemented via `lib/api/errors.ts`:

```ts
export class ApiError extends Error {
  constructor(public status: number, public code: string, public details?: unknown) { super(code); }
}

export function toResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ error: err.code, message: err.message, details: err.details }, { status: err.status });
  }
  console.error(err);
  return Response.json({ error: "internal_error", message: "Something went wrong." }, { status: 500 });
}
```

Every route handler's top-level try/catch calls `toResponse(err)` — guarantees no stack trace or raw error ever reaches the client, and every failure path returns the same JSON shape the frontend's `lib/api/client.ts` expects.

## 4. Admin Authorization Helper

**File:** `lib/auth/requireAdmin.ts`

```ts
export async function requireAdmin(supabase: SupabaseServerClient) {
  const { data: user } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "unauthenticated");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new ApiError(403, "forbidden");
}
```

Used at the top of every `/api/admin/*` route handler, as referenced in `docs/specs/flagging-and-admin-review.md`.

## 5. Frontend Fetch Wrapper

**File:** `lib/api/client.ts` — thin wrapper around `fetch` used by every component that calls an API route:
- Attaches credentials (cookies) automatically.
- On any `401` response, redirects to `/login?redirect=<current-path>` globally (referenced in `docs/specs/auth-and-users.md` §7).
- Parses the `{ error, message }` shape and throws a typed `ClientApiError` that components can catch to render the right inline message.

## 6. Logging

- Every AI pipeline call (`visionParse`, `solveAgent`, `verify`, `followUp`) logs `{ user_id, solve_id, step, latency_ms, success }` (no problem content or PII in logs) for cost/latency monitoring against the PRD's performance targets.
- Every `429`/`403`/`5xx` is logged with the route and user id (if known) for abuse/error-rate monitoring.

## 7. Acceptance Criteria

- [ ] Exceeding the solve rate limit returns `429` with `retry_after_seconds` and does not reach the AI pipeline.
- [ ] Every API route in every other spec file returns errors in the shared `{ error, message }` shape — no route returns a bare string or stack trace.
- [ ] `requireAdmin` rejects both unauthenticated (`401`) and non-admin (`403`) requests before any admin data is queried.
- [ ] A `401` from any API call triggers a client-side redirect to `/login` with the original path preserved for return-after-login.
