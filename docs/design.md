# MathSnap — Design System

**Thesis:** MathSnap's whole product is a transformation — a photographed problem becomes a worked solution. Every screen should feel like a page of math homework that's been helped along, not a SaaS dashboard and not a kids' cartoon. The visual language is drawn from the real artifacts of doing math by hand: grid paper, a margin rail of worked steps, a highlighter box around the final answer, red-pen corrections. KaTeX renders math in its own classic serif — our UI type is deliberately sans, so the math notation stays the one "typeset" voice on the page and never competes with it.

**Signature element:** the **boxed final answer** — a hand-drawn-style highlighter box (soft, slightly irregular corner radius, amber) around the final answer, repeated everywhere an answer appears (hero demo, solution screen, history list). It's the one thing every student already does on paper; MathSnap just does it for them.

---

## Color

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F6F7F4` | App/page background — cool, light "graph paper" white, not warm cream |
| `ink` | `#1B1E2B` | Primary text — indigo-black, softer than pure black |
| `study-teal` | `#0E7C7B` | Primary brand/action color — buttons, links, active states, agent chat accent |
| `highlighter` | `#F2A93B` | The boxed-answer signature, primary CTA fills, "under review"/attention highlights |
| `grid-line` | `#D7DEE8` | Hairline borders, the faint background grid texture, dividers |
| `red-pen` | `#C1483D` | Low-confidence warnings, flagged/error states — a corrective-ink red, never alarm-red |

Usage rules:
- `paper` + `ink` is the base for ~90% of every screen. Color is earned, not ambient.
- `study-teal` is the only color used for interactive/navigational elements (links, active tab, primary chat bubble, "solve" button default state).
- `highlighter` is reserved for exactly one job per screen: marking the thing that matters most (the final answer, the primary upgrade CTA). If everything is highlighted, nothing is.
- `red-pen` only ever appears for genuine corrective/warning moments (low-confidence parse, flagged answer, form errors) — never decorative.
- Background grid texture: a repeating 24px × 24px linear-gradient grid in `grid-line` at low opacity (see `globals.css` below) — always subtle enough to disappear under content.

## Typography

| Role | Face | Notes |
|---|---|---|
| Display (headlines, step numbers, nav wordmark) | **Space Grotesk** | Bold/700 for headlines, tight letter-spacing (-0.01em). Technical, confident, a little unusual — carries the app's personality. Tabular numerals for step counters. |
| Body (paragraphs, chat, explanations, buttons, labels) | **Figtree** | 400/500/600. Rounder and warmer than Space Grotesk — this is what a tired student reads at 10pm, so it needs to be calm and easy, not technical. Base size 16px, 18px for solution-step explanation text, line-height 1.6–1.7. |
| Utility (eyebrows, topic tags, timestamps, confidence %, env-style labels) | **IBM Plex Mono** | Uppercase, tracked out (+0.04em), 12–13px. Signals "this is metadata," distinct from both the display voice and the body voice. |
| Math notation | **KaTeX default (CMU Serif–based)** | Never restyled. This is intentional — it's the one serif element on the page, and it's what makes the math feel typeset/authoritative against the sans UI around it. |

Load via `next/font/google` (Space Grotesk, Figtree, IBM Plex Mono) — no external font CDN calls, no FOUT.

## Layout & Spacing

- Spacing unit: 4px base (Tailwind default scale, used as-is — no custom spacing scale needed).
- Reading/content max-width: `42rem` (672px) for solution text and chat — wider than that hurts readability for dense math explanations.
- Radius: `12px` on cards, inputs, chat bubbles, modals (`rounded-xl`). `10px` on buttons (`rounded-[10px]`). Never full-pill (reads as toy-app childish) and never 0 (reads as enterprise/legal — the exact aesthetic we're avoiding).
- Borders over shadows: cards use a `1px solid grid-line` border by default — like a box drawn on grid paper. Shadows (`shadow-sm` only) reserved for truly elevated surfaces (modals, the active camera viewfinder frame).
- Mobile-first: primary breakpoint is a single-column phone layout; tablet/desktop (`md:`/`lg:`) widen the content column and add a persistent sidebar for History, but never change the component vocabulary.

## Signature Component: Boxed Answer

```html
<span class="relative inline-block">
  <span class="relative z-10 font-display font-bold text-ink">{{ final_answer }}</span>
  <!-- slightly irregular box, rotated -0.4deg, drawn via border + subtle corner asymmetry -->
  <span class="absolute inset-[-6px_-10px] -z-0 rounded-[6px_10px_7px_9px] border-[2.5px] border-highlighter rotate-[-0.4deg]"></span>
</span>
```
Used identically in the hero demo, the solution view's final step, and any history list preview — one recognizable mark, everywhere an answer lives.

## Step Rail (solution view)

Each solved step is a row with: a small circular index badge (Space Grotesk numeral, `study-teal` fill on `paper` text) connected to the next by a 2px `grid-line` vertical rule — a literal "worked-solution margin rail." The last step's index badge is `highlighter` instead of `study-teal`, visually handing off to the boxed final answer beneath it.

## Motion

One orchestrated moment, used once: the landing-page hero animates a photographed problem (left) into its step-by-step solution (right) on load — steps reveal in sequence, the final answer's highlighter box draws itself last. Everywhere else: motion is restrained to a 150ms ease-out scale (0.98→1) on button/card press, and a soft fade for async loading states. All motion respects `prefers-reduced-motion` (hero shows its end-state immediately, no scale/press animation).

## Voice (UI copy)

- Plain, active, specific. "Snap a photo" not "Capture image input." "We had trouble reading this photo" not "Image recognition confidence below threshold."
- Errors explain what happened and what to do next, in MathSnap's voice — never apologetic, never vague: "We couldn't read this clearly — try moving to better light or cropping tighter," not "An error occurred."
- The product never claims certainty it hasn't earned: unverified answers are labeled "AI-generated, not independently checked" rather than hidden or oversold.

---

## Tailwind Tokens (for `tailwind.config.ts`)

```ts
colors: {
  paper: "#F6F7F4",
  ink: "#1B1E2B",
  "study-teal": "#0E7C7B",
  highlighter: "#F2A93B",
  "grid-line": "#D7DEE8",
  "red-pen": "#C1483D",
},
fontFamily: {
  display: ["var(--font-space-grotesk)", "sans-serif"],
  body: ["var(--font-figtree)", "sans-serif"],
  mono: ["var(--font-plex-mono)", "monospace"],
},
borderRadius: {
  xl: "12px",
},
```
