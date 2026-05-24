/**
 * Phase 5 — Historical price baseline resolver (commerceId-keyed).
 */

import { trayPriceHistoryStore } from "@/lib/intelligence/identity/pricing/priceHistoryStore";
import { resolveProductIdentity } from "@/lib/intelligence/identity/productIdentityResolver";
import type { QuantProduct } from "@/lib/shoppingScore";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type HistoricalPriceBaseline = {
  commerceId: string;
  baselinePrice: number | null;
  sampleCount: number;
  confidence01: number;
};

export function resolveHistoricalBaseline(product: QuantProduct): HistoricalPriceBaseline {
  const commerceId =
    product.qiNormalizedCommerce?.commerceId ?? resolveProductIdentity(product).commerceId;
  const history = trayPriceHistoryStore.getHistory(commerceId);
  const median = trayPriceHistoryStore.medianPrice(commerceId);
  const sampleCount = history.length;
  const confidence01 =
    sampleCount >= 6 ? 0.9 : sampleCount >= 3 ? 0.7 : sampleCount >= 1 ? 0.45 : 0.15;
  return {
    commerceId,
    baselinePrice: median != null ? round4(median) : null,
    sampleCount,
    confidence01: round4(confidence01),
  };
}

export function resolveTrayBaselines(products: QuantProduct[]): Map<string, HistoricalPriceBaseline> {
  const map = new Map<string, HistoricalPriceBaseline>();
  for (const p of products) {
    const b = resolveHistoricalBaseline(p);
    if (!map.has(b.commerceId)) map.set(b.commerceId, b);
  }
  return map;
}
