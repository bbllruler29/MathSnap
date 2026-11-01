# Spec: Solve History (FR7)

Covers the per-user list of past solves, topic tagging/grouping, search/filter, and reopening a past solve's conversation.

---

## 1. API: `GET /api/solves`

**File:** `app/api/solves/route.ts` (same file as the `POST` handler in `docs/specs/photo-capture-and-ai-solving.md`; add a `GET` export).

**Auth:** Required.

**Query params:**
- `topic?: string` — exact match against `solves.topic`.
- `from?: string` (ISO date) — `created_at >= from`.
- `to?: string` (ISO date) — `created_at <= to`.
- `cursor?: string` — base64-encoded `created_at` of the last item from the previous page (keyset pagination).
- `limit?: number` — default `20`, max `50`.

**Server-side steps:**
1. Validate query params (`lib/validation/schemas.ts#solveHistoryQuerySchema`); `400` on invalid date format or `limit > 50`.
2. `SELECT id, topic, final_answer, confidence_score, verification_status, created_at FROM solves WHERE user_id = auth.uid() [AND topic = :topic] [AND created_at >= :from] [AND created_at <= :to] [AND created_at < :cursor] ORDER BY created_at DESC LIMIT :limit + 1` (fetch one extra row to determine `next_cursor`).
3. If `rowCount > limit`, drop the extra row and set `next_cursor = base64(last_included.created_at)`; else `next_cursor = null`.
4. Respond `200`: `{ items: [{ id, topic, final_answer, confidence_score, verification_status, created_at }], next_cursor }`. Note: list responses omit `steps_json`/`parsed_problem`/`image_path` to keep payload light — the detail view (`GET /api/solves/:id`, below) fetches the full record.

## 2. API: `GET /api/solves/:id`

**File:** `app/api/solves/[id]/route.ts`

**Auth:** Required; solve must belong to requester (`404` otherwise, same non-leaking rationale as the follow-up endpoint).

**Response `200`:** `{ id, parsed_problem, topic, steps: [...], final_answer, confidence_score, verification_status, created_at, messages: [...] }` — includes the full message thread so the detail page can render history + chat in one request.

## 3. Frontend

**Route:** `app/(app)/history/page.tsx`

- **Component:** `components/history/SolveList.tsx` — fetches via `GET /api/solves`, groups rendered items by `topic` with a sticky section header per topic, infinite-scroll using `next_cursor`.
- **Component:** `components/history/TopicFilter.tsx` — chip-style filter row (All, Algebra, Geometry, Calculus, …, derived from the distinct topics present in the user's own history, fetched once on page load via a lightweight `GET /api/solves/topics` helper endpoint that returns `SELECT DISTINCT topic FROM solves WHERE user_id = auth.uid()`).
- Date range picker (optional, collapsed by default) sets `from`/`to` query params.
- Tapping a list item navigates to `app/(app)/solve/[id]/page.tsx`, which calls `GET /api/solves/:id` and renders `StepRenderer` + `FollowUpChat` pre-populated with existing messages.

## 4. UX States

- **Loading:** skeleton rows matching the list item shape.
- **Empty (no solves at all):** "No solves yet — snap your first problem" with a CTA back to the capture screen.
- **Empty (filtered, no results):** "No solves match this filter" with a "Clear filters" action, distinct from the true-empty state.
- **Error:** inline retry banner if the fetch fails; do not clear already-rendered items on a failed "load more".

## 5. Edge Cases

| Case | Behavior |
|---|---|
| Solve with `verification_status='failed'` appears in history | Shown with a small "under review" badge; tapping it still opens the detail/chat view (steps visible, answer withheld per the solving spec). |
| `from` > `to` | `400` — invalid range. |
| `cursor` from a different user's session reused (tampered) | Harmless — `WHERE user_id = auth.uid()` still scopes the query; at worst returns an empty page, no data leak. |
| Deleted solve (future feature — not in MVP) | Not applicable yet; no delete endpoint exists in this spec. |

## 6. Acceptance Criteria

- [ ] History list is scoped strictly to the requesting user — verified via an RLS/integration test that a second user's solves never appear.
- [ ] Filtering by topic returns only matching solves; clearing the filter returns the full list.
- [ ] Pagination via `next_cursor` returns no duplicate and no skipped items across pages (keyset correctness).
- [ ] Reopening a past solve shows the exact steps, final answer, and full message history as originally produced.
- [ ] Empty-history and empty-filtered-results states are visually distinct and each show the correct CTA.
