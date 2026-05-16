/**
 * QuantAI deal authenticity — markdown confidence + retailer discount patterns (tray-local).
 */

import type { FakeDiscountRisk } from "@/lib/deals/types";
import type { QuantProduct } from "@/lib/shoppingScore";

export type DealAuthenticitySupplement = {
  fakeRisk: FakeDiscountRisk;
  /** 0–1 higher = more confident the markdown is real. */
  discountConfidence01: number;
  anchorInflationSuspected: boolean;
  /** 0–1 retailer “discount theater” pressure. */
  retailerDiscountPatternRisk01: number;
  summaryLine: string;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Uses existing fakeDiscountRisk outcome; avoids duplicate scoring work. */
export function supplementDealAuthenticity(
  product: QuantProduct,
  fake: FakeDiscountRisk,
  peerMedianExcluding: number,
  disc: number | null
): DealAuthenticitySupplement {
  const inflated =
    product.oldPrice != null &&
    peerMedianExcluding > 0 &&
    product.oldPrice > peerMedianExcluding * 1.34 &&
    (disc ?? 0) >= 10;

  let discountConfidence01 = fake === "low" ? 0.72 : fake === "medium" ? 0.48 : 0.22;
  if (inflated) discountConfidence01 *= 0.82;
  if ((disc ?? 0) >= 35 && fake === "high") discountConfidence01 *= 0.55;

  const blob = `${product.title} ${product.extensions.join(" ")}`.toLowerCase();
  let retailerDiscountPatternRisk01 = inflated ? 0.62 : 0.28;
  if (/\b(list|was|msrp|rrp)\s*[:]\s*\$?\d/i.test(blob) && (disc ?? 0) >= 40) retailerDiscountPatternRisk01 += 0.12;
  if (/\b\d{1,2}0%\s*off|\b\d{2,3}%\s*off\b/i.test(blob) && fake !== "low") retailerDiscountPatternRisk01 += 0.1;
  retailerDiscountPatternRisk01 = clamp01(retailerDiscountPatternRisk01);

  let summaryLine = "";
  if (fake === "high" || inflated) {
    summaryLine =
      "Authenticity: headline markdown is weakly corroborated—anchor inflation or peer mismatch is material.";
  } else if (fake === "medium") {
    summaryLine = "Authenticity: mixed—discount exists but peers/trust do not fully validate the story.";
  } else {
    summaryLine = "Authenticity: cleaner read versus this tray—still verify checkout total and SKU.";
  }

  return {
    fakeRisk: fake,
    discountConfidence01,
    anchorInflationSuspected: inflated,
    retailerDiscountPatternRisk01,
    summaryLine,
  };
}
