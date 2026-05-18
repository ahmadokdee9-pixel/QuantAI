import { normalizeTier, type QuantPlanTier } from "./plans";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

export async function resolveServerSubscriptionTier(
  userId: string | null | undefined,
  user: ClerkLikeUser
): Promise<QuantPlanTier> {
  const clerkTier = subscriptionTierFromClerkUser(user);
  if (!userId || !supabaseAdmin) return clerkTier;
  try {
    const { data, error } = await supabaseAdmin
      .from("user_billing_state")
      .select("subscription_tier, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return clerkTier;
    const status = typeof data.status === "string" ? data.status : "";
    const tier = normalizeTier(typeof data.subscription_tier === "string" ? data.subscription_tier : null);
    if ((status === "active" || status === "trialing") && tier !== "free") return tier;
  } catch {
    return clerkTier;
  }
  return clerkTier;
}
