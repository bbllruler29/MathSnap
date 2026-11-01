import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

export function priceIdForPlan(plan: "monthly" | "annual"): string {
  const priceId =
    plan === "monthly" ? process.env.STRIPE_PRICE_ID_MONTHLY : process.env.STRIPE_PRICE_ID_ANNUAL;
  if (!priceId) {
    throw new Error(`Missing Stripe price id for plan: ${plan}`);
  }
  return priceId;
}
