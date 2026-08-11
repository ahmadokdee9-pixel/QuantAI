import { auth, currentUser } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { countSearchesTodayUtc } from "@/lib/intelligence/persistence";
import { stripeSecretKey } from "@/lib/stripe/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { entitlementsForTier } from "@/lib/subscription/entitlements";
import { planDefinition, QUANT_PLANS } from "@/lib/subscription/plans";
import { resolveServerSubscriptionTier } from "@/lib/subscription/resolveTier";

/** Subscription + entitlements — tier from `user_billing_state` SoT (fail-closed). */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return jsonErr(401, "Unauthorized");
    }

    const { userId } = await auth();
    // H-03: single SoT via resolveServerSubscriptionTier (billing state, fail-closed).
    const tier = await resolveServerSubscriptionTier(userId, user);
    let billingState: Record<string, unknown> | null = null;
    if (userId && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("user_billing_state")
        .select("subscription_tier, status, stripe_customer_id, current_period_end, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) billingState = data;
    }
    const plan = planDefinition(tier);
    const entitlements = entitlementsForTier(tier);

    let searchesToday: number | null = null;
    if (userId) {
      searchesToday = await countSearchesTodayUtc(userId);
    }

    return jsonOk({
      tier,
      plan: {
        id: plan.id,
        name: plan.name,
        monthlyPriceEur: plan.monthlyPriceEur,
        tagline: plan.tagline,
      },
      entitlements,
      usage: {
        searchesToday,
        searchesLimit: plan.searchesPerDay,
      },
      stripe: {
        connected: Boolean(stripeSecretKey()),
      },
      plans: Object.values(QUANT_PLANS).map((p) => ({
        id: p.id,
        name: p.name,
        monthlyPriceEur: p.monthlyPriceEur,
        tagline: p.tagline,
        limits: {
          searchesPerDay: p.searchesPerDay,
          aiIntelligencePerDay: p.aiIntelligencePerDay,
          watchlistMax: p.watchlistMax,
          savedProductsMax: p.savedProductsMax,
          compareMax: p.compareMax,
          premiumAlerts: p.premiumAlerts,
          globalDealIntelligence: p.globalDealIntelligence,
          advancedAdvisor: p.advancedAdvisor,
        },
      })),
      billing: {
        status: stripeSecretKey() ? "stripe_configured" : "not_connected",
        message: stripeSecretKey()
          ? "Stripe is configured and billing state syncs through the webhook when Supabase is available."
          : "Set STRIPE_SECRET_KEY and webhook to activate live billing sync.",
        manageUrl: null as string | null,
        state: billingState,
      },
    });
  } catch {
    return jsonErr(500, "Could not load subscription.");
  }
}
