import { normalizeTier, type QuantPlanTier } from "./plans";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ClerkLikeUser = { publicMetadata?: Record<string, unknown> } | null;

/** Stripe statuses that may grant paid entitlements. Everything else fails closed to free. */
export const PAID_BILLING_STATUSES = new Set(["active", "trialing"]);

export type BillingStateRow = {
  subscription_tier?: unknown;
  status?: unknown;
};

/**
 * H-03: Supabase `user_billing_state` is the entitlement source of truth.
 * Canceled / unpaid / past_due / expired / invalid → free (never elevate from stale tier).
 */
export function tierFromBillingState(row: BillingStateRow | null | undefined): QuantPlanTier {
  if (!row) return "free";
  const status = typeof row.status === "string" ? row.status.toLowerCase().trim() : "";
  const tier = normalizeTier(
    typeof row.subscription_tier === "string" ? row.subscription_tier : null
  );
  if (PAID_BILLING_STATUSES.has(status) && tier !== "free") {
    return tier;
  }
  return "free";
}

/**
 * Read subscription tier hint from Clerk public metadata.
 * H-03: never sufficient alone for Premium — kept for diagnostics / legacy display only.
 */
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

/**
 * Server entitlement resolution — fail closed.
 *
 * SoT: `user_billing_state` when Supabase admin is available.
 * - active/trialing + paid tier → that tier
 * - canceled / unpaid / past_due / expired / unknown → free
 * - missing row / query error / no DB → free (unsynced ≠ Premium)
 * Clerk metadata alone never grants paid access.
 */
export async function resolveServerSubscriptionTier(
  userId: string | null | undefined,
  user: ClerkLikeUser
): Promise<QuantPlanTier> {
  void user; // Clerk identity is for auth; not entitlement SoT (H-03).
  if (!userId) return "free";
  if (!supabaseAdmin) return "free";

  try {
    const { data, error } = await supabaseAdmin
      .from("user_billing_state")
      .select("subscription_tier, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return "free";
    return tierFromBillingState(data);
  } catch {
    return "free";
  }
}
