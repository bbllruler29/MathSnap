# Spec: Billing & Subscription (Freemium)

Covers the free-tier daily solve cap, Stripe-based upgrade to the paid tier, and webhook-driven subscription state sync.

---

## 1. Pricing (from PRD §5)

- **Free tier:** `DAILY_FREE_SOLVE_LIMIT` (default `5`) solves/day with full step-by-step explanations.
- **Paid tier:** unlimited solves, advanced topics (calculus+), unlimited follow-up depth. Two Stripe Price objects: `STRIPE_PRICE_ID_MONTHLY` ($9.99/mo), `STRIPE_PRICE_ID_ANNUAL` ($59.99/yr).

## 2. API: `POST /api/billing/checkout`

**File:** `app/api/billing/checkout/route.ts`

**Auth:** Required.

**Request:** `{ plan: "monthly" | "annual" }`.

**Server-side steps:**
1. `400` if `plan` not one of the two values.
2. If `users.stripe_customer_id` is null, create a Stripe Customer (`stripe.customers.create({ email, metadata: { supabase_user_id: auth.uid() } })`) and persist it: `UPDATE users SET stripe_customer_id = :id`.
3. Create a Checkout Session: `stripe.checkout.sessions.create({ customer: stripe_customer_id, mode: 'subscription', line_items: [{ price: priceIdForPlan(plan), quantity: 1 }], success_url: `${NEXT_PUBLIC_APP_URL}/billing?success=1`, cancel_url: `${NEXT_PUBLIC_APP_URL}/billing?canceled=1` })`.
4. Respond `200`: `{ checkout_url: session.url }`.

**Frontend:** `app/(app)/billing/page.tsx` — plan comparison cards, "Upgrade" button calls this endpoint then `window.location.href = checkout_url`.

## 3. API: `POST /api/billing/webhook`

**File:** `app/api/billing/webhook/route.ts`

**Auth:** None (Stripe-signed request) — verified via `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`. `400` if signature verification fails. This route must read the **raw** request body (disable Next.js body parsing for this route) — signature verification fails on a re-serialized JSON body.

**Handled events:**
- `checkout.session.completed` → look up `users` by `stripe_customer_id`, `UPDATE users SET subscription_tier = 'paid', subscription_expires_at = <period end from the associated subscription>`.
- `customer.subscription.updated` → sync `subscription_expires_at` to the subscription's `current_period_end`; if `status` is `'canceled'` or `'unpaid'`, set `subscription_tier = 'free'` immediately rather than waiting for expiry.
- `customer.subscription.deleted` → `UPDATE users SET subscription_tier = 'free', subscription_expires_at = null`.
- All other event types → acknowledge with `200` and no-op (Stripe requires a `200` for any event type it sends, even unhandled ones, to avoid retries).

**Idempotency:** Stripe may send the same event more than once. Handlers are written as idempotent `UPDATE`s keyed by `stripe_customer_id`/subscription id — re-applying the same event produces the same end state, so no separate dedup table is needed for MVP.

## 4. Free-Tier Enforcement

Enforced in `POST /api/solves` (see `docs/specs/photo-capture-and-ai-solving.md` §2, step 2) — this spec owns the *data* (`subscription_tier`, `daily_solve_count`, `daily_solve_count_date`) and the *billing lifecycle*; the solving spec owns the *enforcement point*. No separate scheduled job is needed to reset `daily_solve_count` — it resets lazily on the next solve attempt when `daily_solve_count_date != current_date`, which is simpler and avoids a cron dependency.

## 5. Edge Cases

| Case | Behavior |
|---|---|
| User's paid subscription expires mid-day (Stripe webhook delayed) | `subscription_expires_at` is advisory for UI display only; the authoritative gate is always the live `subscription_tier` value, which the webhook keeps in sync. A brief window of staleness (until the webhook arrives) is an accepted tradeoff — document, don't poll Stripe synchronously on every solve request. |
| Webhook signature invalid (replay/tampering attempt) | `400`, no DB write, logged as a security event. |
| User upgrades, then immediately requests a refund via Stripe support (manual) | Manual ops action: operator cancels the subscription in Stripe Dashboard, which fires `customer.subscription.deleted` and the webhook handles the downgrade automatically — no app-side refund UI needed for MVP. |
| Checkout session abandoned (user closes tab) | No DB change occurs (nothing fires until `checkout.session.completed`); user remains on `free` tier, can retry checkout anytime. |

## 6. Acceptance Criteria

- [ ] A free-tier user is blocked from a 6th daily solve with a clear upgrade prompt, and the block clears automatically the next calendar day.
- [ ] Completing Stripe Checkout upgrades `subscription_tier` to `'paid'` within one webhook round-trip, verified via a test-mode Stripe event.
- [ ] Canceling a subscription in Stripe (test mode) downgrades the user to `'free'` without any manual app-side intervention.
- [ ] The webhook endpoint rejects requests with an invalid or missing Stripe signature.
- [ ] Replaying the same `checkout.session.completed` event twice does not create duplicate state or errors.
