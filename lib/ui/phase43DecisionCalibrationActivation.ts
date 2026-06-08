/**
 * Phase 43 — Decision Calibration activation.
 * Chains after Phase 42 — intelligence only, no card layout changes.
 */

import {
  calibrateProductDecision,
  rebalanceCalibrationPromotions,
  decisionCalibrationDistributionSummary,
  enforceCalibrationDistributionCaps,
  type DecisionCalibrationDistribution,
  type DecisionCalibrationInput,
} from "@/lib/intelligence/decisionCalibrationEngine";
import { tierToPriorityLabel } from "@/lib/intelligence/commerceDecisionCoreEngine";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { enrichDecisionBriefWithDecisionCalibration } from "@/lib/ui/decisionCalibrationBriefEnrichment";
import {
  buildCommerceIntelligenceCoreDecisionMap,
  buildCommerceIntelligenceCoreDisplayCoherenceByLink,
  orderProductsBySearchRank,
  type Phase42TrayContext,
} from "@/lib/ui/phase42CommerceIntelligenceCoreActivation";
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

export type Phase43TrayContext = Phase42TrayContext & {
  decisionCalibrationApplied: true;
  decisionCalibrationDistribution: DecisionCalibrationDistribution;
};

function resolveMerchantScore(
  intel: NonNullable<UniversalProductDecision["productIntelligence"]>,
  merchant: NonNullable<typeof intel.realMerchantVerification> | undefined,
  core: NonNullable<typeof intel.commerceDecisionCore>
): number {
  const candidates = [
    merchant?.merchantTrustScore,
    core.merchantTrustScore,
    intel.merchantTrustIntelligence?.trustScore,
    intel.merchantTrustV2?.trustScore,
    intel.merchantTrustV2?.compositeCheckoutScore,
  ].filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return candidates.length ? Math.max(...candidates) : 0;
}

export function buildDecisionCalibrationDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>,
  marketMemory: MarketMemoryState | null = null
): { decisions: Map<string, UniversalProductDecision>; trayContext: Phase43TrayContext } {
  const base = buildCommerceIntelligenceCoreDecisionMap(
    coherenceByLink,
    metaByLink,
    productsByLink,
    marketMemory
  );

  const rankedLinks = [...base.trayContext.intelligenceRankOrder];
  const coveragePct = base.trayContext.marketCoverage?.coveragePct ?? 100;
  const traySize = rankedLinks.length;

  const valueScores = rankedLinks.map((link) => {
    const intel = base.decisions.get(link)?.productIntelligence;
    return intel?.valueIntelligenceCore?.valueScore ?? intel?.commerceDecisionCore?.valueScore ?? 0;
  });
  const valueMedian =
    valueScores.length > 0
      ? valueScores.slice().sort((a, b) => a - b)[Math.floor(valueScores.length / 2)] ?? 0
      : 0;

  const calibratedTierByLink = new Map<string, import("@/lib/intelligence/commerceDecisionCoreEngine").CommerceDecisionTier>();
  const calibratedByLink = new Map<string, ReturnType<typeof calibrateProductDecision>>();
  const inputsByLink = new Map<string, DecisionCalibrationInput>();

  rankedLinks.forEach((link, rankIndex) => {
    const decision = base.decisions.get(link);
    const intel = decision?.productIntelligence;
    const opportunity = intel?.buyOpportunityCore;
    const core = intel?.commerceDecisionCore;
    const merchant = intel?.realMerchantVerification;
    const discount = intel?.realDiscountProof;
    const alternatives = intel?.alternativeDiscovery;

    if (!decision || !opportunity || !core) {
      calibratedTierByLink.set(link, opportunity?.tier ?? "COMPARE");
      return;
    }

    const merchantScore = resolveMerchantScore(intel, merchant, core);
    const fakeDiscount = discount?.band === "Fake Discount";
    const discountVerified = discount?.verified === true && discount?.band !== "Fake Discount";
    const valueScore = intel?.valueIntelligenceCore?.valueScore ?? core.valueScore;
    const valueAboveMedian = valueScore >= valueMedian;
    const majorRiskFlags =
      merchantScore < 60 ||
      fakeDiscount ||
      merchant?.band === "Risky Merchant" ||
      alternatives?.promoteAlternative === true;

    const input: DecisionCalibrationInput = {
      link,
      rankIndex,
      traySize,
      coveragePct,
      tier: opportunity.tier,
      verdict: decision.verdict,
      confidence: decision.confidence,
      merchantScore,
      discountVerified,
      fakeDiscount,
      valueAboveMedian,
      marketLeading: rankIndex === 0,
      majorRiskFlags,
      compositeScore: core.compositeScore,
    };

    inputsByLink.set(link, input);
    const calibrated = calibrateProductDecision(input);

    calibratedByLink.set(link, calibrated);
    calibratedTierByLink.set(link, calibrated.tier);
  });

  for (const [link, decision] of base.decisions) {
    if (!calibratedTierByLink.has(link)) {
      calibratedTierByLink.set(link, decision.productIntelligence?.buyOpportunityCore?.tier ?? "COMPARE");
    }
  }

  const rebalancedTiers = rebalanceCalibrationPromotions({
    rankedLinks,
    tierByLink: calibratedTierByLink,
    inputsByLink,
  });

  const cappedTiers = enforceCalibrationDistributionCaps({
    rankedLinks,
    tierByLink: rebalancedTiers,
  });

  const result = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of base.decisions) {
    const intel = decision.productIntelligence;
    const calibrated = calibratedByLink.get(link);
    const tier = cappedTiers.get(link) ?? calibrated?.tier ?? intel?.buyOpportunityCore?.tier ?? "COMPARE";
    const input = inputsByLink.get(link);

    if (!calibrated || !intel?.buyOpportunityCore || !intel.commerceDecisionCore) {
      result.set(link, decision);
      continue;
    }

    const recalibrated =
      tier !== calibrated.tier && input
        ? calibrateProductDecision({ ...input, tier, verdict: decision.verdict })
        : calibrated;

    const verdict = tier === "WAIT" ? "WAIT" : tier === "COMPARE" ? "COMPARE" : "BUY READY";
    let confidence = recalibrated.confidence;
    if (tier !== recalibrated.tier) {
      if (tier === "STRONG BUY" && confidence < 85) confidence = 85;
      if (tier === "BUY READY" && confidence < 70) confidence = 70;
      if (tier === "COMPARE" && confidence > 82) confidence = 82;
    }

    const primaryLine = clipLine(recalibrated.reasoning);

    result.set(link, {
      ...decision,
      verdict,
      confidence,
      confidenceReason: `Calibrated confidence ${confidence}% from verified discount, merchant trust, coverage, and value evidence.`,
      reasonLine: primaryLine,
      primaryReason: primaryLine,
      summaryLines: [primaryLine, ...(decision.summaryLines ?? [])].slice(0, 4),
      productIntelligence: {
        ...intel,
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
        decisionCalibration: recalibrated,
        alignmentFlags: [
          ...(intel.alignmentFlags ?? []),
          "phase43_decision_calibration",
          ...(recalibrated.promotionApplied ? [`phase43_promotion_${recalibrated.promotionApplied}`] : []),
          ...(recalibrated.capApplied ? [`phase43_cap_${recalibrated.capApplied}`] : []),
        ].filter((flag, index, list) => list.indexOf(flag) === index),
      },
    });
  }

  const distribution = decisionCalibrationDistributionSummary(cappedTiers);

  return {
    decisions: result,
    trayContext: {
      ...base.trayContext,
      decisionCalibrationApplied: true,
      decisionCalibrationDistribution: distribution,
      buyOpportunityDistribution: distribution,
    },
  };
}

export function buildDecisionCalibrationDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>,
  trayContext: Phase43TrayContext
): Map<string, CoherentProductDecision> {
  const base = buildCommerceIntelligenceCoreDisplayCoherenceByLink(
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
      decisionBrief: enrichDecisionBriefWithDecisionCalibration(
        overlaid.decisionBrief,
        trayContext.marketCoverage,
        trayContext.marketSummaryV2,
        trayContext.universalQuery.understandingLine,
        "Decision calibration — evidence-based promotion with strict merchant and discount gates."
      ),
    });
  }

  return enriched;
}

export { orderProductsBySearchRank };

/** Compatibility — Phase 42/41/40 export names route to Phase 43 pipeline. */
export {
  buildDecisionCalibrationDecisionMap as buildCommerceIntelligenceCoreDecisionMap,
  buildDecisionCalibrationDecisionMap as buildGlobalCategoryDecisionMap,
  buildDecisionCalibrationDecisionMap as buildCommerceRankingDecisionMap,
  buildDecisionCalibrationDisplayCoherenceByLink as buildCommerceIntelligenceCoreDisplayCoherenceByLink,
  buildDecisionCalibrationDisplayCoherenceByLink as buildGlobalCategoryDisplayCoherenceByLink,
  buildDecisionCalibrationDisplayCoherenceByLink as buildCommerceRankingDisplayCoherenceByLink,
};
