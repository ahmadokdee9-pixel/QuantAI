/**
 * Phase 41 — Evidence-Based Confidence Engine.
 * Confidence reflects evidence bands — not rank alone.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { BillionDollarDiscountIntelligence } from "@/lib/intelligence/billionDollarDiscountEngine";
import type { GlobalCategoryIntelligence } from "@/lib/intelligence/globalCategoryIntelligenceEngine";
import type { MarketBreadthIntelligence } from "@/lib/intelligence/marketBreadthEngine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";

export type EvidenceConfidence = {
  version: 1;
  confidence: number;
  band: "verified_deal" | "strong_buy" | "good_compare" | "weak_uncertain" | "avoid_wait";
  reason: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Map evidence to confidence bands per Phase 41 rules. */
export function computeEvidenceConfidence(args: {
  verdict: PrimaryVerdict;
  merchantTrust: MerchantTrustSignal;
  categoryIntel: GlobalCategoryIntelligence;
  discount: BillionDollarDiscountIntelligence;
  breadth: MarketBreadthIntelligence;
  opportunityScore: number;
  imageConfidence?: number;
  link: string;
}): EvidenceConfidence {
  const { verdict, merchantTrust, categoryIntel, discount, breadth, opportunityScore, imageConfidence = 60, link } =
    args;

  let raw =
    merchantTrust.trustScore * 0.22 +
    categoryIntel.categoryFitScore * 0.18 +
    opportunityScore * 0.2 +
    (discount.labels.includes("REAL DISCOUNT") ? 12 : 0) +
    (discount.labels.includes("FAKE DISCOUNT RISK") ? -15 : 0) +
    (breadth.feelsComprehensive ? 6 : 0) +
    imageConfidence * 0.06;

  if (discount.labels.includes("BEST DEAL FOUND")) raw += 10;
  if (discount.labels.includes("OVERPRICED")) raw -= 12;
  if (merchantTrust.trustScore < 45) raw -= 18;

  let hash = 0;
  for (let i = 0; i < link.length; i++) hash = (hash * 31 + link.charCodeAt(i)) >>> 0;
  raw += (hash % 5) - 2;

  let band: EvidenceConfidence["band"] = "weak_uncertain";
  let confidence = clamp(Math.round(raw), 45, 64);

  if (verdict === "AVOID" || verdict === "INSUFFICIENT DATA") {
    band = "avoid_wait";
    confidence = clamp(Math.round(raw * 0.6), 20, 44);
  } else if (verdict === "WAIT") {
    band = "avoid_wait";
    confidence = clamp(Math.round(raw * 0.75), 30, 55);
  } else if (raw >= 88 && merchantTrust.trustScore >= 75 && !discount.labels.includes("FAKE DISCOUNT RISK")) {
    band = "verified_deal";
    confidence = clamp(Math.round(raw), 95, 100);
  } else if (raw >= 72 && verdict === "BUY READY") {
    band = "strong_buy";
    confidence = clamp(Math.round(raw), 80, 94);
  } else if (raw >= 58) {
    band = "good_compare";
    confidence = clamp(Math.round(raw), 65, 79);
  }

  if (verdict === "BUY READY" && confidence < 70) confidence = 70;
  if (verdict === "COMPARE" && confidence > 79) confidence = 79;

  return {
    version: 1,
    confidence,
    band,
    reason: `Confidence ${confidence}% (${band.replace(/_/g, " ")}) from trust, category fit, discount validation, and market breadth.`,
  };
}
