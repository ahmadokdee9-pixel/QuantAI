/**
 * Phase 1A — Truth Confidence Gate.
 * Downgrades high-commitment verdicts when evidence thresholds are not met.
 */

import type { CommerceDecisionTier } from "@/lib/intelligence/commerceDecisionCoreEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import {
  qualifyTierPriorityLabel,
  sanitizeUserFacingProse,
  TRUTH_THRESHOLDS,
} from "@/lib/truth/truthLanguagePolicy";

export type TruthEvidenceSources = {
  priceHistorySamples: number;
  identityConfidence: number;
  marketCoverageScore: number;
  discountProofScore: number;
  discountFake: boolean;
  merchantTrustScore: number;
  hasListingPrice: boolean;
};

export type TruthConfidenceBundle = {
  truthConfidence: number;
  sources: TruthEvidenceSources;
  gatesApplied: string[];
  insufficientEvidence: boolean;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Compute truth confidence from available evidence (no external APIs in Phase 1A). */
export function computeTruthConfidence(
  intel: NonNullable<UniversalProductDecision["productIntelligence"]>
): TruthConfidenceBundle {
  const gatesApplied: string[] = [];

  const priceHistorySamples = intel.commercePriceHistory?.insight?.sampleCount ?? 0;
  const identityConfidence = intel.productIdentityV2?.identityConfidence ?? intel.globalProductIdentity?.identityConfidence ?? 0;
  const marketCoverageScore = intel.marketDepth?.marketCoverageScore ?? intel.marketCoverage?.coveragePct ?? 50;
  const discountProofScore = intel.realDiscountProof?.discountAuthenticityScore ?? intel.discountConfidence?.discountConfidence ?? 0;
  const discountFake =
    intel.realDiscountProof?.band.includes("Fake") ||
    intel.realDiscountValidationV3?.fakeDiscountScoreHigh === true ||
    intel.discountConfidence?.label === "Weak Discount Signal";
  const merchantTrustScore =
    intel.merchantReliability?.merchantReliabilityScore ??
    intel.realMerchantVerification?.merchantTrustScore ??
    intel.merchantTrustIntelligence?.trustScore ??
    0;
  const hasListingPrice = (intel.globalPriceIntelligence?.lowestPriceFound ?? 0) > 0;

  let score = 0;

  // Price history: only counted with sufficient remembered samples
  if (priceHistorySamples >= TRUTH_THRESHOLDS.priceHistorySamples) score += 0.22;
  else if (priceHistorySamples >= 1) score += 0.08;
  else gatesApplied.push("no_price_history_trail");

  // Identity: title-normalization confidence only
  if (identityConfidence >= 78) score += 0.22;
  else if (identityConfidence >= 60) score += 0.12;
  else gatesApplied.push("weak_sku_identity");

  // Market coverage within tray
  if (marketCoverageScore >= 65) score += 0.18;
  else if (marketCoverageScore >= 45) score += 0.1;
  else gatesApplied.push("thin_market_coverage");

  // Discount: heuristic only — capped contribution
  if (!discountFake && discountProofScore >= 60) score += 0.12;
  else if (discountFake) gatesApplied.push("fake_discount_signal");

  // Merchant: curated prior only — capped
  if (merchantTrustScore >= 70) score += 0.12;
  else if (merchantTrustScore >= 55) score += 0.06;
  else gatesApplied.push("weak_merchant_signal");

  if (hasListingPrice) score += 0.08;
  else gatesApplied.push("missing_price");

  const truthConfidence = clamp01(score);
  const insufficientEvidence = truthConfidence < TRUTH_THRESHOLDS.buyReady;

  return {
    truthConfidence,
    sources: {
      priceHistorySamples,
      identityConfidence,
      marketCoverageScore,
      discountProofScore,
      discountFake,
      merchantTrustScore,
      hasListingPrice,
    },
    gatesApplied,
    insufficientEvidence,
  };
}

export type TruthGateResult = {
  tier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
  confidence: number;
  commercePriorityLabel: string;
  gatesApplied: string[];
  truthConfidence: number;
};

/** Apply truth gates to tier/verdict before production output. */
export function applyTruthConfidenceGate(args: {
  tier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
  confidence: number;
  truthBundle: TruthConfidenceBundle;
}): TruthGateResult {
  const { truthBundle } = args;
  let tier = args.tier;
  let verdict = args.verdict;
  let confidence = args.confidence;
  const gates = [...truthBundle.gatesApplied];

  const tc = truthBundle.truthConfidence;

  if (tier === "BEST DEAL" && tc < TRUTH_THRESHOLDS.bestDeal) {
    gates.push("downgrade_best_deal_insufficient_truth");
    tier = tc >= TRUTH_THRESHOLDS.strongBuy ? "STRONG BUY" : tc >= TRUTH_THRESHOLDS.buyReady ? "BUY READY" : "COMPARE";
  }

  if ((tier === "STRONG BUY" || tier === "BEST DEAL") && tc < TRUTH_THRESHOLDS.strongBuy) {
    gates.push("downgrade_strong_buy_insufficient_truth");
    if (tier === "STRONG BUY" || tier === "BEST DEAL") {
      tier = tc >= TRUTH_THRESHOLDS.buyReady ? "BUY READY" : "COMPARE";
    }
  }

  if ((tier === "BUY READY" || tier === "STRONG BUY" || tier === "BEST DEAL") && tc < TRUTH_THRESHOLDS.buyReady) {
    gates.push("downgrade_buy_ready_insufficient_truth");
    if (tc < 0.35) {
      tier = "WAIT";
      verdict = "INSUFFICIENT DATA";
      confidence = Math.min(confidence, 55);
    } else {
      tier = "COMPARE";
      verdict = "COMPARE";
      confidence = Math.min(confidence, 68);
    }
  }

  if (verdict === "BUY READY" && tc < TRUTH_THRESHOLDS.buyReady) {
    verdict = tc < 0.35 ? "INSUFFICIENT DATA" : "COMPARE";
  }

  verdict =
    tier === "WAIT"
      ? tc < 0.35
        ? "INSUFFICIENT DATA"
        : "WAIT"
      : tier === "COMPARE"
        ? "COMPARE"
        : verdict === "AVOID"
          ? "AVOID"
          : "BUY READY";

  const commercePriorityLabel = qualifyTierPriorityLabel(tier);

  return {
    tier,
    verdict,
    confidence,
    commercePriorityLabel,
    gatesApplied: gates,
    truthConfidence: tc,
  };
}

/** Apply truth gate + language sanitization to a universal decision. */
export function applyTruthGateToDecision(decision: UniversalProductDecision): UniversalProductDecision {
  const intel = decision.productIntelligence;
  if (!intel) return decision;

  const truthBundle = computeTruthConfidence(intel);
  const tier = intel.buyOpportunityCore?.tier ?? intel.commerceDecisionCore?.tier ?? "COMPARE";
  const gated = applyTruthConfidenceGate({
    tier,
    verdict: decision.verdict,
    confidence: decision.confidence,
    truthBundle,
  });

  const primaryLine = sanitizeUserFacingProse(decision.primaryReason ?? decision.reasonLine ?? "");
  const reasonLine = sanitizeUserFacingProse(decision.reasonLine ?? primaryLine);
  const confidenceReason = sanitizeUserFacingProse(
    decision.confidenceReason ??
      `Truth confidence ${Math.round(gated.truthConfidence * 100)}% — confidence-based recommendation from search-sample evidence.`
  );

  return {
    ...decision,
    verdict: gated.verdict,
    confidence: gated.confidence,
    reasonLine,
    primaryReason: primaryLine,
    confidenceReason,
    summaryLines: [
      primaryLine,
      sanitizeUserFacingProse(decision.summaryLines?.[1] ?? ""),
    ] as [string, string],
    productIntelligence: {
      ...intel,
      commercePriorityLabel: gated.commercePriorityLabel as typeof intel.commercePriorityLabel,
      commerceDecisionCore: intel.commerceDecisionCore
        ? {
            ...intel.commerceDecisionCore,
            tier: gated.tier,
            verdict: gated.verdict,
            decisionConfidence: gated.confidence,
            reasoning: sanitizeUserFacingProse(intel.commerceDecisionCore.reasoning),
          }
        : intel.commerceDecisionCore,
      buyOpportunityCore: intel.buyOpportunityCore
        ? {
            ...intel.buyOpportunityCore,
            tier: gated.tier,
            verdict: gated.verdict,
            reasoning: sanitizeUserFacingProse(intel.buyOpportunityCore.reasoning ?? ""),
          }
        : intel.buyOpportunityCore,
      alignmentFlags: [
        ...(intel.alignmentFlags ?? []),
        "phase1a_truth_gate",
        `phase1a_truth_confidence_${Math.round(gated.truthConfidence * 100)}`,
        ...gated.gatesApplied.map((g) => `phase1a_gate_${g}`),
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}
