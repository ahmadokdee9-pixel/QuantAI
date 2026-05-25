/**
 * Phase 16 — Universal merchant intelligence.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { UniversalVerticalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function analyzeUniversalMerchants(args: {
  products: QuantProduct[];
  dominantVertical: UniversalVerticalId;
}): { merchantDiversity01: number; verdict: string } {
  const stores = new Set(args.products.map((p) => p.store.trim().toLowerCase()));
  const merchantDiversity01 = round4(stores.size / Math.max(1, args.products.length));
  const verdict =
    merchantDiversity01 > 0.5
      ? "multi_merchant_tray"
      : merchantDiversity01 > 0.25
        ? "focused_merchants"
        : "single_merchant_focus";
  void args.dominantVertical;
  return { merchantDiversity01, verdict };
}
