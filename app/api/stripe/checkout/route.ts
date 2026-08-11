import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { appUrl, stripePriceId, type QuantStripePlanKey } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/client";

const BodySchema = z.object({
  plan: z.enum(["pro", "premium"]),
});

/**
 * Creates a Stripe Checkout Session when STRIPE_SECRET_KEY + price IDs are set.
 * Otherwise returns a safe fallback URL for the billing page (JSON only, never empty).
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return jsonErr(401, "Unauthorized");
    }

    let body: z.infer<typeof BodySchema>;
    try {
      const json = (await req.json()) as unknown;
      body = BodySchema.parse(json);
    } catch {
      return jsonErr(400, "Invalid body");
    }

    const priceId = stripePriceId(body.plan as QuantStripePlanKey);
    const stripe = getStripe();
    let email: string | undefined;
    try {
      const user = await currentUser();
      email = user?.primaryEmailAddress?.emailAddress ?? undefined;
    } catch {
      email = undefined;
    }

    // H-03: billing failures fail closed — no soft "placeholder" success that looks like checkout.
    if (!stripe || !priceId) {
      return jsonErr(
        503,
        "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO / STRIPE_PRICE_ID_PREMIUM."
      );
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: email,
        client_reference_id: userId,
        metadata: { clerkUserId: userId, plan: body.plan },
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl()}/billing?checkout=success`,
        cancel_url: `${appUrl()}/pricing?checkout=cancel`,
        allow_promotion_codes: true,
      });

      if (!session.url) {
        return jsonErr(500, "No checkout URL returned");
      }

      return jsonOk({
        ok: true as const,
        mode: "stripe" as const,
        url: session.url,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe error";
      return jsonErr(502, msg);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout could not start";
    return jsonErr(500, msg);
  }
}
