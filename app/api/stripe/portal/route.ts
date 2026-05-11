import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/client";

/**
 * Customer Portal — requires STRIPE_SECRET_KEY and STRIPE_CUSTOMER_ID in env
 * OR you map Clerk user → Stripe customer in your DB. Placeholder returns billing page.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const customerId = process.env.STRIPE_CUSTOMER_ID_PLACEHOLDER?.trim();

  if (!stripe || !customerId) {
    return NextResponse.json({
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
    return NextResponse.json({ ok: true as const, mode: "stripe" as const, url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
