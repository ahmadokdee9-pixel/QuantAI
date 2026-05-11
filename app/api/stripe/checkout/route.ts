import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, stripePriceId, type QuantStripePlanKey } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/client";

const BodySchema = z.object({
  plan: z.enum(["pro", "premium"]),
});

/**
 * Creates a Stripe Checkout Session when STRIPE_SECRET_KEY + price IDs are set.
 * Otherwise returns a safe fallback URL for the billing page.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const json = (await req.json()) as unknown;
    body = BodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const priceId = stripePriceId(body.plan as QuantStripePlanKey);
  const stripe = getStripe();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? undefined;

  if (!stripe || !priceId) {
    return NextResponse.json({
      ok: false as const,
      mode: "placeholder" as const,
      redirectUrl: `${appUrl()}/billing?plan=${body.plan}`,
      message:
        "Stripe is not fully configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO / STRIPE_PRICE_ID_PREMIUM.",
    });
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
      return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true as const,
      mode: "stripe" as const,
      url: session.url,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
