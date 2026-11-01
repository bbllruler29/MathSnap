# MathSnap — AI Math Problem Solver — Product Requirements Document

**Date:** 2026-10-31
**Author:** Product Team
**Status:** Draft
**Version:** 1.0

---

## 1. Executive Summary

### Problem Statement
Students and parents frequently get stuck on math homework and have no fast, reliable way to get a step-by-step explanation outside of tutoring hours. Typing complex math notation (fractions, exponents, integrals, geometric figures) into a search bar or chatbot is slow and error-prone, and generic text-based AI tools often misinterpret handwritten or textbook-formatted problems.

### Proposed Solution
MathSnap lets a user photograph a math question — handwritten, printed, or textbook — and an AI agent parses the image, identifies the problem type, solves it step-by-step, and returns a clear worked explanation with the final answer. The agent can handle follow-up questions ("why did you do that step?") and supports a wide range of topics from arithmetic through calculus.

### Business Impact
- **Revenue:** Freemium model with subscription upsell (unlimited solves, advanced topics, step-by-step tutoring mode) targets a large existing market (photo math solvers have proven demand — e.g., Photomath, Gauthmath).
- **Competitive/strategic:** Differentiates via a true conversational agent (follow-up Q&A, adaptive explanation depth) rather than a one-shot answer tool, positioning for retention and higher perceived value.
- **Growth/efficiency:** Low marginal cost per solve once vision+reasoning pipeline is built; scales well with network effects (student referrals, classroom/school adoption).

### Key Milestones
| Milestone | Target Date |
|---|---|
| Design Complete | Week 3 |
| MVP Development | Week 10 |
| Beta Launch | Week 14 |
| Full Launch | Week 20 |

### Success Metrics
| Metric | Current | Target |
|---|---|---|
| Problem recognition accuracy (image → correctly parsed problem) | N/A (new product) | ≥ 95% |
| Solve accuracy (correct final answer + valid steps) | N/A | ≥ 98% on K-12 scope; ≥ 90% on calculus |
| D7 retention | N/A | ≥ 30% |
| Free-to-paid conversion | N/A | ≥ 5% within 90 days |

---

## 2. Problem Definition

### 2.1 Customer Problem
- **Who:** Middle/high school and early college students (primary); parents helping with homework (secondary); tutors/teachers checking work (tertiary).
- **What:** Getting stuck on a math problem with no immediate way to see *how* to solve it, not just the final answer.
- **When:** Most acutely during homework time (evenings) and exam prep (nights/weekends), when live tutoring isn't available.
- **Where:** At home, on mobile devices, often working from a printed worksheet, textbook, or handwritten notes.
- **Why:** Math notation is hard to type; students need worked steps (not just answers) to actually learn; existing search/chatbot tools require manual transcription that introduces errors, especially for fractions, exponents, and diagrams.
- **Impact:** Homework incompletion, lower confidence in math, increased reliance on costly human tutoring, and in the worst case, copied answers without understanding (undermining learning).

### 2.2 Market Opportunity
- **Market Size:** Global K-12 + higher-ed tutoring/edtech market is multi-billion dollar; photo-based math solver apps (Photomath, Gauthmath, Microsoft Math Solver) have collectively driven tens of millions of downloads, indicating strong validated demand.
- **Growth Rate:** AI-in-education tooling is one of the fastest-growing edtech segments as generative AI capabilities improve.
- **Current Solutions:** Existing apps (Photomath, Gauthmath, Microsoft Math Solver) handle OCR-to-answer well but offer limited conversational follow-up and often paywall step-by-step explanations aggressively or rely on human solvers for harder problems (slow, costly).
- **Why Now:** Multimodal LLMs have matured to the point of reliably parsing messy handwriting and diagrams and reasoning through multi-step math, making a true conversational agent (vs. static OCR+lookup) newly feasible at consumer scale and cost.

### 2.3 Business Case
- **Revenue Potential:** Subscription tier ($7–$12/month) layered on a free tier with daily solve limits; potential B2B2C channel via school licensing.
- **Cost Savings:** Reduces need for on-demand human tutors for routine problem-solving, lowering support costs for any paired tutoring service.
- **Strategic Alignment:** Builds a defensible, high-engagement edtech product with a clear expansion path (study guides, practice generation, exam prep) if company has education/consumer AI ambitions.
- **Risk of Inaction:** Competitors with conversational-agent-based solvers will capture the "homework help" use case first; static OCR-solvers will look outdated against agent-based tutoring.

---

## 3. Solution Overview

### 3.1 What We're Building
A mobile-first app (with web companion) where a user photographs or uploads an image of a math problem. A vision-and-reasoning agent:
1. Detects and parses the math content from the image (handwritten, printed, or diagram-based).
2. Classifies the problem type and topic (algebra, geometry, calculus, etc.).
3. Solves it step-by-step, rendering proper math notation (LaTeX-style) in the explanation.
4. Allows the user to ask follow-up questions in natural language ("can you explain step 3 differently?", "what if the exponent were negative?").
5. Lets the user save solved problems to a history/study log for review.

### 3.2 In Scope
| Feature | Priority | Description |
|---|---|---|
| Photo capture & upload | P0 | Camera capture or photo-library upload of a math problem image |
| Image parsing (OCR + diagram understanding) | P0 | Extract problem text, equations, and simple geometric figures from the image |
| Step-by-step solving agent | P0 | Multimodal reasoning agent that solves the parsed problem and generates a worked explanation |
| Conversational follow-up | P0 | User can ask clarifying/follow-up questions about the solution in a chat interface |
| Math notation rendering | P0 | Render equations/fractions/exponents clearly (not plain text) in the solution UI |
| Solve history | P1 | Save past solved problems for later review |
| Topic coverage breadth (arithmetic → calculus) | P1 | Support core K-12 topics at launch; calculus/early college as stretch goal |
| Multi-problem image handling | P2 | Detect and solve multiple problems in a single photo (e.g., full worksheet) |
| Offline/low-connectivity mode | P2 | Cache recent solves for offline viewing |

### 3.3 Out of Scope
- Full essay-style word-problem generation or open-ended tutoring curriculum (beyond solving the specific photographed problem).
- Handwriting *grading* or detecting plagiarism/cheating use cases.
- Support for non-math subjects (physics/chemistry problem sets) at launch — flagged as a future phase.
- Live human tutor hand-off within the app.

### 3.4 MVP Definition
- **Core Features:** Photo capture/upload, image parsing, step-by-step solving agent, math notation rendering, basic conversational follow-up (single-turn clarification).
- **Success Criteria:** ≥ 95% problem recognition accuracy and ≥ 98% solve accuracy on a K-12 benchmark set of ~500 problems; median time-to-solution under 10 seconds.
- **MVP Target Date:** Week 10.
- **Learning Goals:** Validate that users trust and understand agent-generated step-by-step explanations (vs. just wanting the final answer), and that image parsing is robust enough across handwriting styles and lighting conditions to be usable in real homework settings.

---

## 4. User Stories & Requirements

### 4.1 User Stories

As a **high school student**
I want to **photograph a handwritten algebra problem and get a step-by-step solution**
So that **I can understand how to solve similar problems on my own**

Acceptance Criteria:
- [ ] User can capture a photo directly in-app or upload from their photo library
- [ ] The app correctly parses handwritten and printed equations in ≥ 95% of clear-image cases
- [ ] The solution is displayed with properly rendered math notation and numbered steps

As a **parent helping with homework**
I want to **ask the agent why a particular step was taken**
So that **I can explain it to my child in my own words**

Acceptance Criteria:
- [ ] User can type a free-text follow-up question referencing a specific step
- [ ] The agent responds with a clarifying explanation grounded in the original solution (no contradictory re-solving)
- [ ] Follow-up responses render within 5 seconds

As a **student reviewing for an exam**
I want to **see my history of previously solved problems grouped by topic**
So that **I can revisit problem types I struggled with**

Acceptance Criteria:
- [ ] Solved problems are automatically tagged by topic/subtopic
- [ ] History is searchable and filterable by topic and date
- [ ] User can re-open a past solution and continue the follow-up conversation

### 4.2 Functional Requirements
| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR1 | System must accept photo capture and gallery upload of math problem images | P0 | Support common formats (JPEG/PNG), max 10MB |
| FR2 | System must parse handwritten, printed, and textbook-formatted math notation from images | P0 | Includes fractions, exponents, roots, basic geometric diagrams |
| FR3 | Agent must generate a correct step-by-step solution with final answer | P0 | Steps must be individually verifiable, not just a final answer with filler text |
| FR4 | Agent must support natural-language follow-up questions tied to the original solution context | P0 | Must maintain conversation state per problem |
| FR5 | System must render math notation visually (not raw LaTeX text) in the UI | P0 | Use a math-rendering library (e.g., KaTeX/MathJax) |
| FR6 | System must flag low-confidence parses and prompt the user to retake/crop the photo | P1 | Reduces silent wrong-answer risk from bad OCR |
| FR7 | System must save solved problems to a per-user history log | P1 | Includes topic tagging for searchability |
| FR8 | System must detect multiple distinct problems within a single image | P2 | Stretch goal; MVP can require one problem per photo |

### 4.3 Non-Functional Requirements
- **Performance:** End-to-end solve (photo upload → step-by-step answer) in under 10 seconds at P95; follow-up responses under 5 seconds at P95.
- **Scalability:** Architecture must support scaling to 1M+ monthly active users without re-architecture, using horizontally scalable inference infrastructure.
- **Security:** Uploaded images and solve history must be encrypted at rest and in transit; no sharing of user-uploaded images with third parties beyond the inference provider.
- **Reliability:** 99.5% uptime for the solving service; graceful degradation (clear error message, no silent failure) when parsing confidence is too low.
- **Usability:** Must be usable one-handed on mobile within 3 taps from app open to photo capture; accessible explanation text compatible with screen readers.
- **Compliance:** COPPA compliance required given likely under-13 user base (parental consent flows, no behavioral ad targeting of minors); student data privacy aligned with FERPA if pursuing school-district distribution.

---

## 5. Go-to-Market Strategy

### Launch Plan
- **Beta:** Closed beta with ~500 students recruited via social media (TikTok/Instagram study-content creators) and a handful of partner tutoring centers, 4 weeks prior to full launch.
- **Full Launch:** iOS + Android app store launch with coordinated social/influencer campaign targeting back-to-school and exam seasons (back-to-school launch window preferred for peak demand).
- **Marketing:** Short-form video demos showing "photo in, full solution out" on real homework problems; App Store Optimization around "math solver," "homework help," "photo math."
- **Support:** In-app FAQ and feedback flagging ("this answer was wrong") that routes to a human-review queue to continuously improve the solving agent.

### Pricing
Freemium model: free tier includes a limited number of solves per day (e.g., 5) with full step-by-step explanations; paid subscription (~$9.99/month or ~$59.99/year) unlocks unlimited solves, advanced topics (calculus+), and unlimited follow-up conversation depth. Rationale: matches proven pricing in this category (Photomath Plus, Gauthmath subscriptions) while free tier drives top-of-funnel virality among students.

---

## 6. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Agent gives a confidently wrong answer (math hallucination), eroding trust and harming learning | Medium | High | Add automated answer-verification step (e.g., symbolic math checker cross-validation) before displaying solution; flag low-confidence results; add user feedback/reporting loop |
| Image parsing fails on messy handwriting or poor lighting, producing wrong problem interpretation | High | Medium | Confidence threshold with user prompt to retake/crop photo; allow manual correction of parsed problem before solving |
| Academic integrity concerns (schools/parents view it as "cheating" rather than learning aid) | Medium | Medium | Design default experience around step-by-step learning (not just final answer); offer a "practice mode" that hides the final answer until steps are reviewed |
| Regulatory/privacy risk from large under-13 user base handling photos of handwriting (potentially containing names/school info) | Medium | High | Implement COPPA-compliant consent flows, minimize data retention, avoid any ad-based monetization targeting minors, redact/avoid storing identifiable info beyond the math content |

---

## 7. Timeline & Milestones

| Milestone | Date | Deliverables | Success Criteria |
|---|---|---|---|
| Design Complete | Week 3 | UX flows, image-capture UI, solution-display mockups | Stakeholder approval |
| MVP Development | Week 10 | Photo capture/upload, parsing pipeline, solving agent, notation rendering, basic follow-up | All P0s functional on benchmark test set |
| Beta Launch | Week 14 | Limited release to ~500 beta testers | ≥ 95% recognition accuracy, ≥ 98% solve accuracy on K-12 set |
| Full Launch | Week 20 | GA on iOS + Android | <1% critical error rate, D7 retention ≥ 30% |

---

## 8. Team & Resources

| Role | Allocation |
|---|---|
| Product Manager | 1 FTE |
| Engineering Lead | 1 FTE |
| ML/Agent Engineers (vision + reasoning pipeline) | 3 FTEs |
| Mobile Engineers (iOS/Android) | 2 FTEs |
| Design | 1 FTE |
| QA (incl. math-accuracy review) | 2 FTEs |

**Budget:** Development $650K | Infrastructure (inference costs) $120K/yr | Marketing $150K | **Total $920K** (Year 1, pre-scale)

---

## 9. Open Questions
1. Should the solving agent be built on a third-party multimodal LLM API, a fine-tuned proprietary model, or a hybrid with a symbolic math engine (e.g., Wolfram-style) for answer verification?
2. What is the acceptable error-reporting/correction SLA when a user flags a wrong answer — is human review required before model updates, or can it be fully automated?
3. Is school/district B2B licensing a near-term goal (affecting FERPA compliance scope) or a later-phase consideration?
4. Should multi-problem worksheet detection (P2) be pulled into MVP if early user testing shows most real-world photos contain multiple problems?

## 10. Assumptions Made
- "Agent" is interpreted as a conversational, multi-turn AI system (not a one-shot OCR-to-answer tool), consistent with the explicit request to include an agent.
- Primary platform is mobile (iOS/Android) given the photo-capture-centric use case, with web as a secondary/companion surface.
- Target users skew K-12 and early college based on where photo-math-solver demand is best validated in the existing market.
- A freemium subscription model is assumed as the monetization strategy, based on comparable products' proven pricing approach; not validated against this specific company's broader business model.
- Underlying solving capability is assumed achievable via current multimodal LLM technology (as of 2026) combined with a symbolic verification layer, rather than requiring novel math-reasoning research.
