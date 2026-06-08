/**
 * Phase 39 — Commerce Decision Calibration activation.
 * Chains after Phase 38 — intelligence only, no card layout changes.
 */

import { selectBestDealDominance } from "@/lib/intelligence/bestDealDominanceEngine";
import { buildBestPlaceToBuyV2 } from "@/lib/intelligence/bestPlaceToBuyEngineV2";
import { buildBuyerDecisionIntelligence, buyerDecisionIsSpecific } from "@/lib/intelligence/buyerDecisionIntelligenceEngine";
import { buildBuyExplanation, buyExplanationIsSpecific } from "@/lib/intelligence/buyExplanationEngine";
import { computeOpportunityPriorityV2 } from "@/lib/intelligence/opportunityPriorityEngineV2";
import { validateRealDiscountV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";
import { validateDecisionConsistency } from "@/lib/intelligence/noContradictionEngine";
import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { enrichDecisionBriefWithCommerceCalibration } from "@/lib/ui/commerceCalibrationBriefEnrichment";
import {
  allBuyReadyConfidenceAligned,
  assignCalibratedCommerceVerdicts,
  calibratedVerdictDistribution,
} from "@/lib/ui/calibratedCommerceVerdictEngine";
import {
  buildCommerceDominanceDecisionMap,
  buildCommerceDominanceDisplayCoherenceByLink,
  type Phase38TrayContext,
} from "@/lib/ui/phase38CommerceDominanceActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { overlayCoherentWithUniversal, type UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function clipLine(text: string, max = 220): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function applyCalibrationIntelligence(
  decision: UniversalProductDecision,
  buyerIntel: ReturnType<typeof buildBuyerDecisionIntelligence>,
  bestPlaceV2: ReturnType<typeof buildBestPlaceToBuyV2>
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const primaryReason = clipLine(buyerIntel.verdictReason);
  const secondaryReason = clipLine(buyerIntel.analystBlock);

  return {
    ...decision,
    decisionThesis: primaryReason,
    reasonLine: primaryReason,
    primaryReason,
    secondaryReason,
    summaryLines: [primaryReason, clipLine(bestPlaceV2.destinationSummary)],
    reasonAuthority: {
      ...decision.reasonAuthority,
      primaryReason: { ...decision.reasonAuthority.primaryReason, line: primaryReason },
      secondaryReasons: [
        {
          code: decision.reasonAuthority.secondaryReasons[0]?.code ?? ("FIT" as const),
          label: "Where to buy",
          line: clipLine(buyerIntel.whereToBuy),
        },
        {
          code: decision.reasonAuthority.secondaryReasons[1]?.code ?? ("VALUE" as const),
          label: "Purchase intelligence",
          line: secondaryReason,
        },
      ],
    },
    productIntelligence: {
      ...intelligence,
      buyerReasoning: {
        primaryLine: buyerIntel.shouldBuyNow,
        buyerFit: buyerIntel.isGoodProduct,
        valueAnalysis: buyerIntel.isGoodPrice,
        marketPosition: buyerIntel.betterEquivalent,
        trustAnalysis: buyerIntel.isBestSeller,
        tradeoffs: buyerIntel.couldSaveLater,
        competitorComparison: buyerIntel.betterEquivalent,
        improvementPath: buyerIntel.whereToBuy,
      },
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase39_commerce_calibration",
        `phase39_confidence_band_${intelligence.calibratedConfidence?.band?.replace(/\s+/g, "_").toLowerCase() ?? "aligned"}`,
        `phase39_opportunity_v2_${intelligence.opportunityPriorityV2?.opportunityScore ?? 0}`,
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}

export type Phase39TrayContext = Phase38TrayContext & {
  calibrationApplied: true;
};

export function buildCommerceCalibrationDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>,
  marketMemory: MarketMemoryState | null = null
): { decisions: Map<string, UniversalProductDecision>; trayContext: Phase39TrayContext } {
  const tray = [...productsByLink.values()].map((row) => row.product);
  const base = buildCommerceDominanceDecisionMap(coherenceByLink, metaByLink, productsByLink, marketMemory);

  const opportunityV2ByLink = new Map<
    string,
    ReturnType<typeof computeOpportunityPriorityV2>
  >();
  const realDiscountV3ByLink = new Map<
    string,
    ReturnType<typeof validateRealDiscountV3>
  >();
  const buyOpportunityByLink = new Map<
    string,
    NonNullable<UniversalProductDecision["productIntelligence"]>["globalBuyOpportunity"]
  >();
  const globalPriceByLink = new Map<
    string,
    NonNullable<UniversalProductDecision["productIntelligence"]>["globalPriceIntelligence"]
  >();
  const merchantTrustByLink = new Map<
    string,
    NonNullable<UniversalProductDecision["productIntelligence"]>["merchantTrustIntelligence"]
  >();
  const waitByLink = new Map<
    string,
    NonNullable<UniversalProductDecision["productIntelligence"]>["waitPrediction"]
  >();
  const priceHistoryByLink = new Map<
    string,
    NonNullable<UniversalProductDecision["productIntelligence"]>["commercePriceHistory"]
  >();
  const hasSuperiorAltByLink = new Map<string, boolean>();

  const dominanceRows: Array<{
    link: string;
    opportunity: ReturnType<typeof computeOpportunityPriorityV2>;
    realDiscount: ReturnType<typeof validateRealDiscountV3>;
    trustScore: number;
    valueScore: number;
  }> = [];

  for (const [link, decision] of base.decisions) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    if (!row?.product || !intel?.globalPriceIntelligence || !intel.discountIntelligenceV2 || !intel.globalBuyOpportunity) {
      continue;
    }

    const merchantTrust = intel.merchantTrustIntelligence;
    if (!merchantTrust) continue;

    const realDiscount = validateRealDiscountV3({
      product: row.product,
      tray,
      globalPrice: intel.globalPriceIntelligence,
      discountV2: intel.discountIntelligenceV2,
      priceHistory: intel.commercePriceHistory,
    });
    const opportunityV2 = computeOpportunityPriorityV2({
      globalPrice: intel.globalPriceIntelligence,
      merchantTrust,
      discountV2: intel.discountIntelligenceV2,
      realDiscount,
      qualityScore: intel.globalBuyOpportunity.qualityScore,
    });

    opportunityV2ByLink.set(link, opportunityV2);
    realDiscountV3ByLink.set(link, realDiscount);
    buyOpportunityByLink.set(link, intel.globalBuyOpportunity);
    globalPriceByLink.set(link, intel.globalPriceIntelligence);
    merchantTrustByLink.set(link, merchantTrust);
    waitByLink.set(link, intel.waitPrediction);
    priceHistoryByLink.set(link, intel.commercePriceHistory);
    hasSuperiorAltByLink.set(link, Boolean(intel.globalAlternatives?.bestSameProductCheaper));

    dominanceRows.push({
      link,
      opportunity: opportunityV2,
      realDiscount,
      trustScore: merchantTrust.trustScore,
      valueScore: intel.globalBuyOpportunity.valueScore,
    });
  }

  const bestDealDominance = selectBestDealDominance(dominanceRows);
  const intent = base.decisions.values().next().value?.productIntelligence?.shopperIntentMode;

  const verdictAuthority = assignCalibratedCommerceVerdicts({
    decisions: base.decisions,
    buyOpportunityByLink: new Map(
      [...buyOpportunityByLink.entries()].filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => Boolean(entry[1]))
    ),
    globalPriceByLink: new Map(
      [...globalPriceByLink.entries()].filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => Boolean(entry[1]))
    ),
    merchantTrustByLink: new Map(
      [...merchantTrustByLink.entries()].filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => Boolean(entry[1]))
    ),
    waitPredictionByLink: new Map(
      [...waitByLink.entries()].filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => Boolean(entry[1]))
    ),
    priceHistoryByLink: new Map(
      [...priceHistoryByLink.entries()].filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => Boolean(entry[1]))
    ),
    opportunityV2ByLink,
    realDiscountV3ByLink,
    intent: intent ?? { version: 1, primaryMode: "Value Buyer", secondaryMode: null, confidence: 0.6, signals: [] },
    hasSuperiorAlternativeByLink: hasSuperiorAltByLink,
    productsByLink,
    bestDealDominance,
  });

  const result = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of base.decisions) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    const verdictRow = verdictAuthority.get(link);
    const opportunityV2 = opportunityV2ByLink.get(link);
    const realDiscountV3 = realDiscountV3ByLink.get(link);

    if (!row?.product || !intel || !verdictRow || !opportunityV2 || !realDiscountV3) {
      result.set(link, decision);
      continue;
    }

    const bestPlaceBase = intel.bestPlaceToBuy;
    const merchantTrust = intel.merchantTrustIntelligence;
    if (!bestPlaceBase || !merchantTrust || !intel.globalPriceIntelligence || !intel.globalAlternatives) {
      result.set(link, decision);
      continue;
    }

    const bestPlaceV2 = buildBestPlaceToBuyV2({
      base: bestPlaceBase,
      globalPrice: intel.globalPriceIntelligence,
      merchantTrust,
      productTitle: row.product.title,
    });

    const verdict = verdictRow.verdict;
    const commercePriorityLabel = verdictRow.commercePriorityLabel;
    const confidence = verdictRow.calibratedConfidence.confidence;
    const confidenceReason = verdictRow.calibratedConfidence.reason;
    const waitExplanation = verdictRow.waitExplanation;

    const cheaperElsewhere = intel.globalAlternatives.bestSameProductCheaper?.store ?? null;

    const buyerIntel = buildBuyerDecisionIntelligence({
      productTitle: row.product.title,
      store: row.product.store,
      price: row.product.price,
      verdict,
      qualityScore: intel.globalBuyOpportunity?.qualityScore ?? 60,
      bestPlace: bestPlaceV2,
      opportunity: opportunityV2,
      realDiscount: realDiscountV3,
      waitExplanation,
      cheaperElsewhere,
      commercePriorityLabel,
    });

    const consistency = validateDecisionConsistency({
      verdict,
      confidence: verdictRow.calibratedConfidence,
      waitExplanation,
      hasObviousWinner: verdictRow.obviousWinner,
      trustedFairPrice: realDiscountV3.realDiscountScore >= 50 && merchantTrust.trustScore >= 58,
      reasoningPresent: buyerDecisionIsSpecific(buyerIntel.analystBlock),
    });

    let primaryLine = "";
    if (verdict === "WAIT" && waitExplanation?.evidenceBacked) {
      primaryLine = clipLine(`Wait — ${waitExplanation.formattedBlock}`);
    } else if (verdict === "INSUFFICIENT DATA") {
      primaryLine = clipLine("Insufficient verified data — compare trusted listings with price and seller details.");
    } else if (verdict === "AVOID") {
      primaryLine = clipLine(`Avoid — ${buyerIntel.isGoodPrice} ${buyerIntel.betterEquivalent}`);
    } else if (verdict === "COMPARE") {
      primaryLine = clipLine(`${buyerIntel.shouldBuyNow} ${bestPlaceV2.destinationSummary}`);
    } else {
      const buyExplanation = buildBuyExplanation({
        productTitle: row.product.title,
        link,
        bestPlace: bestPlaceBase,
        globalPrice: intel.globalPriceIntelligence,
        merchantTrust,
        alternatives: intel.globalAlternatives,
        waitPrediction: intel.waitPrediction!,
        bestDeal: intel.bestDealFound!,
        intent: intel.shopperIntentMode ?? { version: 1, primaryMode: "Value Buyer", secondaryMode: null, confidence: 0.6, signals: [] },
        isBestDealFound: commercePriorityLabel === "BEST DEAL FOUND",
      });

      let next: UniversalProductDecision = {
        ...decision,
        verdict,
        confidence,
        confidenceReason,
        productIntelligence: {
          ...intel,
          commercePriorityLabel,
          bestPlaceToBuy: bestPlaceBase,
          bestPlaceToBuyV2: bestPlaceV2,
          opportunityPriorityV2: opportunityV2,
          realDiscountValidationV3: realDiscountV3,
          calibratedConfidence: verdictRow.calibratedConfidence,
          waitExplanation,
          buyerDecisionIntelligence: buyerIntel,
          bestDealDominance: {
            isHolder: bestDealDominance.tiedLinks.includes(link),
            dominanceScore: bestDealDominance.dominanceScore,
            tiedCount: bestDealDominance.tiedLinks.length,
          },
          calibrationConsistency: consistency,
          buyExplanation,
        },
      };
      next = applyCalibrationIntelligence(next, buyerIntel, bestPlaceV2);
      result.set(link, next);
      continue;
    }

    result.set(link, {
      ...decision,
      verdict,
      confidence,
      confidenceReason,
      primaryReason: primaryLine,
      reasonLine: primaryLine,
      productIntelligence: {
        ...intel,
        commercePriorityLabel,
        bestPlaceToBuyV2: bestPlaceV2,
        opportunityPriorityV2: opportunityV2,
        realDiscountValidationV3: realDiscountV3,
        calibratedConfidence: verdictRow.calibratedConfidence,
        waitExplanation,
        buyerDecisionIntelligence: buyerIntel,
        bestDealDominance: {
          isHolder: bestDealDominance.tiedLinks.includes(link),
          dominanceScore: bestDealDominance.dominanceScore,
          tiedCount: bestDealDominance.tiedLinks.length,
        },
        calibrationConsistency: consistency,
      },
    });
  }

  return {
    decisions: result,
    trayContext: { ...base.trayContext, calibrationApplied: true },
  };
}

export function buildCommerceCalibrationDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>,
  trayContext: Phase39TrayContext
): Map<string, CoherentProductDecision> {
  const base = buildCommerceDominanceDisplayCoherenceByLink(coherenceByLink, universalByLink, trayContext);
  const enriched = new Map<string, CoherentProductDecision>();

  for (const [link, coherent] of base) {
    const universal = universalByLink.get(link);
    const overlaid = universal ? overlayCoherentWithUniversal(coherent, universal) : coherent;
    enriched.set(link, {
      ...overlaid,
      decisionBrief: enrichDecisionBriefWithCommerceCalibration(
        overlaid.decisionBrief,
        trayContext.marketCoverage
      ),
    });
  }

  return enriched;
}

export {
  allBuyReadyConfidenceAligned,
  assignCalibratedCommerceVerdicts,
  buildBuyerDecisionIntelligence,
  buyerDecisionIsSpecific,
  buyExplanationIsSpecific,
  calibratedVerdictDistribution,
  computeOpportunityPriorityV2,
  validateRealDiscountV3,
};
