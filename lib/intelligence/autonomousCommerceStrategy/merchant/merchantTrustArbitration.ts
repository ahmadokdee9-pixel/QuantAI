/**
 * Phase 15 — Merchant trust arbitration.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { QuantProduct } from "@/lib/shoppingScore";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function arbitrateMerchantTrust(args: {
  products: QuantProduct[];
  trust?: TrustEngineResult | null;
}): { verdict: string; score01: number } {
  const stores = new Set(args.products.map((p) => p.store.trim().toLowerCase()));
  const diversity = stores.size / Math.max(1, args.products.length);
  const alerts = args.trust?.meta.fakeDiscountAlertCount ?? 0;
  const score01 = round4(Math.max(0, 1 - alerts / 5) * (0.6 + diversity * 0.4));
  const verdict = score01 > 0.65 ? "merchant_trust_ok" : score01 > 0.35 ? "merchant_mixed" : "merchant_caution";
  return { verdict, score01 };
}
