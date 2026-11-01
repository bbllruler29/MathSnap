# Plan: Generate `docs/engineering/engineering-doc.md` for MathSnap

## Context
`docs/math-photo-solver-prd.md` (Full PRD, approved) defines **MathSnap** — a mobile-first app where users photograph a math problem and a conversational AI agent parses, solves, and explains it step-by-step, with follow-up Q&A and solve history. Per `skills/engineering-planner/SKILL.md`, this PRD now needs to be translated into a single authoritative engineering document — `docs/engineering/engineering-doc.md` — covering architecture, stack, data model, APIs, and implementation roadmap, so engineering can scope and build against it. No code or prior engineering docs exist yet in this repo (fresh project).

This run produces **only** `docs/engineering/engineering-doc.md` (not `implementation-specs.md` — that's a separate follow-up per the user's choice, deferring from the CLAUDE.md Stage 1 bundle).

## Resolved Architectural Decisions
(Confirmed with user — bake these into the doc rather than leaving them open.)

- **Frontend:** Next.js (fixed by SKILL.md) — App Router, TypeScript (per CLAUDE.md), Tailwind, Zustand or React Context for state, KaTeX for math rendering (per PRD FR5).
- **Backend/DB:** Supabase (Postgres + Auth + Storage + RLS) — the de facto stack implied throughout CLAUDE.md's later stages (Stage 2 Supabase schema, Stage 7 RLS policies). Storage bucket for uploaded problem photos; Postgres for users, solves, conversations, history, review queue.
- **AI Architecture:** Anthropic Claude (multimodal vision + tool use) as the core solving agent, paired with a symbolic math verification layer (e.g., SymPy via a backend service/edge function) that cross-checks the agent's final answer before it's returned — directly addressing the PRD's "math hallucination" risk (Section 6).
- **Admin/Review persona:** Include a lightweight `admin`/`reviewer` role (DB role column + protected admin routes) backing the PRD's "flagged answer → human-review queue" mitigation — a `flagged_solves` table, a reviewer-only API/page to triage them, no public signup for this role (manually provisioned).
- **User roles overall:** `student`/`parent` (same consumer role, no behavioral distinction needed for MVP) and `admin` (reviewer).
- **COPPA/FERPA:** Documented as a security/compliance consideration in Non-Functional/Backend sections (age-gate at signup, minimal PII retention, no behavioral ad targeting) — flagged as a design constraint, not fully solved here (deep implementation lives in a future `/security-foundation` stage per CLAUDE.md).

## Approach
Write `docs/engineering/engineering-doc.md` directly (no existing code/doc to merge with) following the exact 14-section structure mandated by `skills/engineering-planner/SKILL.md`, grounding every section in the PRD's functional requirements (FR1–FR8), non-functional requirements, user stories, and risks:

1. **Executive Summary** — MathSnap, business goal/problem statement/target users/success criteria pulled from PRD §1.
2. **Product Scope** — in/out of scope mapped directly from PRD §3.2/3.3, plus a "Future Enhancements" list (multi-problem worksheets, offline mode, non-math subjects, school licensing — PRD's P2 items and open questions).
3. **User Personas** — Student, Parent, (Teacher/Tutor viewer — read-only, PRD tertiary persona), Admin/Reviewer — responsibilities & permissions per role.
4. **User Flows** — signup/auth, photo capture → solve, follow-up Q&A, solve history/search, flagged-answer → admin review queue. Each in the `User Action → Frontend Behavior → Backend Processing → Database Interaction → System Response` format mandated by the skill.
5. **Frontend Architecture** — Next.js App Router structure, KaTeX rendering, camera/upload component, chat UI for follow-ups, loading/empty/error/offline states, mobile-first responsive + a11y notes.
6. **Backend Architecture** — Supabase Auth, API routes (Next.js route handlers) for upload/solve/follow-up/history/admin-review, the vision-parse → solve-agent → symbolic-verify pipeline as a service diagram (Mermaid), rate limiting/validation/error handling middleware.
7. **Database Design** — tables: `users`, `solves` (image ref, parsed problem, solution steps, topic tags, confidence score), `conversations`/`messages` (follow-up Q&A per solve), `flagged_solves` (review queue), with columns/types/relationships/indexes/RLS-relevant constraints.
8. **AI Architecture** — Claude model choice, prompt strategy (vision parse prompt vs. solve prompt vs. follow-up prompt), conversation memory/context window handling per solve, symbolic verification step, confidence thresholding (PRD FR6), token/cost controls, fallback behavior on low confidence or provider error.
9. **API Specification** — endpoints for upload-and-solve, follow-up message, get history, flag-solve, admin review list/action — method, auth, request/response schema, validation, error responses.
10. **Feature Breakdown** — Phase 1 (MVP per PRD §3.4: capture/upload, parsing, solving agent, notation rendering, basic follow-up), Phase 2 (history, broader topic coverage, review queue hardening), Phase 3 (multi-problem detection, offline mode) — each with description/acceptance criteria/dependencies traced to PRD FR/user stories.
11. **Folder Structure** — production Next.js layout (`app/`, `components/`, `lib/ai/`, `lib/db/`, `lib/supabase/`, etc.) with purpose annotations.
12. **Naming Conventions** — files/components/hooks/services/API routes/DB tables/env vars, with concrete examples drawn from this app's domain (e.g., `useSolveAgent`, `solves` table, `SOLVE_CONFIDENCE_THRESHOLD`).
13. **Testing Strategy** — unit (parsing/verification logic), integration (API routes + Supabase), E2E (capture-to-solution flow, follow-up flow) with frameworks (Vitest/Jest, Playwright) and coverage targets tied to PRD accuracy metrics.
14. **Specs → Implementation Mapping** — table linking each PRD requirement/user story to the engineering-doc section and eventual implementation file(s).

Include Mermaid diagrams for: system architecture (client → API → AI pipeline → DB), and the solve-request sequence flow, per SKILL.md's "include diagrams where architecture benefits" requirement.

## Verification
- Confirm `docs/engineering/engineering-doc.md` is created and contains all 14 required sections in order, with no placeholder/TBD text (per SKILL.md's "no vague statements" requirement) except explicitly-flagged open items already noted in the PRD.
- Cross-check that every PRD functional requirement (FR1–FR8) and each of the three user stories appear somewhere in the User Flows, API Spec, or Feature Breakdown sections — nothing silently dropped.
- Spot-check the Database Design section against the User Flows to confirm every flow has a corresponding table/field (no flow referencing data that isn't modeled).
- Present the finished doc to the user and ask whether to proceed to `implementation-specs.md` next (deferred from this run).
