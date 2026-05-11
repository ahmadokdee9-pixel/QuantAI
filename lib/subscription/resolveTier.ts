import { normalizeTier, type QuantPlanTier } from "./plans";

type ClerkLikeUser = { publicMetadata?: Record<string, unknown> } | null;

/** Read subscription tier from Clerk public metadata (Stripe webhooks can set this later). */
export function subscriptionTierFromClerkUser(user: ClerkLikeUser): QuantPlanTier {
  if (!user) return "free";
  const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const raw =
    (typeof meta.subscriptionTier === "string" && meta.subscriptionTier) ||
    (typeof meta.subscription_tier === "string" && meta.subscription_tier) ||
    (typeof meta.plan === "string" && meta.plan) ||
    (typeof meta.stripePlan === "string" && meta.stripePlan) ||
    null;
  return normalizeTier(raw);
}
