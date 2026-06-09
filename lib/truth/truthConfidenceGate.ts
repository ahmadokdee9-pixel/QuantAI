/**
 * Phase 1A + 1D.5 — Truth Confidence Gate.
 * Downgrades high-commitment verdicts when evidence thresholds are not met.
 * Downgrade-only — never promotes BUY READY / STRONG BUY / BEST DEAL.
 */

import type { CommerceDecisionTier } from "@/lib/intelligence/commerceDecisionCoreEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import { buildExtendedTruthEvidenceSources } from "@/lib/truth/truthEvidenceBuilder";
import {
  isStaleAvailabilityState,
  isUnavailableAvailabilityState,
  isUnknownAvailabilityState,
  STALE_LISTING_HOURS,
} from "@/lib/truth/availabilityStateModel";
import { isConsensusConflict } from "@/lib/truth/availabilityConsensusModel";
import {
  MIN_MERCHANTS_FOR_CROSS_MERCHANT_GATES,
  WEAK_MERCHANT_AGREEMENT_THRESHOLD,
} from "@/lib/truth/crossMerchantTruthAggregator";
import {
  HIGH_MARKET_SPREAD_THRESHOLD,
  LOW_MARKET_AGREEMENT_THRESHOLD,
  THIN_MARKET_DEPTH_THRESHOLD,
  WEAK_MARKET_AVAILABILITY_CONFIDENCE_THRESHOLD,
  WEAK_MARKET_PRICE_CONFIDENCE_THRESHOLD,
} from "@/lib/truth/marketTruthRollup";
import {
  hasMerchantReliabilitySignal,
  HIGH_VOLATILITY_THRESHOLD,
  POOR_AVAILABILITY_RELIABILITY_THRESHOLD,
  POOR_PRICING_RELIABILITY_THRESHOLD,
  STALE_FRESHNESS_RELIABILITY_THRESHOLD,
  UNRELIABLE_MERCHANT_THRESHOLD,
} from "@/lib/truth/merchantReliabilityTruth";
import {
  WEAK_OVERALL_PRODUCT_CONFIDENCE_THRESHOLD,
  WEAK_PRODUCT_MARKET_CONFIDENCE_THRESHOLD,
  WEAK_PRODUCT_MERCHANT_CONFIDENCE_THRESHOLD,
  WEAK_PRODUCT_TRUTH_CONFIDENCE_THRESHOLD,
} from "@/lib/truth/productIntelligenceFoundation";
import {
  WEAK_COMMERCE_CONFIDENCE_THRESHOLD,
  WEAK_COMMERCE_MARKET_TRUTH_THRESHOLD,
  WEAK_COMMERCE_MERCHANT_TRUTH_THRESHOLD,
  WEAK_COMMERCE_PRODUCT_TRUTH_THRESHOLD,
} from "@/lib/truth/universalCommerceIntelligence";
import {
  isHighPrimaryRisk,
  WEAK_COMMERCE_REASONING_CONFIDENCE_THRESHOLD,
} from "@/lib/truth/commerceReasoningLayer";
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

const WEAK_SKU_IDENTITY_THRESHOLD = 55;

function hasMarketIntelligenceSignal(sources: TruthEvidenceSources): boolean {
  return (
    sources.merchantCount >= MIN_MERCHANTS_FOR_CROSS_MERCHANT_GATES ||
    sources.priceHistorySamples >= 3 ||
    sources.priceTruthConfidence >= 45
  );
}

function hasMerchantReliabilityEvidence(sources: TruthEvidenceSources): boolean {
  return hasMerchantReliabilitySignal(sources.merchantObservationCount);
}

function hasProductIntelligenceEvidence(sources: TruthEvidenceSources): boolean {
  return sources.hasProductIntelligence === true;
}

function hasCommerceIntelligenceEvidence(sources: TruthEvidenceSources): boolean {
  return sources.hasCommerceIntelligence === true && Boolean(sources.canonicalSkuId);
}

function hasCommerceReasoningEvidence(sources: TruthEvidenceSources): boolean {
  return sources.hasCommerceReasoning === true && Boolean(sources.canonicalSkuId);
}

function isUncertainReasoningState(state: string): boolean {
  return state === "COMMERCE_REASONING_WEAK" || state === "COMMERCE_REASONING_UNKNOWN";
}

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

  if (isUnavailableAvailabilityState(sources.availabilityState)) gatesApplied.push("listing_unavailable_signal");
  else if (isUnknownAvailabilityState(sources.availabilityState)) gatesApplied.push("unknown_availability_signal");
  else if (isStaleAvailabilityState(sources.availabilityState)) gatesApplied.push("stale_availability_state");

  if (isConsensusConflict(sources.availabilityConsensus)) gatesApplied.push("cross_merchant_availability_conflict");
  if (sources.listingPriceOutlier) gatesApplied.push("cross_merchant_price_outlier");
  if (
    sources.merchantCount >= MIN_MERCHANTS_FOR_CROSS_MERCHANT_GATES &&
    sources.merchantAgreementScore < WEAK_MERCHANT_AGREEMENT_THRESHOLD
  ) {
    gatesApplied.push("weak_cross_merchant_agreement");
  }

  if (hasMarketIntelligenceSignal(sources) && sources.marketDepth < THIN_MARKET_DEPTH_THRESHOLD) {
    gatesApplied.push("thin_market_depth");
  }
  if (
    hasMarketIntelligenceSignal(sources) &&
    sources.marketAgreementScore < LOW_MARKET_AGREEMENT_THRESHOLD
  ) {
    gatesApplied.push("low_market_agreement");
  }
  if (
    hasMarketIntelligenceSignal(sources) &&
    sources.marketPriceSpread != null &&
    sources.marketPriceSpread >= HIGH_MARKET_SPREAD_THRESHOLD
  ) {
    gatesApplied.push("high_market_spread");
  }
  if (hasMarketIntelligenceSignal(sources) && sources.marketPriceConfidence < WEAK_MARKET_PRICE_CONFIDENCE_THRESHOLD) {
    gatesApplied.push("weak_market_price_confidence");
  }
  if (
    hasMarketIntelligenceSignal(sources) &&
    sources.marketAvailabilityConfidence < WEAK_MARKET_AVAILABILITY_CONFIDENCE_THRESHOLD
  ) {
    gatesApplied.push("weak_market_availability_confidence");
  }

  if (hasMerchantReliabilityEvidence(sources) && sources.merchantReliabilityScore < UNRELIABLE_MERCHANT_THRESHOLD) {
    gatesApplied.push("unreliable_merchant");
  }
  if (hasMerchantReliabilityEvidence(sources) && sources.merchantVolatilityScore >= HIGH_VOLATILITY_THRESHOLD) {
    gatesApplied.push("highly_volatile_merchant");
  }
  if (
    hasMerchantReliabilityEvidence(sources) &&
    sources.merchantAvailabilityReliability < POOR_AVAILABILITY_RELIABILITY_THRESHOLD
  ) {
    gatesApplied.push("poor_merchant_availability_reliability");
  }
  if (
    hasMerchantReliabilityEvidence(sources) &&
    (sources.merchantFreshnessReliability < STALE_FRESHNESS_RELIABILITY_THRESHOLD ||
      sources.merchantState === "STALE")
  ) {
    gatesApplied.push("stale_merchant_observations");
  }
  if (
    hasMerchantReliabilityEvidence(sources) &&
    sources.merchantPricingReliability < POOR_PRICING_RELIABILITY_THRESHOLD
  ) {
    gatesApplied.push("abnormal_merchant_pricing");
  }

  if (
    hasProductIntelligenceEvidence(sources) &&
    sources.overallProductConfidence < WEAK_OVERALL_PRODUCT_CONFIDENCE_THRESHOLD
  ) {
    gatesApplied.push("weak_overall_product_confidence");
  }
  if (
    hasProductIntelligenceEvidence(sources) &&
    hasMarketIntelligenceSignal(sources) &&
    sources.productMarketConfidence < WEAK_PRODUCT_MARKET_CONFIDENCE_THRESHOLD
  ) {
    gatesApplied.push("weak_product_market_confidence");
  }
  if (
    hasProductIntelligenceEvidence(sources) &&
    hasMerchantReliabilityEvidence(sources) &&
    sources.productMerchantReliabilityConfidence < WEAK_PRODUCT_MERCHANT_CONFIDENCE_THRESHOLD
  ) {
    gatesApplied.push("weak_product_merchant_confidence");
  }
  if (
    hasProductIntelligenceEvidence(sources) &&
    sources.productTruthConfidence < WEAK_PRODUCT_TRUTH_CONFIDENCE_THRESHOLD
  ) {
    gatesApplied.push("weak_product_truth_confidence");
  }

  if (
    hasCommerceIntelligenceEvidence(sources) &&
    sources.commerceConfidence < WEAK_COMMERCE_CONFIDENCE_THRESHOLD
  ) {
    gatesApplied.push("weak_commerce_confidence");
  }
  if (
    hasCommerceIntelligenceEvidence(sources) &&
    hasMarketIntelligenceSignal(sources) &&
    sources.commerceMarketConfidence < WEAK_COMMERCE_MARKET_TRUTH_THRESHOLD
  ) {
    gatesApplied.push("weak_market_truth");
  }
  if (
    hasCommerceIntelligenceEvidence(sources) &&
    hasMerchantReliabilityEvidence(sources) &&
    sources.commerceMerchantConfidence < WEAK_COMMERCE_MERCHANT_TRUTH_THRESHOLD
  ) {
    gatesApplied.push("weak_merchant_truth");
  }
  if (
    hasCommerceIntelligenceEvidence(sources) &&
    sources.commerceProductConfidence < WEAK_COMMERCE_PRODUCT_TRUTH_THRESHOLD
  ) {
    gatesApplied.push("weak_product_truth");
  }

  if (
    hasCommerceReasoningEvidence(sources) &&
    sources.reasoningConfidence < WEAK_COMMERCE_REASONING_CONFIDENCE_THRESHOLD
  ) {
    gatesApplied.push("weak_commerce_reasoning");
  }
  if (hasCommerceReasoningEvidence(sources) && isHighPrimaryRisk(sources.primaryRisk)) {
    gatesApplied.push("primary_commerce_risk");
  }
  if (hasCommerceReasoningEvidence(sources) && isUncertainReasoningState(sources.reasoningState)) {
    gatesApplied.push("uncertain_commerce_reasoning");
  }

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
  const enteredAsBuyTier = isBuyTier(args.tier);

  const tc = truthBundle.truthConfidence;

  if (isBuyTier(tier) && (isStaleAvailabilityState(sources.availabilityState) || sources.listingAgeHours > STALE_LISTING_HOURS)) {
    gates.push("downgrade_stale_listing_24h");
    tier = downgradeTier(tier, "WAIT");
    verdict = "WAIT";
    confidence = Math.min(confidence, 62);
  }

  if (isBuyTier(tier) && isUnavailableAvailabilityState(sources.availabilityState)) {
    gates.push("downgrade_listing_unavailable");
    tier = downgradeTier(tier, "WAIT");
    verdict = "INSUFFICIENT DATA";
    confidence = Math.min(confidence, 52);
  }

  if (
    isBuyTier(tier) &&
    isUnknownAvailabilityState(sources.availabilityState) &&
    sources.availabilityFreshness < 50
  ) {
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

  if (
    isBuyTier(tier) &&
    sources.merchantCount >= MIN_MERCHANTS_FOR_CROSS_MERCHANT_GATES &&
    sources.listingPriceOutlier
  ) {
    gates.push("downgrade_cross_merchant_price_outlier");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 63);
  }

  if (isBuyTier(tier) && isConsensusConflict(sources.availabilityConsensus)) {
    gates.push("downgrade_cross_merchant_availability_conflict");
    tier = downgradeTier(tier, "WAIT");
    verdict = "WAIT";
    confidence = Math.min(confidence, 58);
  }

  if (
    isBuyTier(tier) &&
    sources.merchantCount >= MIN_MERCHANTS_FOR_CROSS_MERCHANT_GATES &&
    sources.merchantAgreementScore < WEAK_MERCHANT_AGREEMENT_THRESHOLD
  ) {
    gates.push("downgrade_weak_cross_merchant_agreement");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 61);
  }

  if (isBuyTier(tier) && hasMarketIntelligenceSignal(sources) && sources.marketDepth < THIN_MARKET_DEPTH_THRESHOLD) {
    gates.push("downgrade_thin_market_depth");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 60);
  }

  if (
    isBuyTier(tier) &&
    hasMarketIntelligenceSignal(sources) &&
    sources.marketAgreementScore < LOW_MARKET_AGREEMENT_THRESHOLD
  ) {
    gates.push("downgrade_low_market_agreement");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 59);
  }

  if (
    isBuyTier(tier) &&
    hasMarketIntelligenceSignal(sources) &&
    sources.marketPriceSpread != null &&
    sources.marketPriceSpread >= HIGH_MARKET_SPREAD_THRESHOLD
  ) {
    gates.push("downgrade_high_market_spread");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 57);
  }

  if (
    isBuyTier(tier) &&
    hasMarketIntelligenceSignal(sources) &&
    sources.marketPriceConfidence < WEAK_MARKET_PRICE_CONFIDENCE_THRESHOLD
  ) {
    gates.push("downgrade_weak_market_price_confidence");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 58);
  }

  if (
    isBuyTier(tier) &&
    hasMarketIntelligenceSignal(sources) &&
    sources.marketAvailabilityConfidence < WEAK_MARKET_AVAILABILITY_CONFIDENCE_THRESHOLD
  ) {
    gates.push("downgrade_weak_market_availability_confidence");
    tier = downgradeTier(tier, "WAIT");
    verdict = "WAIT";
    confidence = Math.min(confidence, 56);
  }

  if (isBuyTier(tier) && hasMerchantReliabilityEvidence(sources) && sources.merchantReliabilityScore < UNRELIABLE_MERCHANT_THRESHOLD) {
    gates.push("downgrade_unreliable_merchant");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 55);
  }

  if (isBuyTier(tier) && hasMerchantReliabilityEvidence(sources) && sources.merchantVolatilityScore >= HIGH_VOLATILITY_THRESHOLD) {
    gates.push("downgrade_highly_volatile_merchant");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 54);
  }

  if (
    isBuyTier(tier) &&
    hasMerchantReliabilityEvidence(sources) &&
    sources.merchantAvailabilityReliability < POOR_AVAILABILITY_RELIABILITY_THRESHOLD
  ) {
    gates.push("downgrade_poor_merchant_availability_reliability");
    tier = downgradeTier(tier, "WAIT");
    verdict = "WAIT";
    confidence = Math.min(confidence, 53);
  }

  if (
    isBuyTier(tier) &&
    hasMerchantReliabilityEvidence(sources) &&
    (sources.merchantFreshnessReliability < STALE_FRESHNESS_RELIABILITY_THRESHOLD ||
      sources.merchantState === "STALE")
  ) {
    gates.push("downgrade_stale_merchant_observations");
    tier = downgradeTier(tier, "WAIT");
    verdict = "WAIT";
    confidence = Math.min(confidence, 52);
  }

  if (
    isBuyTier(tier) &&
    hasMerchantReliabilityEvidence(sources) &&
    sources.merchantPricingReliability < POOR_PRICING_RELIABILITY_THRESHOLD
  ) {
    gates.push("downgrade_abnormal_merchant_pricing");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 51);
  }

  if (
    enteredAsBuyTier &&
    hasProductIntelligenceEvidence(sources) &&
    sources.overallProductConfidence < WEAK_OVERALL_PRODUCT_CONFIDENCE_THRESHOLD
  ) {
    gates.push("downgrade_weak_overall_product_confidence");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 50);
  }

  if (
    enteredAsBuyTier &&
    hasProductIntelligenceEvidence(sources) &&
    hasMarketIntelligenceSignal(sources) &&
    sources.productMarketConfidence < WEAK_PRODUCT_MARKET_CONFIDENCE_THRESHOLD
  ) {
    gates.push("downgrade_weak_product_market_confidence");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 49);
  }

  if (
    enteredAsBuyTier &&
    hasProductIntelligenceEvidence(sources) &&
    hasMerchantReliabilityEvidence(sources) &&
    sources.productMerchantReliabilityConfidence < WEAK_PRODUCT_MERCHANT_CONFIDENCE_THRESHOLD
  ) {
    gates.push("downgrade_weak_product_merchant_confidence");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 48);
  }

  if (
    enteredAsBuyTier &&
    hasProductIntelligenceEvidence(sources) &&
    sources.productTruthConfidence < WEAK_PRODUCT_TRUTH_CONFIDENCE_THRESHOLD
  ) {
    gates.push("downgrade_weak_product_truth_confidence");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 47);
  }

  if (
    enteredAsBuyTier &&
    hasCommerceIntelligenceEvidence(sources) &&
    sources.commerceConfidence < WEAK_COMMERCE_CONFIDENCE_THRESHOLD
  ) {
    gates.push("downgrade_weak_commerce_confidence");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 46);
  }

  if (
    enteredAsBuyTier &&
    hasCommerceIntelligenceEvidence(sources) &&
    hasMarketIntelligenceSignal(sources) &&
    sources.commerceMarketConfidence < WEAK_COMMERCE_MARKET_TRUTH_THRESHOLD
  ) {
    gates.push("downgrade_weak_market_truth");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 45);
  }

  if (
    enteredAsBuyTier &&
    hasCommerceIntelligenceEvidence(sources) &&
    hasMerchantReliabilityEvidence(sources) &&
    sources.commerceMerchantConfidence < WEAK_COMMERCE_MERCHANT_TRUTH_THRESHOLD
  ) {
    gates.push("downgrade_weak_merchant_truth");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 44);
  }

  if (
    enteredAsBuyTier &&
    hasCommerceIntelligenceEvidence(sources) &&
    sources.commerceProductConfidence < WEAK_COMMERCE_PRODUCT_TRUTH_THRESHOLD
  ) {
    gates.push("downgrade_weak_product_truth");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 43);
  }

  if (
    enteredAsBuyTier &&
    hasCommerceReasoningEvidence(sources) &&
    sources.reasoningConfidence < WEAK_COMMERCE_REASONING_CONFIDENCE_THRESHOLD
  ) {
    gates.push("downgrade_weak_commerce_reasoning");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 42);
  }

  if (enteredAsBuyTier && hasCommerceReasoningEvidence(sources) && isHighPrimaryRisk(sources.primaryRisk)) {
    gates.push("downgrade_primary_commerce_risk");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 41);
  }

  if (
    enteredAsBuyTier &&
    hasCommerceReasoningEvidence(sources) &&
    isUncertainReasoningState(sources.reasoningState)
  ) {
    gates.push("downgrade_reasoning_uncertainty");
    tier = downgradeTier(tier, "COMPARE");
    verdict = "COMPARE";
    confidence = Math.min(confidence, 40);
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
        "phase1e_truth_foundation",
        `phase1e_availability_${(intel.truthFoundation?.availabilityState ?? "unknown").toLowerCase()}`,
        "phase1f_cross_merchant_truth",
        `phase1f_consensus_${(truthBundle.sources.availabilityConsensus ?? "unknown").toLowerCase()}`,
        `phase1f_merchants_${truthBundle.sources.merchantCount}`,
        "phase1g_market_intelligence",
        `phase1g_market_depth_${truthBundle.sources.marketDepth}`,
        `phase1g_market_agreement_${truthBundle.sources.marketAgreementScore}`,
        "phase1h_merchant_reliability",
        `phase1h_merchant_state_${(truthBundle.sources.merchantState ?? "unknown").toLowerCase()}`,
        `phase1h_merchant_reliability_${truthBundle.sources.merchantReliabilityScore}`,
        "phase1i_product_intelligence",
        `phase1i_intelligence_state_${(truthBundle.sources.intelligenceState ?? "unknown").toLowerCase()}`,
        `phase1i_overall_confidence_${truthBundle.sources.overallProductConfidence}`,
        "phase1j_commerce_intelligence",
        `phase1j_commerce_state_${(truthBundle.sources.commerceState ?? "unknown").toLowerCase()}`,
        `phase1j_commerce_confidence_${truthBundle.sources.commerceConfidence}`,
        "phase1k_commerce_reasoning",
        `phase1k_reasoning_state_${(truthBundle.sources.reasoningState ?? "unknown").toLowerCase()}`,
        `phase1k_reasoning_confidence_${truthBundle.sources.reasoningConfidence}`,
        `phase1k_primary_risk_${(truthBundle.sources.primaryRisk ?? "none").toLowerCase()}`,
        "phase1d5_truth_gate",
        `phase1d5_truth_confidence_${Math.round(gated.truthConfidence * 100)}`,
        `phase1d5_discount_${(truthBundle.sources.discountVerificationState ?? "none").toLowerCase()}`,
        ...gated.gatesApplied.map((g) => `phase1d5_gate_${g}`),
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}
