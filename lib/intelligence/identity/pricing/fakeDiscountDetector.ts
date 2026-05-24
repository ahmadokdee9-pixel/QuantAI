/**
 * Phase 4 — Identity-aware fake discount detection (wraps tray heuristics, no embeddings).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import {
  detectFakeDiscountSignals,
  type FakeDiscountDetection,
} from "@/lib/intelligence/fakeDiscountDetector";
import { trayPriceHistoryStore } from "./priceHistoryStore";
import { resolveProductIdentity } from "../productIdentityResolver";

export type IdentityFakeDiscountVerdict = FakeDiscountDetection & {
  commerceId: string;
  suspiciousMsrpSpike01: number;
  historicalDiscountSpike01: number;
  explanations: string[];
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Detect fake discount with commerceId-linked history context. */
export function detectIdentityFakeDiscount(
  product: QuantProduct,
  tray: QuantProduct[]
): IdentityFakeDiscountVerdict {
  const base = detectFakeDiscountSignals(product, tray);
  const commerceId =
    product.qiNormalizedCommerce?.commerceId ?? resolveProductIdentity(product).commerceId;
  const explanations: string[] = [];

  let suspiciousMsrpSpike01 = 0;
  if (product.oldPrice != null && product.oldPrice > product.price * 1.35) {
    suspiciousMsrpSpike01 = clamp01((product.oldPrice - product.price) / product.oldPrice);
    explanations.push("elevated_msrp_vs_sale");
  }

  let historicalDiscountSpike01 = 0;
  const histMedian = trayPriceHistoryStore.medianPrice(commerceId);
  if (histMedian != null && histMedian > 0 && product.price < histMedian * 0.72) {
    historicalDiscountSpike01 = round4(1 - product.price / histMedian);
    explanations.push("price_below_historical_median");
  }

  if (base.fakeDiscountProbability >= 0.5) explanations.push("tray_fake_discount_heuristic");
  if (base.discountManipulationRisk >= 0.5) explanations.push("discount_manipulation_pattern");

  return {
    ...base,
    commerceId,
    suspiciousMsrpSpike01: round4(suspiciousMsrpSpike01),
    historicalDiscountSpike01: round4(historicalDiscountSpike01),
    explanations,
  };
}
