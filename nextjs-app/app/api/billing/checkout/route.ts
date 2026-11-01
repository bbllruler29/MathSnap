import { createClient } from "@/lib/supabase/server";
import { ApiError, toResponse } from "@/lib/api/errors";
import { parseOrThrow } from "@/lib/api/parse";
import { requireUser } from "@/lib/auth/requireUser";
import { stripe, priceIdForPlan } from "@/lib/stripe/client";
import { checkoutRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const user = await requireUser(supabase);
    const body = parseOrThrow(checkoutRequestSchema, await request.json());

    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | null | undefined;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    try {
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: profile?.email ?? user.email ?? undefined,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;
        await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceIdForPlan(body.plan), quantity: 1 }],
        success_url: `${appUrl}/app/billing?success=1`,
        cancel_url: `${appUrl}/app/billing?canceled=1`,
      });

      if (!session.url) {
        throw new Error("No checkout URL returned");
      }

      return Response.json({ checkout_url: session.url });
    } catch (stripeErr) {
      console.error("Stripe checkout error:", stripeErr);
      throw new ApiError(
        502,
        "billing_provider_error",
        "We couldn't start checkout. Please try again."
      );
    }
  } catch (err) {
    return toResponse(err);
  }
}
