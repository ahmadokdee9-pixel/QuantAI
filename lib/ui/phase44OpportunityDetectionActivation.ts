/**
 * Phase 44 — Opportunity Detection activation.
 * Chains after Phase 43 — intelligence only, no card layout changes.
 */

import {
  applyOpportunityPromotion,
  buildProductOpportunityIntelligence,
  computeCategoryOpportunityPercentiles,
  computeOpportunityScore,
  enforceOpportunityAntiSpam,
  enforceOpportunityMerchantGates,
  opportunityDistributionSummary,
  type OpportunityDistribution,
} from "@/lib/intelligence/opportunityDetectionEngine";
import { tierToPriorityLabel } from "@/lib/intelligence/commerceDecisionCoreEngine";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { enrichDecisionBriefWithOpportunityDetection } from "@/lib/ui/opportunityDetectionBriefEnrichment";
import {
  buildDecisionCalibrationDecisionMap,
  buildDecisionCalibrationDisplayCoherenceByLink,
  orderProductsBySearchRank,
  type Phase43TrayContext,
} from "@/lib/ui/phase43DecisionCalibrationActivation";
import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { overlayCoherentWithUniversal, type UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function clipLine(text: string, max = 220): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function resolveMerchantScore(
  intel: NonNullable<UniversalProductDecision["productIntelligence"]>,
  merchant: NonNullable<typeof intel.realMerchantVerification> | undefined,
  core: NonNullable<typeof intel.commerceDecisionCore>
): number {
  const candidates = [
    merchant?.merchantTrustScore,
    core.merchantTrustScore,
    intel.merchantTrustIntelligence?.trustScore,
  ].filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return candidates.length ? Math.max(...candidates) : 0;
}

function opportunityReasonLine(
  opportunity: ReturnType<typeof buildProductOpportunityIntelligence>,
  promotionReason: string | null
): string {
  if (promotionReason === "best_deal_opportunity") {
    return "Rare market opportunity detected — exceptional value, verified discount, and elite merchant alignment.";
  }
  if (promotionReason === "strong_buy_opportunity") {
    return "Strong buy opportunity detected — high opportunity intensity with verified discount and trusted merchant.";
  }
  if (promotionReason === "compare_to_buy_ready_opportunity") {
    return "Opportunity promotion — verified discount and strong value lifted this from compare to buy ready.";
  }
  if (opportunity.label === "RARE OPPORTUNITY") {
    return "Rare opportunity intensity — market value, discount proof, and merchant trust align.";
  }
  if (opportunity.label === "STRONG VALUE") {
    return "Strong value opportunity — above-average market position with credible purchase signals.";
  }
  return "Opportunity assessed — balanced market signals for this product.";
}

export type Phase44TrayContext = Phase43TrayContext & {
  opportunityDetectionApplied: true;
  opportunityDistribution: OpportunityDistribution;
};

export function buildOpportunityDetectionDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>,
  marketMemory: MarketMemoryState | null = null
): { decisions: Map<string, UniversalProductDecision>; trayContext: Phase44TrayContext } {
  const base = buildDecisionCalibrationDecisionMap(
    coherenceByLink,
    metaByLink,
    productsByLink,
    marketMemory
  );

  const rankedLinks = [...base.trayContext.intelligenceRankOrder];
  const coveragePct = base.trayContext.marketCoverage?.coveragePct ?? 100;

  const opportunityScoreByLink = new Map<string, number>();
  const detectionInputByLink = new Map<
    string,
    import("@/lib/intelligence/opportunityDetectionEngine").OpportunityDetectionInput
  >();

  for (const link of rankedLinks) {
    const decision = base.decisions.get(link);
    const intel = decision?.productIntelligence;
    const core = intel?.commerceDecisionCore;
    const merchant = intel?.realMerchantVerification;
    const discount = intel?.realDiscountProof;
    const tier = intel?.buyOpportunityCore?.tier ?? "COMPARE";

    if (!decision || !intel || !core) continue;

    const merchantTrust = resolveMerchantScore(intel, merchant, core);
    const rawMerchantTrust = merchant?.merchantTrustScore ?? core.merchantTrustScore;
    const fakeDiscount = discount?.band.includes("Fake") ?? false;
    const discountVerified = discount?.verified === true && !fakeDiscount;
    const valueBelowMedianPct = Math.max(
      0,
      discount?.marketMedianDifferencePct ?? intel.globalPriceIntelligence?.priceAdvantagePct ?? 0
    );

    const categoryIntelligenceScore = core.categoryIntelligenceScore ?? 60;

    const score = computeOpportunityScore({
      confidence: decision.confidence,
      merchantTrust,
      discountVerified,
      fakeDiscount,
      discountAuthenticityScore: discount?.discountAuthenticityScore ?? core.discountAuthenticityScore ?? 0,
      valueBelowMedianPct,
      valueScore: intel.valueIntelligenceCore?.valueScore ?? core.valueScore,
      categoryIntelligenceScore,
      coveragePct,
      categoryRankPercentile: 50,
    });

    opportunityScoreByLink.set(link, score);
    detectionInputByLink.set(link, {
      link,
      currentTier: tier,
      verdict: decision.verdict,
      confidence: decision.confidence,
      merchantTrust,
      rawMerchantTrust,
      discountVerified,
      fakeDiscount,
      discountAuthenticityScore: discount?.discountAuthenticityScore ?? core.discountAuthenticityScore ?? 0,
      valueBelowMedianPct,
      valueScore: intel.valueIntelligenceCore?.valueScore ?? core.valueScore,
      categoryIntelligenceScore,
      coveragePct,
      categoryRankPercentile: 50,
    });
  }

  const categoryPercentiles = computeCategoryOpportunityPercentiles(opportunityScoreByLink);

  const promotedTierByLink = new Map<string, import("@/lib/intelligence/commerceDecisionCoreEngine").CommerceDecisionTier>();
  const opportunityByLink = new Map<string, ReturnType<typeof buildProductOpportunityIntelligence>>();
  const promotionReasonByLink = new Map<string, string | null>();

  for (const link of rankedLinks) {
    const input = detectionInputByLink.get(link);
    const score = opportunityScoreByLink.get(link);
    if (!input || score === undefined) continue;

    const enrichedInput = {
      ...input,
      categoryRankPercentile: categoryPercentiles.get(link) ?? 50,
    };

    const promotion = applyOpportunityPromotion(enrichedInput, score);
    const opportunity = buildProductOpportunityIntelligence({
      input: enrichedInput,
      opportunityScore: score,
      promotion,
    });

    promotedTierByLink.set(link, promotion.tier);
    opportunityByLink.set(link, opportunity);
    promotionReasonByLink.set(link, promotion.promotionReason);
  }

  for (const [link, decision] of base.decisions) {
    if (!promotedTierByLink.has(link)) {
      promotedTierByLink.set(link, decision.productIntelligence?.buyOpportunityCore?.tier ?? "COMPARE");
    }
  }

  const cappedTiers = enforceOpportunityAntiSpam({
    rankedLinks,
    tierByLink: promotedTierByLink,
  });

  const gatedTiers = enforceOpportunityMerchantGates({
    tierByLink: cappedTiers,
    inputsByLink: detectionInputByLink,
  });

  const result = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of base.decisions) {
    const intel = decision.productIntelligence;
    const opportunity = opportunityByLink.get(link);
    const tier = gatedTiers.get(link) ?? intel?.buyOpportunityCore?.tier ?? "COMPARE";
    const promotionReason = promotionReasonByLink.get(link) ?? null;

    if (!intel?.buyOpportunityCore || !intel.commerceDecisionCore || !opportunity) {
      result.set(link, decision);
      continue;
    }

    const verdict = tier === "WAIT" ? "WAIT" : tier === "COMPARE" ? "COMPARE" : "BUY READY";
    let confidence = decision.confidence;
    if (tier === "STRONG BUY" && confidence < 85) confidence = 85;
    if (tier === "BEST DEAL" && confidence < 90) confidence = 90;
    if (tier === "BUY READY" && opportunity.promotedByOpportunity && confidence < 75) confidence = 75;

    const primaryLine = clipLine(opportunityReasonLine(opportunity, promotionReason));

    result.set(link, {
      ...decision,
      verdict,
      confidence,
      reasonLine: primaryLine,
      primaryReason: primaryLine,
      summaryLines: [
        primaryLine,
        (decision.summaryLines ?? [""])[1] ?? (decision.summaryLines ?? [""])[0] ?? "",
      ],
      productIntelligence: {
        ...intel,
        opportunity,
        commercePriorityLabel: tierToPriorityLabel(tier) as typeof intel.commercePriorityLabel,
        commerceDecisionCore: {
          ...intel.commerceDecisionCore,
          tier,
          verdict,
          decisionConfidence: confidence,
        },
        buyOpportunityCore: {
          ...intel.buyOpportunityCore,
          tier,
          verdict,
          reasoning: primaryLine,
        },
        alignmentFlags: [
          ...(intel.alignmentFlags ?? []),
          "phase44_opportunity_detection",
          `phase44_opportunity_${opportunity.label.replace(/\s+/g, "_").toLowerCase()}`,
          ...(opportunity.promotedByOpportunity ? ["phase44_promoted_by_opportunity"] : []),
        ].filter((flag, index, list) => list.indexOf(flag) === index),
      },
    });
  }

  const distribution = opportunityDistributionSummary(gatedTiers);

  return {
    decisions: result,
    trayContext: {
      ...base.trayContext,
      opportunityDetectionApplied: true,
      opportunityDistribution: distribution,
      buyOpportunityDistribution: distribution,
      decisionCalibrationDistribution: distribution,
    },
  };
}

export function buildOpportunityDetectionDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>,
  trayContext: Phase44TrayContext
): Map<string, CoherentProductDecision> {
  const base = buildDecisionCalibrationDisplayCoherenceByLink(
    coherenceByLink,
    universalByLink,
    trayContext
  );
  const enriched = new Map<string, CoherentProductDecision>();

  for (const [link, coherent] of base) {
    const universal = universalByLink.get(link);
    const overlaid = universal ? overlayCoherentWithUniversal(coherent, universal) : coherent;
    enriched.set(link, {
      ...overlaid,
      decisionBrief: enrichDecisionBriefWithOpportunityDetection(
        overlaid.decisionBrief,
        trayContext.marketCoverage,
        trayContext.marketSummaryV2,
        trayContext.universalQuery.understandingLine,
        universal?.productIntelligence?.opportunity
      ),
    });
  }

  return enriched;
}

export { orderProductsBySearchRank };

/** Compatibility — Phase 43/42/41/40 export names route to Phase 44 pipeline. */
export {
  buildOpportunityDetectionDecisionMap as buildDecisionCalibrationDecisionMap,
  buildOpportunityDetectionDecisionMap as buildCommerceIntelligenceCoreDecisionMap,
  buildOpportunityDetectionDecisionMap as buildGlobalCategoryDecisionMap,
  buildOpportunityDetectionDecisionMap as buildCommerceRankingDecisionMap,
  buildOpportunityDetectionDisplayCoherenceByLink as buildDecisionCalibrationDisplayCoherenceByLink,
  buildOpportunityDetectionDisplayCoherenceByLink as buildCommerceIntelligenceCoreDisplayCoherenceByLink,
  buildOpportunityDetectionDisplayCoherenceByLink as buildGlobalCategoryDisplayCoherenceByLink,
  buildOpportunityDetectionDisplayCoherenceByLink as buildCommerceRankingDisplayCoherenceByLink,
};
