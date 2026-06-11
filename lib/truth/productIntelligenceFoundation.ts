/**
 * Phase 1I — Universal product intelligence foundation.
 * Consolidates Phase 1 truth systems into a single product-level snapshot.
 */

import type { DiscountVerificationState } from "@/lib/truth/priceHistoryTypes";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type ProductIntelligenceFoundationInput = Omit<
  TruthFoundationSnapshot,
  "productIntelligence" | "commerceIntelligence" | "commerceReasoning" | "evidenceReasoningGraph" | "trustEngine" | "decisionEngine" | "intentEngine" | "intentRetrieval" | "productMatch" | "productReasoning" | "recommendationIntelligence" | "explainableAI" | "conversationalIntent" | "tastePreference" | "userDecisionIntelligence" | "purchaseMotivation" | "purchaseConstraints"
>;

export type ProductIntelligenceState =
  | "PRODUCT_CONFIDENT"
  | "PRODUCT_CAUTION"
  | "PRODUCT_WEAK"
  | "PRODUCT_UNKNOWN";

export type ProductIntelligenceSnapshot = {
  canonicalSkuId: string;
  skuIdentityConfidence: number;
  availabilityConfidence: number;
  priceTruthConfidence: number;
  discountConfidence: number;
  merchantReliabilityConfidence: number;
  marketConfidence: number;
  overallProductConfidence: number;
  intelligenceState: ProductIntelligenceState;
};

export const WEAK_OVERALL_PRODUCT_CONFIDENCE_THRESHOLD = 52;
export const WEAK_PRODUCT_MARKET_CONFIDENCE_THRESHOLD = 45;
export const WEAK_PRODUCT_MERCHANT_CONFIDENCE_THRESHOLD = 45;
export const WEAK_PRODUCT_TRUTH_CONFIDENCE_THRESHOLD = 48;

const OVERALL_WEIGHTS = {
  skuIdentity: 0.16,
  availability: 0.14,
  priceTruth: 0.18,
  discount: 0.1,
  merchantReliability: 0.16,
  market: 0.26,
} as const;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function computeAvailabilityConfidence(foundation: ProductIntelligenceFoundationInput): number {
  const { availabilityState, availability } = foundation;
  let score = 50;

  switch (availabilityState) {
    case "AVAILABLE":
      score = availability.freshnessScore >= 80 ? 88 : availability.freshnessScore >= 50 ? 72 : 58;
      break;
    case "STALE":
      score = 42;
      break;
    case "UNAVAILABLE":
      score = 24;
      break;
    case "UNKNOWN":
    default:
      score = availability.freshnessScore >= 50 ? 46 : 36;
      break;
  }

  return clampScore(score);
}

function computeDiscountConfidence(foundation: ProductIntelligenceFoundationInput): number {
  const state: DiscountVerificationState | null = foundation.discountEvidence?.state ?? null;
  if (foundation.priceTruth?.fakeDiscount.isFake) return 12;

  switch (state) {
    case "VERIFIED_DISCOUNT":
      return 86;
    case "POSSIBLE_DISCOUNT":
      return 62;
    case "UNVERIFIED_DISCOUNT":
      return 38;
    case "NO_DISCOUNT":
      return 58;
    default:
      return foundation.priceTruthConfidence >= 55 ? 52 : 44;
  }
}

function computeMarketConfidence(foundation: ProductIntelligenceFoundationInput): number {
  const market = foundation.marketIntelligence;
  if (!market) return 0;
  const depthBoost = market.marketDepth >= 50 ? 8 : market.marketDepth >= 30 ? 2 : -6;

  const blended =
    market.marketCoverage * 0.22 +
    market.marketAgreementScore * 0.24 +
    market.marketPriceConfidence * 0.28 +
    market.marketAvailabilityConfidence * 0.26 +
    depthBoost;

  if (foundation.listingPriceOutlier) return clampScore(blended - 14);
  return clampScore(blended);
}

function computeOverallProductConfidence(args: {
  skuIdentityConfidence: number;
  availabilityConfidence: number;
  priceTruthConfidence: number;
  discountConfidence: number;
  merchantReliabilityConfidence: number;
  marketConfidence: number;
}): number {
  const weighted =
    args.skuIdentityConfidence * OVERALL_WEIGHTS.skuIdentity +
    args.availabilityConfidence * OVERALL_WEIGHTS.availability +
    args.priceTruthConfidence * OVERALL_WEIGHTS.priceTruth +
    args.discountConfidence * OVERALL_WEIGHTS.discount +
    args.merchantReliabilityConfidence * OVERALL_WEIGHTS.merchantReliability +
    args.marketConfidence * OVERALL_WEIGHTS.market;

  return clampScore(weighted);
}

function deriveIntelligenceState(args: {
  canonicalSkuId: string | null;
  overallProductConfidence: number;
  skuIdentityConfidence: number;
  availabilityConfidence: number;
  priceTruthConfidence: number;
  marketConfidence: number;
  merchantReliabilityConfidence: number;
}): ProductIntelligenceState {
  if (!args.canonicalSkuId || args.overallProductConfidence < 30) {
    return "PRODUCT_UNKNOWN";
  }

  if (args.overallProductConfidence < WEAK_OVERALL_PRODUCT_CONFIDENCE_THRESHOLD) {
    return "PRODUCT_WEAK";
  }

  const weakPillar =
    args.skuIdentityConfidence < 45 ||
    args.availabilityConfidence < 45 ||
    args.priceTruthConfidence < 45 ||
    args.marketConfidence < WEAK_PRODUCT_MARKET_CONFIDENCE_THRESHOLD ||
    args.merchantReliabilityConfidence < WEAK_PRODUCT_MERCHANT_CONFIDENCE_THRESHOLD;

  if (args.overallProductConfidence >= 72 && !weakPillar) {
    return "PRODUCT_CONFIDENT";
  }

  return "PRODUCT_CAUTION";
}

/** Composite truth confidence from SKU, price, and discount pillars (0–100). */
export function computeProductTruthConfidence(snapshot: ProductIntelligenceSnapshot): number {
  return clampScore(
    snapshot.skuIdentityConfidence * 0.28 +
      snapshot.priceTruthConfidence * 0.42 +
      snapshot.discountConfidence * 0.3
  );
}

export function hasProductIntelligenceSignal(snapshot: ProductIntelligenceSnapshot | null | undefined): boolean {
  return Boolean(snapshot?.canonicalSkuId);
}

/** Build unified product intelligence snapshot from truth foundation inputs. */
export function buildProductIntelligenceFoundation(
  foundation: ProductIntelligenceFoundationInput
): ProductIntelligenceSnapshot {
  const skuIdentityConfidence = clampScore(foundation.skuIdentityConfidence);
  const availabilityConfidence = computeAvailabilityConfidence(foundation);
  const priceTruthConfidence = clampScore(foundation.priceTruthConfidence);
  const discountConfidence = computeDiscountConfidence(foundation);
  const merchantReliabilityConfidence = clampScore(
    foundation.merchantReliability?.merchantReliabilityScore ?? 0
  );
  const marketConfidence = computeMarketConfidence(foundation);

  const overallProductConfidence = computeOverallProductConfidence({
    skuIdentityConfidence,
    availabilityConfidence,
    priceTruthConfidence,
    discountConfidence,
    merchantReliabilityConfidence,
    marketConfidence,
  });

  const intelligenceState = deriveIntelligenceState({
    canonicalSkuId: foundation.canonicalSkuId,
    overallProductConfidence,
    skuIdentityConfidence,
    availabilityConfidence,
    priceTruthConfidence,
    marketConfidence,
    merchantReliabilityConfidence,
  });

  return {
    canonicalSkuId: foundation.canonicalSkuId ?? "unknown",
    skuIdentityConfidence,
    availabilityConfidence,
    priceTruthConfidence,
    discountConfidence,
    merchantReliabilityConfidence,
    marketConfidence,
    overallProductConfidence,
    intelligenceState,
  };
}
