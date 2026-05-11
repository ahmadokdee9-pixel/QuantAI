import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { entitlementsForTier } from "@/lib/subscription/entitlements";
import { planDefinition, QUANT_PLANS } from "@/lib/subscription/plans";
import { subscriptionTierFromClerkUser } from "@/lib/subscription/resolveTier";

/** Stripe-ready: tier from Clerk `publicMetadata`; billing portal URL wired later. */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = subscriptionTierFromClerkUser(user);
  const plan = planDefinition(tier);
  const entitlements = entitlementsForTier(tier);

  return NextResponse.json({
    tier,
    plan: {
      id: plan.id,
      name: plan.name,
      monthlyPriceEur: plan.monthlyPriceEur,
      tagline: plan.tagline,
    },
    entitlements,
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
      status: "not_connected",
      message:
        "Stripe Customer Portal is not connected yet. Set STRIPE_SECRET_KEY and webhook to sync `publicMetadata.subscriptionTier`.",
      manageUrl: null as string | null,
    },
  });
}
