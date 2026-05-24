/**
 * Phase 5 — Trust-native ranking preparation signals (shadow only — NO qiRank mutation).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { MerchantOfferLink } from "@/lib/intelligence/identity/types";
import type { MerchantTrustProfile, PriceTruthProfile, TrustRankingPrepSignals } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function buildTrustRankingPrepSignals(args: {
  offer: MerchantOfferLink;
  merchant?: MerchantTrustProfile;
  priceTruth?: PriceTruthProfile;
  product?: QuantProduct;
}): TrustRankingPrepSignals {
  const baseTrust = args.offer.trustScore;
  const merchantReliabilityScore = round4(
    args.merchant
      ? args.merchant.reputationScore * 0.5 + args.merchant.consistencyScore * 50
      : baseTrust
  );
  const fakeDiscountRisk = round4(args.priceTruth?.fakeDiscountRisk01 ?? 0.2);
  const priceTruthScore = round4(args.priceTruth?.priceTruthScore ?? 70);
  const inventoryConfidence = round4(
    clamp01(
      args.offer.warehouseConfidence * 0.6 +
        (1 - (args.merchant?.fakeInventoryRisk01 ?? 0.2)) * 0.4
    ) * 100
  );
  const trustScore = round4(
    clamp01(
      baseTrust / 100 * 0.35 +
        merchantReliabilityScore / 100 * 0.25 +
        priceTruthScore / 100 * 0.25 +
        inventoryConfidence / 100 * 0.15
    ) * 100
  );

  return {
    trustScore,
    priceTruthScore,
    merchantReliabilityScore,
    fakeDiscountRisk,
    inventoryConfidence,
    rankingMutation: false,
  };
}
