# Spec: Wrong-Answer Flagging & Admin Review Queue

Covers the PRD §6 risk mitigation: a user-facing "this answer was wrong" flag, and the internal admin/reviewer workflow for triaging it. Admin accounts are provisioned manually (see `docs/specs/auth-and-users.md` §5) — there is no public signup for this role.

---

## 1. API: `POST /api/solves/:id/flag`

**File:** `app/api/solves/[id]/flag/route.ts`

**Auth:** Required; solve must belong to requester.

**Request:** `{ reason?: string }` (optional free text, max 500 chars).

**Server-side steps:**
1. Fetch solve scoped to `user_id = auth.uid()`. `404` if not found/not owned.
2. Check for an existing flag: the `flagged_solves.solve_id` column has a `unique` constraint (see `supabase-schema.sql`) — attempt the insert and catch the unique-violation to return `409 { error: "already_flagged" }` rather than pre-querying (avoids a race between check and insert).
3. `INSERT INTO flagged_solves (solve_id, flagged_by, reason, status='open')`.
4. Respond `201`: `{ id, status: "open" }`.

**Frontend:** `components/solve/FlagButton.tsx` on the solve detail page — "This answer was wrong" link below the final answer, opens a small modal for the optional reason, then shows a confirmation toast ("Thanks — we'll review this.") and replaces the button with a static "Under review" label for that solve (refetch or optimistic update).

## 2. API: `GET /api/admin/flagged-solves`

**File:** `app/api/admin/flagged-solves/route.ts`

**Auth:** Required, `role='admin'` only — checked explicitly in the route handler via `lib/auth/requireAdmin.ts` (a helper that loads `users.role` server-side and throws a typed `ForbiddenError` mapped to `403`), in addition to RLS. This defense-in-depth is intentional: RLS protects the data even if the route-level check is ever bypassed, and the route-level check gives a clean `403` instead of a confusing empty result set.

**Query params:** `status? = 'open' | 'resolved' | 'escalated'` (default `'open'`), `cursor?`.

**Server-side steps:**
1. `403` if not admin.
2. `SELECT f.id, f.reason, f.status, f.created_at, f.flagged_by, s.id as solve_id, s.image_path, s.parsed_problem, s.topic, s.steps_json, s.final_answer, s.verification_status FROM flagged_solves f JOIN solves s ON s.id = f.solve_id WHERE f.status = :status ORDER BY f.created_at ASC LIMIT 20` (oldest-first — FIFO triage), keyset-paginated same as solve history.
3. Respond `200`: `{ items: [...], next_cursor }`.

## 3. API: `PATCH /api/admin/flagged-solves/:id`

**File:** `app/api/admin/flagged-solves/[id]/route.ts`

**Auth:** `role='admin'` only.

**Request:** `{ status: "resolved" | "escalated", reviewer_notes?: string }`.

**Server-side steps:**
1. `403` if not admin. `400` if `status` not one of the two allowed transition targets (an admin cannot set status back to `'open'` via this endpoint — re-opening, if ever needed, is a manual DB operation, not a product feature).
2. `UPDATE flagged_solves SET status = :status, reviewer_notes = :reviewer_notes, reviewer_id = auth.uid(), resolved_at = now() WHERE id = :id`.
3. `404` if no row matched.
4. Respond `200` with the updated record.

**Note:** resolving a flag does **not** automatically change the underlying `solves.verification_status` or restore a withheld `final_answer`. If the reviewer determines the original AI answer was in fact correct, they correct it by hand via a direct DB update (documented ops runbook, out of scope for this MVP's UI) or, if the admin UI's scope grows in Phase 2, a dedicated "correct and republish" action. For MVP, resolving a flag only closes the review item; it does not auto-unlock the answer for the end user. This is a deliberate MVP scope cut — flag it to the user.

## 4. Frontend: Admin Review Queue

**Route:** `app/admin/review/page.tsx` (protected by `middleware.ts`'s admin check, see `docs/specs/auth-and-users.md` §4).

- **Component:** `components/admin/ReviewQueueTable.tsx` — table of open flags (reason, flagged date, topic), status filter tabs (Open / Resolved / Escalated).
- **Component:** `components/admin/ReviewDetailPanel.tsx` — opened on row click, shows: the original uploaded image (signed URL via admin's elevated storage read, allowed by the `problem_images_select_own_or_admin` storage policy), the parsed problem, the full `steps_json`, the (possibly withheld) final answer, `verification_status`, and the flag `reason`. Two actions: "Mark Resolved" / "Escalate", each with a `reviewer_notes` textarea.

## 5. Edge Cases

| Case | Behavior |
|---|---|
| User flags the same solve twice (double-tap) | Second request gets `409`; frontend treats `409` identically to a successful flag (idempotent from the user's perspective — no error shown). |
| Auto-flagged solves from a failed symbolic verification (see `docs/specs/photo-capture-and-ai-solving.md` §2 step 7) | Appear in the same queue indistinguishable in structure, but `reason = 'auto: symbolic verification mismatch'` — the UI prefixes auto-flags with a small "Auto-detected" tag so reviewers can prioritize differently. |
| Non-admin hits `/admin/review` directly via URL | Redirected to `/app` by `middleware.ts`; API calls from that page would separately `403` even if the page somehow rendered. |
| Flag on a solve that's later deleted (no delete feature exists yet) | Not applicable in MVP — no delete path. |

## 6. Acceptance Criteria

- [ ] A non-owner cannot flag another user's solve (`404`).
- [ ] Flagging the same solve twice is idempotent from the user's perspective (no duplicate queue entries, no confusing error).
- [ ] A non-admin account receives `403` from every `/api/admin/*` route and is redirected away from `/admin/review` in the browser.
- [ ] The review queue is ordered oldest-flag-first and correctly filters by status.
- [ ] Marking a flag "Resolved" or "Escalated" persists `reviewer_id`, `reviewer_notes`, and `resolved_at`, and removes it from the default (`status=open`) queue view.
