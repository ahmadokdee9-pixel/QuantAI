/** QUANTAI_PHASE_27_1_STABLE_FROZEN — decision distribution authority. */
/**
 * Phase 27.1 — Decision Distribution Authority.
 * Evidence-based verdict distribution; COMPARE is not the default fallback.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";

export type DistributionTrayContext = {
  bestConfidence: number;
  productConfidence: number;
  confidenceGapFromBest: number;
  closeAlternativeCount: number;
  trayAlternativePressure: number;
};

export type DecisionDistributionResult = {
  verdict: CoherentProductDecision["verdict"];
  reason: string;
};

function clipLine(text: string, max = 96): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function safeScore(value: number | null | undefined, fallback = 0): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

function effectiveTrust(coherent: CoherentProductDecision): number {
  const { trustRisk } = coherent;
  if (Number.isFinite(trustRisk.trustScore) && trustRisk.trustScore > 0) {
    return trustRisk.trustScore;
  }
  return Math.max(0, Math.min(100, 100 - safeScore(trustRisk.riskScore, 50)));
}

/** Resolve product verdict from existing phase 14–27 signals (not lead/non-lead defaulting). */
export function resolveDecisionDistribution(
  coherent: CoherentProductDecision,
  tray: DistributionTrayContext
): DecisionDistributionResult {
  const {
    trustRisk,
    intentIntelligence,
    priceTarget,
    buyWait,
    discountTruth,
    categoryIntelligence,
    alternativeAdvantage,
    unifiedDecision,
    isLeadProduct,
  } = coherent;

  const trust = effectiveTrust(coherent);
  const risk = safeScore(trustRisk.riskScore);
  const trusted = trust >= 62 && risk < 52;
  const elevatedRisk = risk >= 58 || trust < 48;
  const suspicious = safeScore(trustRisk.factors.suspiciousOfferRisk) >= 55;
  const inflated =
    discountTruth.verdict === "Inflated" || discountTruth.verdict === "Likely Inflated";
  const weakVerification = safeScore(trustRisk.factors.insufficientInformationRisk) >= 58;

  if (
    unifiedDecision.finalDecision === "AVOID" ||
    elevatedRisk ||
    suspicious ||
    (inflated && trust < 55) ||
    (weakVerification && trust < 52)
  ) {
    return {
      verdict: "AVOID",
      reason: clipLine(
        trustRisk.riskReason ||
          unifiedDecision.finalReasoning ||
          "Trust, seller, or discount hygiene fails checkout safety checks."
      ),
    };
  }

  const distLow = safeScore(priceTarget.distanceFromLowPct, 0);
  const savings = safeScore(priceTarget.potentialSavings, 0);
  const priceElevated = distLow >= 18 || savings >= 12;
  const weakDiscount =
    inflated ||
    (discountTruth.verdict === "Uncertain" &&
      safeScore(discountTruth.confidence, 0) < 45 &&
      trust < 60);
  const badTiming =
    buyWait.verdict === "WAIT" || unifiedDecision.finalDecision === "WAIT";
  const waitSignals = priceElevated || weakDiscount || badTiming;

  const strongIntent = intentIntelligence.intentMatchScore >= 56;
  const strongCategory = categoryIntelligence.categoryScore >= 54;
  const priceAcceptable =
    !priceElevated &&
    (buyWait.verdict === "BUY NOW" ||
      unifiedDecision.finalDecision === "BUY_NOW" ||
      discountTruth.verdict === "Genuine" ||
      discountTruth.verdict === "Likely Genuine" ||
      safeScore(priceTarget.opportunityScore, 0) >= 52 ||
      distLow <= 15);
  const dominated =
    !isLeadProduct &&
    tray.confidenceGapFromBest > 12 &&
    tray.trayAlternativePressure >= 55 &&
    safeScore(alternativeAdvantage.leadAdvantageScore, 0) < 48;

  const buyReady =
    (unifiedDecision.finalDecision === "BUY_NOW" ||
      (trusted && strongIntent && (strongCategory || intentIntelligence.intentMatchScore >= 62) && priceAcceptable)) &&
    !dominated &&
    !waitSignals;

  if (buyReady) {
    return {
      verdict: "BUY READY",
      reason: clipLine(
        unifiedDecision.finalReasoning ||
          intentIntelligence.matchExplanation ||
          "Trusted seller, strong intent fit, and acceptable price support checkout."
      ),
    };
  }

  if (waitSignals || (trusted && !priceAcceptable)) {
    return {
      verdict: "WAIT",
      reason: clipLine(
        priceTarget.explanation ||
          buyWait.explanation ||
          unifiedDecision.finalReasoning ||
          "Price or timing is not favorable enough for a buy-ready call."
      ),
    };
  }

  const compareViable =
    tray.closeAlternativeCount >= 2 &&
    tray.trayAlternativePressure >= 52 &&
    tray.confidenceGapFromBest <= 12 &&
    trusted &&
    !waitSignals &&
    (unifiedDecision.finalDecision === "COMPARE" ||
      buyWait.verdict === "COMPARE" ||
      tray.trayAlternativePressure >= 60);

  if (compareViable) {
    return {
      verdict: "COMPARE",
      reason: clipLine(
        alternativeAdvantage.comparisonSummary ||
          "Valid option, but close alternatives remain — compare before committing."
      ),
    };
  }

  if (trusted) {
    return {
      verdict: "WAIT",
      reason: clipLine(
        unifiedDecision.finalReasoning ||
          "Acceptable trust but price/timing needs patience before checkout."
      ),
    };
  }

  return {
    verdict: "AVOID",
    reason: clipLine(trustRisk.trustReason || "Insufficient trust to recommend this listing."),
  };
}
