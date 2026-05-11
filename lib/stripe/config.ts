/**
 * Stripe activation: set STRIPE_SECRET_KEY and price IDs for Checkout + Customer Portal.
 * Clerk remains source of truth for tier until webhooks sync `publicMetadata.subscriptionTier`.
 */

export type QuantStripePlanKey = "pro" | "premium";

export function stripeSecretKey(): string | null {
  const k = process.env.STRIPE_SECRET_KEY?.trim();
  return k || null;
}

export function stripePriceId(plan: QuantStripePlanKey): string | null {
  const id =
    plan === "pro"
      ? process.env.STRIPE_PRICE_ID_PRO?.trim()
      : process.env.STRIPE_PRICE_ID_PREMIUM?.trim();
  return id || null;
}

export function stripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_URL?.replace(/^(?!https)/, "https://").replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
