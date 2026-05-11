import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { getStripe } from "@/lib/stripe/client";
import { stripeWebhookSecret } from "@/lib/stripe/config";

/**
 * Stripe webhook receiver — verifies signatures when configured.
 * Extend this handler to sync subscription state to Clerk `publicMetadata` or Supabase.
 */
export async function POST(req: Request) {
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

  try {
    stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return jsonErr(400, "Invalid webhook signature or payload.");
  }

  return jsonOk({ received: true });
}
