/**
 * Phase 1J — Universal commerce intelligence core.
 * Fuses Phase 1 truth pillars into a single commerce decision snapshot.
 */

import type { ProductIntelligenceSnapshot } from "@/lib/truth/productIntelligenceFoundation";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type CommerceIntelligenceState =
  | "COMMERCE_STRONG"
  | "COMMERCE_GOOD"
  | "COMMERCE_CAUTION"
  | "COMMERCE_WEAK"
  | "COMMERCE_UNKNOWN";

export type CommerceIntelligenceSnapshot = {
  productConfidence: number;
  marketConfidence: number;
  merchantConfidence: number;
  priceConfidence: number;
  availabilityConfidence: number;
  discountConfidence: number;
  commerceConfidence: number;
  commerceState: CommerceIntelligenceState;
};

export type CommerceIntelligenceInput = Omit<
  TruthFoundationSnapshot,
  "commerceIntelligence" | "commerceReasoning" | "evidenceReasoningGraph"
>;

export const WEAK_COMMERCE_CONFIDENCE_THRESHOLD = 52;
export const WEAK_COMMERCE_MARKET_TRUTH_THRESHOLD = 45;
export const WEAK_COMMERCE_MERCHANT_TRUTH_THRESHOLD = 45;
export const WEAK_COMMERCE_PRODUCT_TRUTH_THRESHOLD = 48;

const COMMERCE_WEIGHTS = {
  product: 0.22,
  market: 0.2,
  merchant: 0.16,
  price: 0.18,
  availability: 0.12,
  discount: 0.12,
} as const;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function resolveProductIntelligence(foundation: CommerceIntelligenceInput): ProductIntelligenceSnapshot {
  return foundation.productIntelligence;
}

function deriveCommerceState(args: {
  canonicalSkuId: string | null;
  commerceConfidence: number;
  productConfidence: number;
  marketConfidence: number;
  merchantConfidence: number;
}): CommerceIntelligenceState {
  if (!args.canonicalSkuId || args.commerceConfidence < 30) {
    return "COMMERCE_UNKNOWN";
  }
  if (args.commerceConfidence >= 78 && args.productConfidence >= 65 && args.marketConfidence >= 55) {
    return "COMMERCE_STRONG";
  }
  if (args.commerceConfidence >= 65) {
    return "COMMERCE_GOOD";
  }
  if (args.commerceConfidence >= WEAK_COMMERCE_CONFIDENCE_THRESHOLD) {
    return "COMMERCE_CAUTION";
  }
  if (args.commerceConfidence >= 30) {
    return "COMMERCE_WEAK";
  }
  return "COMMERCE_UNKNOWN";
}

export function hasCommerceIntelligenceSignal(snapshot: CommerceIntelligenceSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.commerceConfidence >= 0);
}

/** Build unified commerce intelligence snapshot from truth foundation + product intelligence. */
export function buildUniversalCommerceIntelligence(
  foundation: CommerceIntelligenceInput
): CommerceIntelligenceSnapshot {
  const product = resolveProductIntelligence(foundation);

  const productConfidence = clampScore(product.overallProductConfidence);
  const marketConfidence = clampScore(product.marketConfidence);
  const merchantConfidence = clampScore(product.merchantReliabilityConfidence);
  const priceConfidence = clampScore(product.priceTruthConfidence);
  const availabilityConfidence = clampScore(product.availabilityConfidence);
  const discountConfidence = clampScore(product.discountConfidence);

  const commerceConfidence = clampScore(
    productConfidence * COMMERCE_WEIGHTS.product +
      marketConfidence * COMMERCE_WEIGHTS.market +
      merchantConfidence * COMMERCE_WEIGHTS.merchant +
      priceConfidence * COMMERCE_WEIGHTS.price +
      availabilityConfidence * COMMERCE_WEIGHTS.availability +
      discountConfidence * COMMERCE_WEIGHTS.discount
  );

  const commerceState = deriveCommerceState({
    canonicalSkuId: foundation.canonicalSkuId,
    commerceConfidence,
    productConfidence,
    marketConfidence,
    merchantConfidence,
  });

  return {
    productConfidence,
    marketConfidence,
    merchantConfidence,
    priceConfidence,
    availabilityConfidence,
    discountConfidence,
    commerceConfidence,
    commerceState,
  };
}
