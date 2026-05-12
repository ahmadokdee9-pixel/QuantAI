import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { appUrl } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/client";

/**
 * Customer Portal — requires STRIPE_SECRET_KEY and a Stripe customer id per user
 * (or STRIPE_CUSTOMER_ID_PLACEHOLDER for single-account testing). Placeholder returns billing page as JSON.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return jsonErr(401, "Unauthorized");
    }

    const stripe = getStripe();
    const customerId = process.env.STRIPE_CUSTOMER_ID_PLACEHOLDER?.trim();

    if (!stripe || !customerId) {
      return jsonOk({
        ok: false as const,
        mode: "placeholder" as const,
        redirectUrl: `${appUrl()}/billing?focus=manage`,
        message:
          "Set STRIPE_SECRET_KEY and persist Stripe customer IDs per user (or STRIPE_CUSTOMER_ID_PLACEHOLDER for single-account testing).",
      });
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl()}/billing`,
      });
      return jsonOk({ ok: true as const, mode: "stripe" as const, url: session.url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe error";
      return jsonErr(502, msg);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Portal could not open";
    return jsonErr(500, msg);
  }
}
