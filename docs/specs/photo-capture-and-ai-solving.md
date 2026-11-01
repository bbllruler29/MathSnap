# Spec: Photo Capture, Upload & AI Solving Pipeline

Covers PRD FR1 (capture/upload), FR2 (image parsing), FR3 (step-by-step solve), FR5 (notation rendering), FR6 (low-confidence handling). This is the core MVP path: `Camera/Upload → Vision Parse → Solve → Symbolic Verify → Render`.

---

## 1. Frontend: Capture & Upload

**Component:** `components/camera/PhotoCapture.tsx` + `components/camera/ImageUploader.tsx`, used on `app/(app)/page.tsx`.

- Two entry points: native camera capture (`<input type="file" accept="image/*" capture="environment">`) and gallery picker (`<input type="file" accept="image/jpeg,image/png">`).
- Client-side validation before upload:
  - File type must be `image/jpeg` or `image/png` → reject others with "Please use a JPEG or PNG photo."
  - File size must be ≤ 10MB → reject with "Image is too large (max 10MB). Try retaking with lower resolution."
  - If the image's longest edge > 4096px, downscale client-side (canvas resize) before upload to bound AI/storage costs.
- On valid selection: show immediate local preview, then begin upload (do not wait for user confirmation — matches "within 3 taps" usability requirement).
- UI state machine: `idle → uploading → parsing → solving → verifying → done | low_confidence | error`. Each state maps to a distinct visual (see §6).

## 2. API: `POST /api/solves`

**File:** `app/api/solves/route.ts`

**Auth:** Required (any authenticated user).

**Request:** `multipart/form-data`, field `image: File`.

**Server-side steps:**

1. **Auth + rate limit check.** Reject with `401` if unauthenticated. Check rate limiter (see `docs/specs/rate-limiting-and-conventions.md`) — `429` if exceeded.
2. **Daily free-tier limit check.** Read `users.subscription_tier`, `daily_solve_count`, `daily_solve_count_date`.
   - If `daily_solve_count_date != today`, reset: `daily_solve_count = 0`, `daily_solve_count_date = today` (write-through before the count check).
   - If `subscription_tier == 'free'` and `daily_solve_count >= DAILY_FREE_SOLVE_LIMIT` → return `402 { error: "daily_limit_reached", message, upgrade_url: "/billing" }`. Do not invoke the AI pipeline.
3. **Validate file.** Re-validate type/size server-side (never trust client validation alone). `400` on failure.
4. **Upload to Storage.** Generate `solve_id = crypto.randomUUID()`. Upload to `problem-images/{user_id}/{solve_id}.{ext}` using the authenticated user's Supabase client (RLS enforces `foldername[1] = auth.uid()`).
5. **Vision Parse step** (`lib/ai/visionParse.ts`): call Claude with the image (base64 or signed URL) — see §3 for prompt/schema.
   - If the call throws/times out (>15s) → `502 { error: "provider_error", message: "We couldn't reach the solver. Please try again." }`. No partial record is persisted.
   - If `confidence < SOLVE_CONFIDENCE_THRESHOLD` → persist nothing to `solves`, increment `daily_solve_count` anyway (it consumed a vision call), and return:
     `422 { error: "low_confidence_parse", message: "We had trouble reading this photo clearly.", suggested_action: "retake_or_crop", confidence }`.
6. **Solve step** (`lib/ai/solveAgent.ts`): call Claude with the parsed problem text (not the image) — see §4.
   - On failure → `502 { error: "provider_error" }`.
7. **Symbolic Verification step** (`lib/ai/verify.ts`): for topics in the symbolic-verifiable set (`arithmetic`, `algebra`, `basic_calculus`), call the SymPy microservice — see §5.
   - Verified and matches → `verification_status = 'verified'`.
   - Mismatch → `verification_status = 'failed'`; do **not** return the agent's answer. Instead: persist the solve with `verification_status='failed'`, auto-insert a `flagged_solves` row (`reason = 'auto: symbolic verification mismatch'`), and return `200` with a degraded response: `{ ...solve, final_answer: null, message: "We're double-checking this one — our usual answer didn't pass our accuracy check. A correct solution will be available soon." }` (steps are still shown; only the final answer is withheld).
   - Not symbolically verifiable (e.g., geometry) → `verification_status = 'unverified'`, answer shown normally with a subtle UI badge "AI-generated, not independently verified."
8. **Persist.** `INSERT INTO solves (id, user_id, image_path, parsed_problem, topic, steps_json, final_answer, confidence_score, verification_status)`.
9. **Increment usage.** `UPDATE users SET daily_solve_count = daily_solve_count + 1 WHERE id = auth.uid()`.
10. **Respond `201`:** `{ id, parsed_problem, topic, steps: [...], final_answer, confidence_score, verification_status }`.

## 3. Vision Parse Step — Prompt & Schema

**File:** `lib/ai/visionParse.ts`

- Model: `ANTHROPIC_MODEL` env var, vision-capable.
- Uses Claude tool-use (forced tool call) to guarantee structured output — tool name `report_parsed_problem`, input schema:

```json
{
  "type": "object",
  "required": ["parsed_problem", "topic_guess", "confidence", "is_math_problem"],
  "properties": {
    "is_math_problem": { "type": "boolean" },
    "parsed_problem": { "type": "string", "description": "The transcribed problem in plain text / LaTeX-style notation" },
    "topic_guess": { "type": "string", "enum": ["arithmetic", "algebra", "geometry", "trigonometry", "basic_calculus", "calculus", "statistics", "other"] },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
```

- System prompt instructs: transcribe exactly what's visible, do not solve, do not guess illegible parts — if part of the problem is unreadable, lower `confidence` accordingly rather than inventing content.
- If `is_math_problem == false` (photo isn't a math problem at all) → treat identically to low-confidence (`422`), with message "We couldn't find a math problem in this photo."

## 4. Solve Step — Prompt & Schema

**File:** `lib/ai/solveAgent.ts`

- Input: `parsed_problem`, `topic_guess`.
- Forced tool call `report_solution`, input schema:

```json
{
  "type": "object",
  "required": ["topic", "steps", "final_answer"],
  "properties": {
    "topic": { "type": "string" },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["step_number", "explanation", "latex"],
        "properties": {
          "step_number": { "type": "integer" },
          "explanation": { "type": "string", "description": "Plain-language justification for this step" },
          "latex": { "type": "string", "description": "The math expression for this step in LaTeX" }
        }
      }
    },
    "final_answer": { "type": "string" }
  }
}
```

- System prompt requires: every step must be independently justified (no "do the rest the same way" filler steps — directly enforces PRD FR3's acceptance criterion); at least 2 steps for any non-trivial problem; final answer must appear as the `latex` of the last step as well as in `final_answer`.

## 5. Symbolic Verification Step

**File:** `lib/ai/verify.ts`

- POST to `SYMPY_VERIFY_SERVICE_URL/verify` with header `Authorization: Bearer ${SYMPY_VERIFY_SERVICE_TOKEN}`.
- Request: `{ topic, parsed_problem, candidate_answer: final_answer }`.
- Service response: `{ verifiable: boolean, matches: boolean | null }`.
- Mapping: `verifiable=false` → `'unverified'`; `verifiable=true, matches=true` → `'verified'`; `verifiable=true, matches=false` → `'failed'`.
- Timeout: 5s. On timeout/error → treat as `verifiable=false` (`'unverified'`), do not block the response (verification is a quality gate, not a hard dependency for topics where the service itself is unreachable) — logged as a warning for ops visibility, distinct from a genuine mismatch.

## 6. Frontend: Rendering & UX States

**Component:** `components/solve/StepRenderer.tsx` (KaTeX), `components/solve/ConfidenceWarning.tsx`.

- Each step renders `explanation` as plain text and `latex` via `katex.renderToString`, wrapped in a `<span>` with `aria-label` set to a screen-reader-friendly spoken form (KaTeX's `katex.renderToString(latex, { output: 'htmlAndMathml' })` for MathML a11y support).
- State → UI mapping:
  - `uploading` → progress bar on the preview image.
  - `parsing` / `solving` / `verifying` → single "Solving your problem…" skeleton (collapse the three sub-states into one user-facing label; no need to expose internal pipeline stages).
  - `low_confidence` → `ConfidenceWarning` component with "Retake Photo" / "Crop & Retry" CTAs, original image shown for reference.
  - `done` (verified/unverified) → full step list + final answer + "Ask a follow-up" input.
  - `done` (verification failed) → full step list, final answer hidden, banner: "We're double-checking this one."
  - `error` (provider/network) → retry CTA, original image preserved so the user doesn't have to re-capture.

## 7. Edge Cases

| Case | Behavior |
|---|---|
| Non-math image (e.g., a selfie) | `is_math_problem=false` → `422` low-confidence-style response with math-specific messaging. |
| Partially visible/cropped problem | Lower `confidence` from the model; if below threshold, standard retake flow. |
| Multiple problems in one photo (FR8 not yet built) | MVP solves only the first/primary problem the model identifies; no explicit multi-problem detection. Documented as a known MVP limitation, not an error. |
| User uploads the same image twice | Treated as two independent solves (no dedup) — acceptable for MVP. |
| Daily limit hit mid-session | `402` returned before any AI call on request #6 (free tier); frontend shows paywall modal immediately. |
| Image upload succeeds but AI pipeline fails entirely | Orphaned storage object remains (acceptable; a periodic cleanup job for storage objects with no matching `solves.image_path` is a Phase 2 ops task, not required for MVP). |

## 8. Acceptance Criteria

- [ ] A clear, well-lit photo of a printed algebra problem produces a `201` response with ≥3 steps and a correct final answer, in < 10s P95.
- [ ] A blurry/illegible photo returns `422 low_confidence_parse` and never persists a `solves` row.
- [ ] A symbolic algebra problem whose AI-produced answer is deliberately wrong (test fixture) results in `verification_status='failed'`, a withheld `final_answer`, and an auto-created `flagged_solves` row.
- [ ] A geometry problem (non-symbolically-verifiable) returns `verification_status='unverified'` and still displays the full solution.
- [ ] Uploading a non-image file is rejected client-side and server-side with a `400`.
- [ ] A 6th solve attempt in one day on the free tier returns `402` without calling any AI provider.
