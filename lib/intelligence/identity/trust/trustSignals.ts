/**
 * Phase 4 — Trust-native deterministic signals (preparation for trust ranking).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { TrustSignalBundle } from "../types";
import type { MerchantOfferLink } from "../types";
import { detectIdentityFakeDiscount } from "../pricing/fakeDiscountDetector";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function computeTrustSignals(
  commerceId: string,
  offers: MerchantOfferLink[],
  sampleProduct: QuantProduct,
  tray: QuantProduct[]
): TrustSignalBundle {
  const explanations: string[] = [];
  const trustScores = offers.map((o) => o.trustScore);
  const avgTrust = trustScores.length
    ? trustScores.reduce((a, b) => a + b, 0) / trustScores.length
    : 50;
  const spread =
    trustScores.length > 1 ? Math.max(...trustScores) - Math.min(...trustScores) : 0;
  const merchantConsistency01 = round4(clamp01(1 - spread / 100));

  const fake = detectIdentityFakeDiscount(sampleProduct, tray);
  const suspiciousDiscountSpike01 = round4(
    clamp01(fake.historicalDiscountSpike01 * 0.6 + fake.fakeDiscountProbability * 0.4)
  );
  const fakeMsrpPattern01 = round4(fake.suspiciousMsrpSpike01);

  const dupRisk = offers.length
    ? offers.reduce((s, o) => s + o.duplicateSellerRisk, 0) / offers.length
    : 0;
  const duplicateSellerIdentity01 = round4(clamp01(dupRisk));

  const warehouseConfidence01 = offers.length
    ? round4(offers.reduce((s, o) => s + o.warehouseConfidence, 0) / offers.length)
    : 0.5;

  if (merchantConsistency01 < 0.7) explanations.push("merchant_trust_spread");
  if (suspiciousDiscountSpike01 >= 0.45) explanations.push("suspicious_discount_spike");
  if (fakeMsrpPattern01 >= 0.4) explanations.push("fake_msrp_pattern");
  if (duplicateSellerIdentity01 >= 0.35) explanations.push("duplicate_seller_listings");
  if (warehouseConfidence01 < 0.55) explanations.push("low_warehouse_confidence");
  if (avgTrust < 60) explanations.push("low_average_merchant_trust");

  return {
    merchantConsistency01,
    suspiciousDiscountSpike01,
    fakeMsrpPattern01,
    duplicateSellerIdentity01,
    warehouseConfidence01,
    explanations,
  };
}
