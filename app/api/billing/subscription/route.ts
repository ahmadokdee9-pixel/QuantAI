import { auth, currentUser } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { countSearchesTodayUtc } from "@/lib/intelligence/persistence";
import { stripeSecretKey } from "@/lib/stripe/config";
import { entitlementsForTier } from "@/lib/subscription/entitlements";
import { planDefinition, QUANT_PLANS } from "@/lib/subscription/plans";
import { subscriptionTierFromClerkUser } from "@/lib/subscription/resolveTier";

/** Stripe-ready: tier from Clerk `publicMetadata`; billing portal URL wired later. */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return jsonErr(401, "Unauthorized");
    }

    const { userId } = await auth();
    const tier = subscriptionTierFromClerkUser(user);
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
          ? "Stripe secret present—complete Checkout price IDs and webhooks to sync Clerk metadata."
          : "Set STRIPE_SECRET_KEY and webhook to sync `publicMetadata.subscriptionTier`.",
        manageUrl: null as string | null,
      },
    });
  } catch {
    return jsonErr(500, "Could not load subscription.");
  }
}
