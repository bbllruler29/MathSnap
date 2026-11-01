# Spec: Conversational Follow-Up (FR4)

Covers the per-solve chat thread that lets a user ask clarifying questions about an already-solved problem, grounded in that solve's original context.

---

## 1. Frontend

**Component:** `components/solve/FollowUpChat.tsx`, rendered on `app/(app)/solve/[id]/page.tsx` beneath the step list.

- Chat input (text field, 1–2000 chars, submit on Enter or button tap).
- Message list renders in order: user messages right-aligned, agent messages left-aligned, both as plain text (agent responses may contain inline LaTeX delimited by `$...$`, rendered via the same KaTeX utility used in `StepRenderer.tsx`).
- Optimistic UI: user's message appears immediately on submit with a pending state; replaced/confirmed once the API responds.
- Loading state: typing-indicator (animated dots) while awaiting the agent response, target < 5s P95.
- Disabled input + inline error with "Retry" if the solve itself is still in a non-`done` state (shouldn't normally be reachable, but guards against race conditions).

## 2. API: `POST /api/solves/:id/messages`

**File:** `app/api/solves/[id]/messages/route.ts`

**Auth:** Required; the solve must belong to the requester (enforced by both the query and RLS).

**Request:** `{ content: string }`, validated by `lib/validation/schemas.ts#followUpMessageSchema` (`min(1).max(2000)`).

**Server-side steps:**
1. `400` if validation fails.
2. Fetch the solve by `id` scoped to `user_id = auth.uid()`. `404` if not found (covers both "doesn't exist" and "belongs to someone else" — never leak existence of another user's solve).
3. Rate limit check (see `docs/specs/rate-limiting-and-conventions.md`). `429` on exceeded.
4. `INSERT INTO messages (solve_id, role='user', content)`.
5. Load context for the agent call: the solve's `parsed_problem`, `steps_json`, `final_answer`, plus the most recent 20 messages for this `solve_id` (ordered by `created_at`) — see `docs/engineering/engineering-doc.md` §8 for the truncation rationale.
6. Call `lib/ai/followUp.ts`, which sends Claude: a system prompt grounding it in the original problem/solution, explicitly instructing it **not** to re-solve from scratch or contradict the original steps, plus the message history as conversation turns.
7. On provider failure → `502 { error: "provider_error" }` (the user's message is already persisted; they can retry the question).
8. `INSERT INTO messages (solve_id, role='agent', content=<response>)`.
9. Respond `201`: `{ id, role: "agent", content, created_at }`.

## 3. Prompt Strategy (`lib/ai/followUp.ts`)

- System prompt template:
  > "A student solved this problem: {parsed_problem}. Here is the worked solution: {steps_json as formatted text}. Final answer: {final_answer}. Answer the student's follow-up question about this specific solution. Stay consistent with the steps above — do not propose a different method or a different final answer unless the student explicitly points out an error, in which case acknowledge it directly rather than silently changing your answer."
- Conversation turns: prior `messages` rows mapped to Claude's `user`/`assistant` roles (DB's `'agent'` role maps to Claude's `'assistant'`).

## 4. Edge Cases

| Case | Behavior |
|---|---|
| Follow-up on a solve with `verification_status='failed'` (answer withheld) | Agent is told the answer was withheld pending review; it may still explain the steps shown but must not state the (unverified) final answer. |
| Message thread exceeds 20 prior messages | Only the most recent 20 are sent as context (older history still stored and visible in the UI, just not replayed to the model) — keeps latency/cost bounded. |
| User asks an unrelated question (e.g., "what's the weather") | Agent is instructed via system prompt to redirect: "I can only help with this math problem — ask me about the steps above." |
| Empty/whitespace-only message | `400`, rejected before any DB write. |
| Rapid-fire messages (spam) | Rate limiter caps requests per user per minute (see rate-limiting spec); excess returns `429`. |

## 5. Acceptance Criteria

- [ ] Asking "why did you do that step?" about step 2 returns a response referencing that step's content, not a generic restatement.
- [ ] The agent never produces a final answer that contradicts the original `solves.final_answer` for the same solve unless the user explicitly flags an error.
- [ ] A follow-up on another user's solve returns `404`.
- [ ] Follow-up P95 latency is under 5 seconds against the production Claude model.
- [ ] Reopening a solve from History and continuing the conversation preserves and displays prior messages in order.
