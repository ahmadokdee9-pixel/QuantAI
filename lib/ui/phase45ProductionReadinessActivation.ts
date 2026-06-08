/**
 * Phase 45 — Production Readiness & Category Intelligence activation.
 * Final intelligence phase — chains after Phase 44, no UI changes.
 */

import {
  balanceBuySignals,
  buySignalDistributionSummary,
  type BuySignalDistribution,
} from "@/lib/intelligence/buySignalBalancingEngine";
import { buildCategoryValueIntelligence } from "@/lib/intelligence/categoryValueEngine";
import { computeDiscountConfidence } from "@/lib/intelligence/discountConfidenceEngine";
import {
  buildDecisionReasoningIntelligence,
  type DecisionReasoningIntelligence,
} from "@/lib/intelligence/decisionReasoningEngine";
import { computeMerchantReliability } from "@/lib/intelligence/merchantReliabilityEngine";
import {
  computeTrueValueIntelligence,
  marketOpportunityFromIntel,
  type TrueValueIntelligence,
} from "@/lib/intelligence/trueValueEngine";
import {
  sanitizeUniversalDecision,
  validateTraySafety,
} from "@/lib/intelligence/productionSafetyEngine";
import { tierToPriorityLabel } from "@/lib/intelligence/commerceDecisionCoreEngine";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { enrichDecisionBriefWithProductionReadiness } from "@/lib/ui/productionReadinessBriefEnrichment";
import {
  buildOpportunityDetectionDecisionMap,
  buildOpportunityDetectionDisplayCoherenceByLink,
  orderProductsBySearchRank,
  type Phase44TrayContext,
} from "@/lib/ui/phase44OpportunityDetectionActivation";
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

export type Phase45TrayContext = Phase44TrayContext & {
  productionReadinessApplied: true;
  productionDistribution: BuySignalDistribution;
  productionSafetyValidated: boolean;
};

export function buildProductionReadinessDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>,
  marketMemory: MarketMemoryState | null = null
): { decisions: Map<string, UniversalProductDecision>; trayContext: Phase45TrayContext } {
  const base = buildOpportunityDetectionDecisionMap(
    coherenceByLink,
    metaByLink,
    productsByLink,
    marketMemory
  );

  const rankedLinks = [...base.trayContext.intelligenceRankOrder];
  const categoryValueCache = new Map<string, ReturnType<typeof buildCategoryValueIntelligence>>();

  const tierByLink = new Map<string, import("@/lib/intelligence/commerceDecisionCoreEngine").CommerceDecisionTier>();
  const balancingInputs = new Map<
    string,
    import("@/lib/intelligence/buySignalBalancingEngine").BuySignalBalancingInput
  >();
  const enrichmentByLink = new Map<
    string,
    {
      categoryValue: ReturnType<typeof buildCategoryValueIntelligence>;
      trueValue: TrueValueIntelligence;
      discountConfidence: ReturnType<typeof computeDiscountConfidence>;
      merchantReliability: ReturnType<typeof computeMerchantReliability>;
      decisionReasoning: DecisionReasoningIntelligence;
    }
  >();

  for (const [link, index] of rankedLinks.map((l, i) => [l, i] as const)) {
    const decision = base.decisions.get(link);
    const row = productsByLink.get(link);
    const intel = decision?.productIntelligence;
    const core = intel?.commerceDecisionCore;
    if (!decision || !row?.product || !intel || !core) {
      tierByLink.set(link, intel?.buyOpportunityCore?.tier ?? "COMPARE");
      continue;
    }

    const tier = intel.buyOpportunityCore?.tier ?? "COMPARE";
    tierByLink.set(link, tier);

    let categoryValue = categoryValueCache.get(link);
    if (!categoryValue) {
      categoryValue = buildCategoryValueIntelligence({
        product: row.product,
        searchQuery: row.searchQuery,
        segment: intel.segment ?? null,
      });
      categoryValueCache.set(link, categoryValue);
    }

    const merchant = intel.realMerchantVerification;
    const merchantTrust = resolveMerchantScore(intel, merchant, core);
    const merchantReliability = computeMerchantReliability({
      product: row.product,
      merchant,
      merchantTrustScore: merchantTrust,
    });

    const discountProof = intel.realDiscountProof;
    const discountVerified = discountProof?.verified === true && discountProof.band !== "Fake Discount";

    const discountConfidence = computeDiscountConfidence({
      product: row.product,
      discountProof,
      priceHistory: intel.commercePriceHistory,
      categoryMedianPrice: intel.globalPriceIntelligence?.medianMarketPrice,
      merchantTrustScore: merchantReliability.merchantReliabilityScore,
    });

    const priceAdvantagePct = Math.max(
      0,
      discountProof?.marketMedianDifferencePct ?? intel.globalPriceIntelligence?.priceAdvantagePct ?? 0
    );

    const trueValue = computeTrueValueIntelligence({
      marketOpportunityScore: marketOpportunityFromIntel(intel.opportunity, priceAdvantagePct),
      qualityScore: categoryValue.qualityScore,
      merchantTrust: merchantReliability.merchantReliabilityScore,
      discountVerified,
      discountConfidence: discountConfidence.discountConfidence,
      confidence: decision.confidence,
      categoryValue,
    });

    const decisionReasoning = buildDecisionReasoningIntelligence({
      categoryKind: categoryValue.kind,
      tier,
      trueValueScore: trueValue.trueValueScore,
      qualityScore: categoryValue.qualityScore,
      discountLabel: discountConfidence.label,
      merchantLabel: merchantReliability.label,
      discountVerified,
      priceAdvantagePct,
    });

    enrichmentByLink.set(link, {
      categoryValue,
      trueValue,
      discountConfidence,
      merchantReliability,
      decisionReasoning,
    });

    balancingInputs.set(link, {
      link,
      rankIndex: index,
      currentTier: tier,
      trueValueScore: trueValue.trueValueScore,
      qualityScore: categoryValue.qualityScore,
      merchantReliabilityScore: merchantReliability.merchantReliabilityScore,
      discountConfidence: discountConfidence.discountConfidence,
      discountVerified,
      confidence: decision.confidence,
    });
  }

  for (const [link, decision] of base.decisions) {
    if (!tierByLink.has(link)) {
      tierByLink.set(link, decision.productIntelligence?.buyOpportunityCore?.tier ?? "COMPARE");
    }
  }

  const balancedTiers = balanceBuySignals({
    rankedLinks,
    tierByLink,
    inputsByLink: balancingInputs,
  });

  const result = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of base.decisions) {
    const intel = decision.productIntelligence;
    const enrichment = enrichmentByLink.get(link);
    const tier = balancedTiers.get(link) ?? intel?.buyOpportunityCore?.tier ?? "COMPARE";

    if (!intel?.buyOpportunityCore || !intel.commerceDecisionCore || !enrichment) {
      result.set(link, sanitizeUniversalDecision(decision));
      continue;
    }

    const reasoning = buildDecisionReasoningIntelligence({
      categoryKind: enrichment.categoryValue.kind,
      tier,
      trueValueScore: enrichment.trueValue.trueValueScore,
      qualityScore: enrichment.categoryValue.qualityScore,
      discountLabel: enrichment.discountConfidence.label,
      merchantLabel: enrichment.merchantReliability.label,
      discountVerified:
        intel.realDiscountProof?.verified === true && intel.realDiscountProof.band !== "Fake Discount",
      priceAdvantagePct: Math.max(
        0,
        intel.realDiscountProof?.marketMedianDifferencePct ?? intel.globalPriceIntelligence?.priceAdvantagePct ?? 0
      ),
    });

    const verdict = tier === "WAIT" ? "WAIT" : tier === "COMPARE" ? "COMPARE" : "BUY READY";
    let confidence = decision.confidence;
    if (tier === "STRONG BUY" && confidence < 85) confidence = 85;
    if (tier === "BEST DEAL" && confidence < 90) confidence = 90;
    if (tier === "BUY READY" && confidence < 70) confidence = 70;

    const primaryLine = clipLine(reasoning.primaryLine);

    const updated: UniversalProductDecision = {
      ...decision,
      verdict,
      confidence,
      reasonLine: primaryLine,
      primaryReason: primaryLine,
      confidenceReason: clipLine(
        `Production confidence ${confidence}% — true value ${enrichment.trueValue.trueValueScore}, quality ${enrichment.categoryValue.qualityScore}, discount confidence ${enrichment.discountConfidence.discountConfidence}.`
      ),
      summaryLines: [primaryLine, enrichment.trueValue.reasoning],
      productIntelligence: {
        ...intel,
        categoryValue: enrichment.categoryValue,
        trueValue: enrichment.trueValue,
        discountConfidence: enrichment.discountConfidence,
        merchantReliability: enrichment.merchantReliability,
        decisionReasoning: reasoning,
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
          "phase45_production_readiness",
          `phase45_category_${enrichment.categoryValue.kind}`,
          `phase45_true_value_${enrichment.trueValue.band.replace(/\s+/g, "_").toLowerCase()}`,
        ].filter((flag, index, list) => list.indexOf(flag) === index),
      },
    };

    result.set(link, sanitizeUniversalDecision(updated));
  }

  const safety = validateTraySafety(result);
  const distribution = buySignalDistributionSummary(balancedTiers);

  return {
    decisions: result,
    trayContext: {
      ...base.trayContext,
      productionReadinessApplied: true,
      productionDistribution: distribution,
      productionSafetyValidated: safety.safe,
      opportunityDistribution: distribution,
      buyOpportunityDistribution: distribution,
      decisionCalibrationDistribution: distribution,
    },
  };
}

export function buildProductionReadinessDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>,
  trayContext: Phase45TrayContext
): Map<string, CoherentProductDecision> {
  const base = buildOpportunityDetectionDisplayCoherenceByLink(
    coherenceByLink,
    universalByLink,
    trayContext
  );
  const enriched = new Map<string, CoherentProductDecision>();

  for (const [link, coherent] of base) {
    const universal = universalByLink.get(link);
    const overlaid = universal ? overlayCoherentWithUniversal(coherent, universal) : coherent;
    const intel = universal?.productIntelligence;

    enriched.set(link, {
      ...overlaid,
      decisionBrief: enrichDecisionBriefWithProductionReadiness(
        overlaid.decisionBrief,
        trayContext.marketCoverage,
        trayContext.marketSummaryV2,
        trayContext.universalQuery.understandingLine,
        {
          trueValueScore: intel?.trueValue?.trueValueScore,
          qualityScore: intel?.categoryValue?.qualityScore,
          discountConfidence: intel?.discountConfidence?.discountConfidence,
          merchantReliabilityScore: intel?.merchantReliability?.merchantReliabilityScore,
          reasoningFocus: intel?.decisionReasoning?.reasoningFocus,
          opportunity: intel?.opportunity,
        }
      ),
    });
  }

  return enriched;
}

export { orderProductsBySearchRank };

/** Compatibility — all prior phase export names route to Phase 45 pipeline. */
export {
  buildProductionReadinessDecisionMap as buildOpportunityDetectionDecisionMap,
  buildProductionReadinessDecisionMap as buildDecisionCalibrationDecisionMap,
  buildProductionReadinessDecisionMap as buildCommerceIntelligenceCoreDecisionMap,
  buildProductionReadinessDecisionMap as buildGlobalCategoryDecisionMap,
  buildProductionReadinessDecisionMap as buildCommerceRankingDecisionMap,
  buildProductionReadinessDisplayCoherenceByLink as buildOpportunityDetectionDisplayCoherenceByLink,
  buildProductionReadinessDisplayCoherenceByLink as buildDecisionCalibrationDisplayCoherenceByLink,
  buildProductionReadinessDisplayCoherenceByLink as buildCommerceIntelligenceCoreDisplayCoherenceByLink,
  buildProductionReadinessDisplayCoherenceByLink as buildGlobalCategoryDisplayCoherenceByLink,
  buildProductionReadinessDisplayCoherenceByLink as buildCommerceRankingDisplayCoherenceByLink,
};
