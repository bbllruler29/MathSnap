import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return Response.json(
      { error: "invalid_signature", message: "Missing signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return Response.json(
      { error: "invalid_signature", message: "Invalid signature." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | null;

        let expiresAt: string | null = null;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
        }

        await supabase
          .from("users")
          .update({ subscription_tier: "paid", subscription_expires_at: expiresAt })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const isActive = subscription.status === "active" || subscription.status === "trialing";

        await supabase
          .from("users")
          .update({
            subscription_tier: isActive ? "paid" : "free",
            subscription_expires_at: isActive
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from("users")
          .update({ subscription_tier: "free", subscription_expires_at: null })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default:
        return Response.json({ received: true }, { status: 200 });
    }

    return Response.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return Response.json(
      { error: "internal_error", message: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
