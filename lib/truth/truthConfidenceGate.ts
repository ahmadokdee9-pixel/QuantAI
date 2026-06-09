/**
 * Phase 1A + 1D.5 — Truth Confidence Gate.
 * Downgrades high-commitment verdicts when evidence thresholds are not met.
 * Downgrade-only — never promotes BUY READY / STRONG BUY / BEST DEAL.
 */

import type { CommerceDecisionTier } from "@/lib/intelligence/commerceDecisionCoreEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import { buildExtendedTruthEvidenceSources } from "@/lib/truth/truthEvidenceBuilder";
import type { ExtendedTruthEvidenceSources } from "@/lib/truth/truthFoundationTypes";
import { discountEvidenceLine, mapDiscountVerificationStateToLabel } from "@/lib/truth/truthDiscountLanguage";
import {
  qualifyTierPriorityLabel,
  sanitizeUserFacingProse,
  TRUTH_THRESHOLDS,
} from "@/lib/truth/truthLanguagePolicy";

export type TruthEvidenceSources = ExtendedTruthEvidenceSources;

export type TruthConfidenceBundle = {
  truthConfidence: number;
  sources: TruthEvidenceSources;
  gatesApplied: string[];
  insufficientEvidence: boolean;
};

const STALE_LISTING_HOURS = 24;
const WEAK_SKU_IDENTITY_THRESHOLD = 55;
const UNAVAILABLE_STATUSES = new Set(["out_of_stock", "removed", "seller_unavailable"]);

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function isBuyTier(tier: CommerceDecisionTier): boolean {
  return tier === "BUY READY" || tier === "STRONG BUY" || tier === "BEST DEAL";
}

function downgradeTier(current: CommerceDecisionTier, target: CommerceDecisionTier): CommerceDecisionTier {
  const rank: Record<CommerceDecisionTier, number> = {
    WAIT: 0,
    COMPARE: 1,
    "BUY READY": 2,
    "STRONG BUY": 3,
    "BEST DEAL": 4,
  };
  return rank[target] < rank[current] ? target : current;
}

/** Compute truth confidence from legacy intel + Phase 1B–1D foundation evidence. */
export function computeTruthConfidence(
  intel: NonNullable<UniversalProductDecision["productIntelligence"]>
): TruthConfidenceBundle {
  const gatesApplied: string[] = [];
  const sources = buildExtendedTruthEvidenceSources(intel);

  let score = 0;

  const serverSamples = sources.baselineCoverage?.samples90d ?? 0;
  const effectivePriceSamples = Math.max(sources.priceHistorySamples, serverSamples);

  if (effectivePriceSamples >= TRUTH_THRESHOLDS.priceHistorySamples) score += 0.18;
  else if (effectivePriceSamples >= 1) score += 0.06;
  else gatesApplied.push("no_price_history_trail");

  if (sources.priceTruthConfidence >= 70) score += 0.12;
  else if (sources.priceTruthConfidence >= 45) score += 0.06;
  else if (sources.canonicalSkuId) gatesApplied.push("weak_price_truth_trail");

  if (sources.skuIdentityConfidence >= 78) score += 0.18;
  else if (sources.skuIdentityConfidence >= 60) score += 0.1;
  else gatesApplied.push("weak_sku_identity");

  if (sources.marketCoverageScore >= 65) score += 0.14;
  else if (sources.marketCoverageScore >= 45) score += 0.08;
  else gatesApplied.push("thin_market_coverage");

  if (!sources.discountFake && sources.discountVerificationState === "VERIFIED_DISCOUNT") score += 0.1;
  else if (!sources.discountFake && sources.discountVerificationState === "POSSIBLE_DISCOUNT") score += 0.05;
  else if (sources.discountFake) gatesApplied.push("fake_discount_signal");

  if (sources.merchantTrustScore >= 70) score += 0.1;
  else if (sources.merchantTrustScore >= 55) score += 0.05;
  else gatesApplied.push("weak_merchant_signal");

  if (sources.availabilityFreshness >= 80) score += 0.08;
  else if (sources.availabilityFreshness >= 50) score += 0.04;
  else gatesApplied.push("stale_availability_signal");

  if (UNAVAILABLE_STATUSES.has(sources.availabilityStatus)) gatesApplied.push("listing_unavailable_signal");
  else if (sources.availabilityStatus === "unknown") gatesApplied.push("unknown_availability_signal");

  if (sources.hasListingPrice) score += 0.06;
  else gatesApplied.push("missing_price");

  const truthConfidence = clamp01(score);
  const insufficientEvidence = truthConfidence < TRUTH_THRESHOLDS.buyReady;

  return {
    truthConfidence,
    sources,
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

/** Apply truth gates to tier/verdict — downgrade only. */
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
  const sources = truthBundle.sources;

  const tc = truthBundle.truthConfidence;

  if (isBuyTier(tier) && sources.listingAgeHours > STALE_LISTING_HOURS) {
    gates.push("downgrade_stale_listing_24h");
    tier = downgradeTier(tier, "WAIT");
    verdict = "WAIT";
    confidence = Math.min(confidence, 62);
  }

  if (isBuyTier(tier) && UNAVAILABLE_STATUSES.has(sources.availabilityStatus)) {
    gates.push("downgrade_listing_unavailable");
    tier = downgradeTier(tier, "WAIT");
    verdict = "INSUFFICIENT DATA";
    confidence = Math.min(confidence, 52);
  }

  if (isBuyTier(tier) && sources.availabilityStatus === "unknown" && sources.availabilityFreshness < 50) {
    gates.push("downgrade_unknown_availability");
    tier = downgradeTier(tier, "WAIT");
    verdict = "WAIT";
    confidence = Math.min(confidence, 60);
  }

  if (isBuyTier(tier) && sources.discountFake) {
    gates.push("downgrade_fake_discount_risk");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 65);
  }

  if (
    isBuyTier(tier) &&
    sources.baselineCoverage &&
    !sources.baselineCoverage.sufficientForVerification &&
    effectivePriceSamples(sources) < TRUTH_THRESHOLDS.priceHistorySamples
  ) {
    gates.push("downgrade_insufficient_price_history");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 66);
  }

  if (isBuyTier(tier) && sources.skuIdentityConfidence < WEAK_SKU_IDENTITY_THRESHOLD) {
    gates.push("downgrade_weak_sku_identity_phase1c");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 64);
  }

  if (tier === "BEST DEAL" && tc < TRUTH_THRESHOLDS.bestDeal) {
    gates.push("downgrade_best_deal_insufficient_truth");
    tier = downgradeTier(tier, tc >= TRUTH_THRESHOLDS.strongBuy ? "STRONG BUY" : tc >= TRUTH_THRESHOLDS.buyReady ? "BUY READY" : "COMPARE");
  }

  if ((tier === "STRONG BUY" || tier === "BEST DEAL") && tc < TRUTH_THRESHOLDS.strongBuy) {
    gates.push("downgrade_strong_buy_insufficient_truth");
    tier = downgradeTier(tier, tc >= TRUTH_THRESHOLDS.buyReady ? "BUY READY" : "COMPARE");
  }

  if (isBuyTier(tier) && tc < TRUTH_THRESHOLDS.buyReady) {
    gates.push("downgrade_buy_ready_insufficient_truth");
    if (tc < 0.35) {
      tier = downgradeTier(tier, "WAIT");
      verdict = "INSUFFICIENT DATA";
      confidence = Math.min(confidence, 55);
    } else {
      tier = downgradeTier(tier, "COMPARE");
      verdict = "COMPARE";
      confidence = Math.min(confidence, 68);
    }
  }

  if (verdict === "BUY READY" && tc < TRUTH_THRESHOLDS.buyReady) {
    verdict = tc < 0.35 ? "INSUFFICIENT DATA" : "COMPARE";
  }

  const unavailableDowngrade = gates.includes("downgrade_listing_unavailable");

  verdict = unavailableDowngrade
    ? "INSUFFICIENT DATA"
    : tier === "WAIT"
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

function effectivePriceSamples(sources: TruthEvidenceSources): number {
  return Math.max(sources.priceHistorySamples, sources.baselineCoverage?.samples90d ?? 0);
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

  const discountLabel = mapDiscountVerificationStateToLabel(truthBundle.sources.discountVerificationState);
  const discountLine = discountEvidenceLine(truthBundle.sources.discountVerificationState);

  const primaryLine = sanitizeUserFacingProse(decision.primaryReason ?? decision.reasonLine ?? "");
  const reasonLine = sanitizeUserFacingProse(decision.reasonLine ?? primaryLine);
  const confidenceReason = sanitizeUserFacingProse(
    decision.confidenceReason ??
      `Truth confidence ${Math.round(gated.truthConfidence * 100)}% — ${discountLabel}. ${discountLine}`
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
        "phase1d5_truth_gate",
        `phase1d5_truth_confidence_${Math.round(gated.truthConfidence * 100)}`,
        `phase1d5_discount_${(truthBundle.sources.discountVerificationState ?? "none").toLowerCase()}`,
        ...gated.gatesApplied.map((g) => `phase1d5_gate_${g}`),
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}
