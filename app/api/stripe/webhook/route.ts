import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { getStripe } from "@/lib/stripe/client";
import { stripeWebhookSecret, tierFromStripePriceId } from "@/lib/stripe/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Stripe webhook receiver — verifies signatures and syncs a minimal subscription
 * source of truth to Supabase for portal + entitlement resolution.
 */
export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const secret = stripeWebhookSecret();
    if (!stripe || !secret) {
      return jsonErr(503, "Stripe webhook is not configured.");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return jsonErr(400, "Missing Stripe-Signature header.");
    }

    const rawBody = await req.text();

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      return jsonErr(400, "Invalid webhook signature or payload.");
    }

    if (supabaseAdmin) {
      const object = event.data.object as unknown as Record<string, unknown>;
      if (event.type === "checkout.session.completed") {
        const userId = typeof object.client_reference_id === "string" ? object.client_reference_id : "";
        const customerId = typeof object.customer === "string" ? object.customer : "";
        const subscriptionId = typeof object.subscription === "string" ? object.subscription : "";
        const metadata = object.metadata && typeof object.metadata === "object" ? object.metadata as Record<string, unknown> : {};
        const tier = metadata.plan === "premium" ? "premium" : metadata.plan === "pro" ? "pro" : "free";
        if (userId && customerId) {
          await supabaseAdmin.from("user_billing_state").upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId || null,
              subscription_tier: tier,
              status: "active",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        }
      }

      if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        const customerId = typeof object.customer === "string" ? object.customer : "";
        const subscriptionId = typeof object.id === "string" ? object.id : "";
        const status = typeof object.status === "string" ? object.status : "unknown";
        const metadata =
          object.metadata && typeof object.metadata === "object"
            ? (object.metadata as Record<string, unknown>)
            : {};
        const metaPlan = metadata.plan === "premium" ? "premium" : metadata.plan === "pro" ? "pro" : null;
        const items = object.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
        const priceId = items?.data?.[0]?.price?.id ?? null;
        const tierFromPrice = tierFromStripePriceId(priceId);
        const currentPeriodEnd =
          typeof object.current_period_end === "number"
            ? new Date(object.current_period_end * 1000).toISOString()
            : null;
        if (customerId) {
          const { data } = await supabaseAdmin
            .from("user_billing_state")
            .select("user_id, subscription_tier")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          if (data?.user_id) {
            const canceled =
              event.type === "customer.subscription.deleted" ||
              status === "canceled" ||
              status === "unpaid" ||
              status === "incomplete_expired";
            const nextTier = canceled
              ? "free"
              : metaPlan ?? (tierFromPrice !== "free" ? tierFromPrice : data.subscription_tier ?? "free");
            await supabaseAdmin
              .from("user_billing_state")
              .update({
                stripe_subscription_id: subscriptionId || null,
                status,
                subscription_tier: nextTier,
                current_period_end: currentPeriodEnd,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", data.user_id);
          }
        }
      }
    }

    return jsonOk({ received: true, type: event.type });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook handler failed";
    return jsonErr(500, msg);
  }
}
