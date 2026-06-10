/**
 * Phase 1K — Autonomous commerce reasoning layer.
 * Fuses Phase 1 intelligence into structured WHY signals for downgrade-only gates.
 */

import { isConsensusConflict } from "@/lib/truth/availabilityConsensusModel";
import {
  isStaleAvailabilityState,
  isUnavailableAvailabilityState,
  isUnknownAvailabilityState,
} from "@/lib/truth/availabilityStateModel";
import { THIN_MARKET_DEPTH_THRESHOLD } from "@/lib/truth/marketTruthRollup";
import {
  HIGH_VOLATILITY_THRESHOLD,
  UNRELIABLE_MERCHANT_THRESHOLD,
} from "@/lib/truth/merchantReliabilityTruth";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type CommerceReasoningState =
  | "COMMERCE_REASONING_STRONG"
  | "COMMERCE_REASONING_GOOD"
  | "COMMERCE_REASONING_CAUTION"
  | "COMMERCE_REASONING_WEAK"
  | "COMMERCE_REASONING_UNKNOWN";

export type CommerceReasoningSnapshot = {
  primaryRisk: string;
  secondaryRisk: string;
  strongestPositiveSignal: string;
  strongestNegativeSignal: string;
  reasoningConfidence: number;
  reasoningState: CommerceReasoningState;
};

export type CommerceReasoningInput = Omit<TruthFoundationSnapshot, "commerceReasoning" | "evidenceReasoningGraph" | "trustEngine" | "decisionEngine" | "intentEngine" | "intentRetrieval" | "productMatch" | "productReasoning" | "recommendationIntelligence">;

export const WEAK_COMMERCE_REASONING_CONFIDENCE_THRESHOLD = 52;
export const HIGH_PRIMARY_RISK_SIGNALS = new Set([
  "fake_discount_risk",
  "listing_unavailable",
  "unreliable_merchant",
  "weak_sku_identity",
  "consensus_conflict",
  "price_outlier",
  "highly_volatile_merchant",
]);

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

type ReasoningSignal = {
  key: string;
  label: string;
  severity: number;
};

function collectNegativeSignals(foundation: CommerceReasoningInput): ReasoningSignal[] {
  const signals: ReasoningSignal[] = [];
  const commerce = foundation.commerceIntelligence;
  const product = foundation.productIntelligence;
  const merchant = foundation.merchantReliability;
  const market = foundation.marketIntelligence;

  if (foundation.skuIdentityConfidence < 55) {
    signals.push({ key: "weak_sku_identity", label: "Weak SKU identity match", severity: 78 - foundation.skuIdentityConfidence });
  }
  if (foundation.priceTruthConfidence < 45) {
    signals.push({ key: "weak_price_truth", label: "Weak historical price truth", severity: 70 - foundation.priceTruthConfidence });
  }
  if (foundation.priceTruth?.fakeDiscount.isFake) {
    signals.push({ key: "fake_discount_risk", label: "Fake discount pattern detected", severity: 92 });
  }
  if (isUnavailableAvailabilityState(foundation.availabilityState)) {
    signals.push({ key: "listing_unavailable", label: "Listing appears unavailable", severity: 95 });
  } else if (isStaleAvailabilityState(foundation.availabilityState) || foundation.availability.freshnessScore < 50) {
    signals.push({ key: "stale_availability", label: "Stale availability observation", severity: 68 });
  } else if (isUnknownAvailabilityState(foundation.availabilityState)) {
    signals.push({ key: "unknown_availability", label: "Availability state uncertain", severity: 58 });
  }
  if (isConsensusConflict(foundation.availabilityConsensus)) {
    signals.push({ key: "consensus_conflict", label: "Cross-merchant availability conflict", severity: 82 });
  }
  if (foundation.listingPriceOutlier) {
    signals.push({ key: "price_outlier", label: "Listing price is a market outlier", severity: 76 });
  }
  if (market.marketDepth < THIN_MARKET_DEPTH_THRESHOLD) {
    signals.push({ key: "thin_market_depth", label: "Thin cross-merchant market depth", severity: 64 });
  }
  if (market.marketAgreementScore < 55) {
    signals.push({ key: "weak_market_agreement", label: "Weak market price agreement", severity: 60 });
  }
  if (merchant.merchantReliabilityScore < UNRELIABLE_MERCHANT_THRESHOLD && foundation.merchantObservationCount >= 2) {
    signals.push({ key: "unreliable_merchant", label: "Unreliable merchant track record", severity: 80 });
  }
  if (merchant.merchantVolatilityScore >= HIGH_VOLATILITY_THRESHOLD && foundation.merchantObservationCount >= 2) {
    signals.push({ key: "highly_volatile_merchant", label: "Highly volatile merchant pricing", severity: 74 });
  }
  if (commerce.commerceConfidence < 52) {
    signals.push({ key: "weak_commerce_confidence", label: "Weak overall commerce confidence", severity: 66 });
  }
  if (product.overallProductConfidence < 52) {
    signals.push({ key: "weak_product_confidence", label: "Weak product intelligence confidence", severity: 62 });
  }
  if (
    foundation.baselineCoverage &&
    !foundation.baselineCoverage.sufficientForVerification &&
    (foundation.baselineCoverage.samples90d ?? 0) < 3
  ) {
    signals.push({ key: "insufficient_price_history", label: "Insufficient price history for verification", severity: 70 });
  }

  return signals.sort((a, b) => b.severity - a.severity);
}

function collectPositiveSignals(foundation: CommerceReasoningInput): ReasoningSignal[] {
  const signals: ReasoningSignal[] = [];
  const commerce = foundation.commerceIntelligence;
  const merchant = foundation.merchantReliability;
  const market = foundation.marketIntelligence;

  if (foundation.skuIdentityConfidence >= 78) {
    signals.push({ key: "strong_sku_identity", label: "Strong canonical SKU identity", severity: foundation.skuIdentityConfidence - 50 });
  }
  if (foundation.priceTruthConfidence >= 70) {
    signals.push({ key: "strong_price_truth", label: "Strong price truth trail", severity: foundation.priceTruthConfidence - 45 });
  }
  if (foundation.discountEvidence?.state === "VERIFIED_DISCOUNT" && !foundation.priceTruth?.fakeDiscount.isFake) {
    signals.push({ key: "verified_discount", label: "Verified discount against history", severity: 72 });
  }
  if (foundation.availabilityState === "AVAILABLE" && foundation.availability.freshnessScore >= 80) {
    signals.push({ key: "fresh_availability", label: "Fresh in-stock availability signal", severity: 68 });
  }
  if (foundation.availabilityConsensus === "CONSENSUS_AVAILABLE") {
    signals.push({ key: "market_consensus_available", label: "Cross-merchant availability consensus", severity: 64 });
  }
  if (market.marketDepth >= THIN_MARKET_DEPTH_THRESHOLD) {
    signals.push({ key: "strong_market_depth", label: "Strong cross-merchant market depth", severity: market.marketDepth - 40 });
  }
  if (merchant.merchantState === "RELIABLE") {
    signals.push({ key: "reliable_merchant", label: "Reliable merchant reliability profile", severity: 70 });
  }
  if (commerce.commerceConfidence >= 72) {
    signals.push({ key: "strong_commerce_confidence", label: "Strong unified commerce confidence", severity: commerce.commerceConfidence - 40 });
  }
  if (foundation.productIntelligence.intelligenceState === "PRODUCT_CONFIDENT") {
    signals.push({ key: "confident_product_intelligence", label: "Confident product intelligence rollup", severity: 66 });
  }

  return signals.sort((a, b) => b.severity - a.severity);
}

function deriveReasoningState(args: {
  canonicalSkuId: string | null;
  reasoningConfidence: number;
  commerceState: string;
  negativeCount: number;
}): CommerceReasoningState {
  if (!args.canonicalSkuId || args.reasoningConfidence < 30) {
    return "COMMERCE_REASONING_UNKNOWN";
  }
  if (args.reasoningConfidence >= 78 && args.negativeCount === 0 && args.commerceState === "COMMERCE_STRONG") {
    return "COMMERCE_REASONING_STRONG";
  }
  if (args.reasoningConfidence >= 65) {
    return "COMMERCE_REASONING_GOOD";
  }
  if (args.reasoningConfidence >= WEAK_COMMERCE_REASONING_CONFIDENCE_THRESHOLD) {
    return "COMMERCE_REASONING_CAUTION";
  }
  if (args.reasoningConfidence >= 30) {
    return "COMMERCE_REASONING_WEAK";
  }
  return "COMMERCE_REASONING_UNKNOWN";
}

function computeReasoningConfidence(args: {
  commerceConfidence: number;
  negativeSignals: ReasoningSignal[];
  positiveSignals: ReasoningSignal[];
}): number {
  const topNegative = args.negativeSignals[0]?.severity ?? 0;
  const topPositive = args.positiveSignals[0]?.severity ?? 0;
  const penalty = Math.min(36, topNegative * 0.35 + args.negativeSignals.length * 4);
  const boost = Math.min(18, topPositive * 0.2);
  return clampScore(args.commerceConfidence - penalty + boost);
}

export function hasCommerceReasoningSignal(snapshot: CommerceReasoningSnapshot | null | undefined): boolean {
  return Boolean(snapshot?.primaryRisk);
}

export function isHighPrimaryRisk(primaryRisk: string): boolean {
  return HIGH_PRIMARY_RISK_SIGNALS.has(primaryRisk);
}

/** Build structured commerce reasoning snapshot from fused intelligence layers. */
export function buildCommerceReasoningLayer(foundation: CommerceReasoningInput): CommerceReasoningSnapshot {
  const negativeSignals = collectNegativeSignals(foundation);
  const positiveSignals = collectPositiveSignals(foundation);

  const primaryRisk = negativeSignals[0]?.key ?? "none";
  const secondaryRisk = negativeSignals[1]?.key ?? "none";
  const strongestNegativeSignal = negativeSignals[0]?.label ?? "No major negative signal";
  const strongestPositiveSignal = positiveSignals[0]?.label ?? "Limited positive confirmation";

  const reasoningConfidence = computeReasoningConfidence({
    commerceConfidence: foundation.commerceIntelligence.commerceConfidence,
    negativeSignals,
    positiveSignals,
  });

  const reasoningState = deriveReasoningState({
    canonicalSkuId: foundation.canonicalSkuId,
    reasoningConfidence,
    commerceState: foundation.commerceIntelligence.commerceState,
    negativeCount: negativeSignals.length,
  });

  return {
    primaryRisk,
    secondaryRisk,
    strongestPositiveSignal,
    strongestNegativeSignal,
    reasoningConfidence,
    reasoningState,
  };
}
