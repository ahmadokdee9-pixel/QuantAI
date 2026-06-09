/**
 * Phase 42 — Global Commerce Intelligence Core activation.
 * Chains after Phase 41 — intelligence only, no card layout changes.
 */

import { discoverAlternatives } from "@/lib/intelligence/alternativeDiscoveryEngine";
import {
  assignBuyOpportunityTiers,
  buyOpportunityDistributionSummary,
} from "@/lib/intelligence/buyOpportunityCoreEngine";
import { buildCategoryIntelligenceCore } from "@/lib/intelligence/categoryIntelligenceCoreEngine";
import {
  computeCommerceDecisionCore,
  tierToPriorityLabel,
  type CommerceDecisionCore,
} from "@/lib/intelligence/commerceDecisionCoreEngine";
import { computeMarketDepth } from "@/lib/intelligence/marketDepthEngine";
import { proveRealDiscount, discountProofAllowsRealLabel } from "@/lib/intelligence/realDiscountProofEngine";
import { verifyMerchant, merchantTrustAffectsRanking } from "@/lib/intelligence/realMerchantVerificationEngine";
import { buildMerchantTrustV2 } from "@/lib/intelligence/merchantTrustEngineV2";
import { computeValueIntelligenceCore } from "@/lib/intelligence/valueIntelligenceCoreEngine";
import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { ExposureChip } from "@/lib/ui/intelligenceExposureActivation";
import { enrichDecisionBriefWithCommerceIntelligenceCore } from "@/lib/ui/commerceIntelligenceCoreBriefEnrichment";
import {
  buildGlobalCategoryDecisionMap,
  buildGlobalCategoryDisplayCoherenceByLink,
  orderProductsBySearchRank,
  type Phase41TrayContext,
} from "@/lib/ui/phase41GlobalCategoryActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { overlayCoherentWithUniversal, type UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function clipLine(text: string, max = 220): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function buildCoreChips(args: {
  tier: CommerceDecisionCore["tier"];
  valueBand: string;
  discountLine: string;
  existing: ExposureChip[];
}): ExposureChip[] {
  const chips: ExposureChip[] = [];
  if (args.tier === "BEST DEAL") chips.push({ label: "Likely Deal Signal", tone: "emerald", evidence: "positive" });
  else if (args.tier === "STRONG BUY") chips.push({ label: "Strong Buy Signal", tone: "emerald", evidence: "positive" });
  chips.push({ label: args.valueBand, tone: "blue" });
  if (args.discountLine.toLowerCase().includes("discount signal")) chips.push({ label: "Discount Signal", tone: "emerald", evidence: "positive" });
  const seen = new Set(chips.map((c) => c.label));
  for (const chip of args.existing) {
    if (!seen.has(chip.label)) chips.push(chip);
  }
  return chips.slice(0, 4);
}

export type Phase42TrayContext = Phase41TrayContext & {
  commerceIntelligenceCoreApplied: true;
  buyOpportunityDistribution: ReturnType<typeof buyOpportunityDistributionSummary>;
};

export function buildCommerceIntelligenceCoreDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>,
  marketMemory: MarketMemoryState | null = null
): { decisions: Map<string, UniversalProductDecision>; trayContext: Phase42TrayContext } {
  const tray = [...productsByLink.values()].map((row) => row.product);
  const searchQuery = [...productsByLink.values()][0]?.searchQuery?.trim() ?? "";
  const base = buildGlobalCategoryDecisionMap(coherenceByLink, metaByLink, productsByLink, marketMemory);

  const marketDepth = computeMarketDepth({
    tray,
    coverage: base.trayContext.marketCoverage,
    offerGraph: base.decisions.values().next().value?.productIntelligence?.universalOfferGraph,
  });

  const categoryLeaderLink = base.trayContext.intelligenceRankOrder[0] ?? null;
  const compositeByLink = new Map<string, number>();
  const executiveYesByLink = new Map<string, boolean>();
  const coreByLink = new Map<string, CommerceDecisionCore>();
  const rankedLinks = [...base.trayContext.intelligenceRankOrder];

  for (const [link, decision] of base.decisions) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    if (!row?.product || !intel?.globalPriceIntelligence || !intel.realDiscountValidationV3) continue;

    const merchantTrust =
      intel.merchantTrustIntelligence ?? buildMerchantTrustV2(row.product);

    const merchant = verifyMerchant({
      product: row.product,
      baseTrust: merchantTrust.version === 2 ? merchantTrust : undefined,
    });

    const categoryIntel = buildCategoryIntelligenceCore({
      product: row.product,
      searchQuery,
      merchantTrust,
      segment: intel.segment ?? null,
    });

    const discountProof = proveRealDiscount({
      product: row.product,
      globalPrice: intel.globalPriceIntelligence,
      realDiscountV3: intel.realDiscountValidationV3,
      priceHistory: intel.commercePriceHistory,
      equivalentMedian: intel.globalPriceIntelligence.medianMarketPrice,
    });

    const value = computeValueIntelligenceCore({
      categoryIntel,
      merchant,
      discountProof,
      globalPrice: intel.globalPriceIntelligence,
      qualityScore: intel.globalBuyOpportunity?.qualityScore ?? 60,
    });

    const alternatives = discoverAlternatives({
      product: row.product,
      tray,
      searchQuery,
      equivalentMatches: intel.equivalentMatches,
      valueScore: value.valueScore,
      categoryLeaderLink,
    });

    const core = computeCommerceDecisionCore({
      value,
      merchant,
      discountProof,
      marketDepth,
      categoryIntel,
      alternatives,
      link,
    });

    const rankingBoost =
      core.compositeScore +
      merchantTrustAffectsRanking(merchant.merchantTrustScore) +
      (discountProof.verified ? 6 : 0);

    compositeByLink.set(link, rankingBoost);
    executiveYesByLink.set(link, core.executiveWouldBuy);
    coreByLink.set(link, core);
  }

  const sortedLinks = [...rankedLinks].sort(
    (a, b) => (compositeByLink.get(b) ?? 0) - (compositeByLink.get(a) ?? 0)
  );

  const buyOpportunity = assignBuyOpportunityTiers({
    rankedLinks: sortedLinks,
    compositeScoreByLink: compositeByLink,
    executiveYesByLink,
    traySize: tray.length,
  });

  const result = new Map<string, UniversalProductDecision>();

  for (const link of sortedLinks) {
    const decision = base.decisions.get(link);
    const row = productsByLink.get(link);
    const intel = decision?.productIntelligence;
    const core = coreByLink.get(link);
    const opportunity = buyOpportunity.get(link);
    if (!decision || !row?.product || !intel || !core || !opportunity) {
      if (decision) result.set(link, decision);
      continue;
    }

    const merchantTrust =
      intel.merchantTrustIntelligence ?? buildMerchantTrustV2(row.product);
    const merchant = verifyMerchant({
      product: row.product,
      baseTrust: merchantTrust.version === 2 ? merchantTrust : undefined,
    });
    const categoryIntel = buildCategoryIntelligenceCore({
      product: row.product,
      searchQuery,
      merchantTrust,
      segment: intel.segment ?? null,
    });
    const discountProof = proveRealDiscount({
      product: row.product,
      globalPrice: intel.globalPriceIntelligence!,
      realDiscountV3: intel.realDiscountValidationV3!,
      priceHistory: intel.commercePriceHistory,
    });
    const value = computeValueIntelligenceCore({
      categoryIntel,
      merchant,
      discountProof,
      globalPrice: intel.globalPriceIntelligence!,
      qualityScore: intel.globalBuyOpportunity?.qualityScore ?? 60,
    });
    const alternatives = discoverAlternatives({
      product: row.product,
      tray,
      searchQuery,
      equivalentMatches: intel.equivalentMatches,
      valueScore: value.valueScore,
      categoryLeaderLink: sortedLinks[0] ?? null,
    });

    const verdict = opportunity.verdict;
    const tier = opportunity.tier;
    const confidence = core.decisionConfidence;
    const primaryLine = clipLine(opportunity.reasoning);
    const discountLabels = discountProofAllowsRealLabel(discountProof)
      ? ["Discount Signal", discountProof.band]
      : [discountProof.band];

    result.set(link, {
      ...decision,
      verdict,
      confidence,
      confidenceReason: `Decision confidence ${confidence}% from value, trust, discount proof, market depth, and alternatives.`,
      reasonLine: primaryLine,
      primaryReason: primaryLine,
      secondaryReason: clipLine(`${value.displayLine} ${discountProof.displayLine}`),
      summaryLines: [primaryLine, clipLine(merchant.reasoning)],
      displayChips: buildCoreChips({
        tier,
        valueBand: value.band,
        discountLine: discountProof.discountAuthenticityLine,
        existing: decision.displayChips,
      }),
      productIntelligence: {
        ...intel,
        commercePriorityLabel: tierToPriorityLabel(tier) as typeof intel.commercePriorityLabel,
        realDiscountProof: discountProof,
        realMerchantVerification: merchant,
        categoryIntelligenceCore: categoryIntel,
        alternativeDiscovery: alternatives,
        marketDepth,
        valueIntelligenceCore: value,
        commerceDecisionCore: core,
        buyOpportunityCore: opportunity,
        buyerReasoning: {
          primaryLine: primaryLine,
          buyerFit: categoryIntel.categoryReasoning,
          valueAnalysis: value.displayLine,
          marketPosition: discountProof.displayLine,
          trustAnalysis: merchant.reasoning,
          tradeoffs: alternatives.reasoning,
          competitorComparison: alternatives.promotionTarget
            ? `Consider ${alternatives.promotionTarget} as a stronger alternative.`
            : alternatives.reasoning,
          improvementPath: core.executiveWouldBuy
            ? "Executive check passed — confident purchase path."
            : "Compare alternatives before spending.",
        },
        alignmentFlags: [
          ...(intel.alignmentFlags ?? []),
          "phase42_commerce_intelligence_core",
          `phase42_tier_${tier.replace(/\s+/g, "_").toLowerCase()}`,
          `phase42_value_${value.band.replace(/\s+/g, "_").toLowerCase()}`,
        ].filter((flag, index, list) => list.indexOf(flag) === index),
      },
    });
  }

  for (const [link, decision] of base.decisions) {
    if (!result.has(link)) result.set(link, decision);
  }

  const distribution = buyOpportunityDistributionSummary(buyOpportunity);
  const leader = result.get(sortedLinks[0] ?? "");
  if (leader?.productIntelligence) {
    leader.productIntelligence.commerceIntelligenceCoreSummary = {
      distribution,
      marketDepthHeadline: marketDepth.headline,
      executiveRule: "QuantAI spends its own money only when value, trust, discount proof, and alternatives align.",
    };
  }

  return {
    decisions: result,
    trayContext: {
      ...base.trayContext,
      commerceIntelligenceCoreApplied: true,
      buyOpportunityDistribution: distribution,
      intelligenceRankOrder: sortedLinks,
    },
  };
}

export function buildCommerceIntelligenceCoreDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>,
  trayContext: Phase42TrayContext
): Map<string, CoherentProductDecision> {
  const base = buildGlobalCategoryDisplayCoherenceByLink(coherenceByLink, universalByLink, trayContext);
  const enriched = new Map<string, CoherentProductDecision>();

  for (const [link, coherent] of base) {
    const universal = universalByLink.get(link);
    const overlaid = universal ? overlayCoherentWithUniversal(coherent, universal) : coherent;
    enriched.set(link, {
      ...overlaid,
      decisionBrief: enrichDecisionBriefWithCommerceIntelligenceCore(
        overlaid.decisionBrief,
        trayContext.marketCoverage,
        trayContext.marketSummaryV2,
        trayContext.universalQuery.understandingLine,
        "Commerce intelligence core — combined value, trust, market position, and verified discount proof."
      ),
    });
  }

  return enriched;
}

export { orderProductsBySearchRank };

/** Compatibility — Phase 41/40 export names route to Phase 42 pipeline. */
export {
  buildCommerceIntelligenceCoreDecisionMap as buildGlobalCategoryDecisionMap,
  buildCommerceIntelligenceCoreDecisionMap as buildCommerceRankingDecisionMap,
  buildCommerceIntelligenceCoreDisplayCoherenceByLink as buildGlobalCategoryDisplayCoherenceByLink,
  buildCommerceIntelligenceCoreDisplayCoherenceByLink as buildCommerceRankingDisplayCoherenceByLink,
};
