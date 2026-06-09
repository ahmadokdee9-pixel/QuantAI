/**
 * Phase 45 — Discount Confidence Engine.
 * Confidence-scored discount verification — no weak promotional wording.
 */

import type { RealDiscountProof } from "@/lib/intelligence/realDiscountProofEngine";
import type { CommercePriceHistoryIntelligence } from "@/lib/intelligence/commercePriceHistoryEngine";
import type { QuantProduct } from "@/lib/shoppingScore";

export type DiscountConfidenceLabel =
  | "Weak Discount Signal"
  | "Discount Signal"
  | "Strong Discount Signal"
  | "Exceptional Discount Signal";

export type DiscountConfidenceIntelligence = {
  version: 1;
  discountConfidence: number;
  label: DiscountConfidenceLabel;
  historicalEvidence: number;
  merchantConsistency: number;
  priceAnomalyScore: number;
  categoryAverageSignal: number;
  allowsPromotionalWording: boolean;
  displayLine: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function labelForConfidence(score: number, verified: boolean): DiscountConfidenceLabel {
  if (!verified || score < 55) return "Weak Discount Signal";
  if (score >= 88) return "Exceptional Discount Signal";
  if (score >= 72) return "Strong Discount Signal";
  return "Discount Signal";
}

/** Upgrade discount verification with confidence scoring. */
export function computeDiscountConfidence(args: {
  product: QuantProduct;
  discountProof?: RealDiscountProof;
  priceHistory?: CommercePriceHistoryIntelligence;
  categoryMedianPrice?: number;
  merchantTrustScore?: number;
}): DiscountConfidenceIntelligence {
  const { product, discountProof, priceHistory, categoryMedianPrice, merchantTrustScore = 70 } = args;

  const verified = discountProof?.verified === true && !discountProof?.band.includes("Fake");
  const fake = discountProof?.band.includes("Fake") ?? false;

  let historicalEvidence = 50;
  if (priceHistory?.label === "Historical Low") historicalEvidence = 92;
  else if (priceHistory?.label === "Great Price") historicalEvidence = 82;
  else if (priceHistory?.historicalHigh && priceHistory.historicalHigh > product.price) historicalEvidence = 74;
  else if (product.oldPrice && product.oldPrice > product.price) historicalEvidence = 66;

  let merchantConsistency = clamp(Math.round(merchantTrustScore * 0.55 + (verified ? 20 : 0)), 0, 100);

  let priceAnomalyScore = 70;
  if (fake) priceAnomalyScore = 15;
  else if (product.oldPrice && product.oldPrice > product.price * 1.8) priceAnomalyScore = 25;
  else if (discountProof?.marketMedianDifferencePct && discountProof.marketMedianDifferencePct > 5) priceAnomalyScore = 82;

  const median = categoryMedianPrice ?? product.price;
  let categoryAverageSignal = 50;
  if (median > 0 && product.price < median) {
    categoryAverageSignal = clamp(Math.round(50 + ((median - product.price) / median) * 80), 0, 100);
  }

  const discountConfidence = clamp(
    Math.round(
      (discountProof?.discountAuthenticityScore ?? 50) * 0.35 +
        historicalEvidence * 0.25 +
        merchantConsistency * 0.15 +
        priceAnomalyScore * 0.15 +
        categoryAverageSignal * 0.1
    ),
    0,
    100
  );

  const label = fake ? "Weak Discount Signal" : labelForConfidence(discountConfidence, verified);
  const allowsPromotionalWording = !fake && discountConfidence >= 70 && verified;

  const displayLine = allowsPromotionalWording
    ? `${label} — ${discountConfidence}% discount signal strength from search-sample and category cues.`
    : fake
      ? "Discount signal too weak for promotional wording."
      : `${label} — evidence still building (${discountConfidence}% signal strength).`;

  return {
    version: 1,
    discountConfidence,
    label,
    historicalEvidence,
    merchantConsistency,
    priceAnomalyScore,
    categoryAverageSignal,
    allowsPromotionalWording,
    displayLine,
  };
}
