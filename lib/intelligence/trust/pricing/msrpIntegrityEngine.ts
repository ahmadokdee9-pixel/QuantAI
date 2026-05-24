/**
 * Phase 5 — MSRP integrity / artificial inflation detection.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { peerPriceMedianExcluding } from "@/lib/deals/dealAnalysis";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type MsrpIntegrityVerdict = {
  msrpIntegrity01: number;
  inflationRatio: number | null;
  reasons: string[];
};

export function evaluateMsrpIntegrity(
  product: QuantProduct,
  tray: QuantProduct[]
): MsrpIntegrityVerdict {
  const reasons: string[] = [];
  if (product.oldPrice == null || product.oldPrice <= product.price) {
    return { msrpIntegrity01: 1, inflationRatio: null, reasons: ["no_strikethrough_msrp"] };
  }

  const peer = peerPriceMedianExcluding(tray, product.link);
  const inflationRatio = peer > 0 ? product.oldPrice / peer : product.oldPrice / product.price;
  let msrpIntegrity01 = 1;

  if (inflationRatio > 1.45) {
    msrpIntegrity01 = 0.25;
    reasons.push("msrp_far_above_peer_median");
  } else if (inflationRatio > 1.28) {
    msrpIntegrity01 = 0.45;
    reasons.push("msrp_elevated_vs_peers");
  } else if (inflationRatio > 1.12) {
    msrpIntegrity01 = 0.72;
    reasons.push("mild_msrp_inflation");
  }

  const discountPct = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  if (discountPct >= 55 && inflationRatio > 1.2) {
    msrpIntegrity01 = Math.min(msrpIntegrity01, 0.35);
    reasons.push("high_discount_on_inflated_msrp");
  }

  return {
    msrpIntegrity01: round4(clamp01(msrpIntegrity01)),
    inflationRatio: round4(inflationRatio),
    reasons,
  };
}
