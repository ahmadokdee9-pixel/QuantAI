/**
 * Phase 5 — Merchant consistency across tray offers (deterministic).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export type MerchantConsistencySnapshot = {
  storeKey: string;
  listingCount: number;
  trustSpread: number;
  priceSpreadRatio: number;
  titleQuality01: number;
  consistencyScore: number;
  reasons: string[];
};

function storeKey(store: string): string {
  return store.trim().toLowerCase();
}

function titleQuality01(title: string): number {
  const len = title.trim().length;
  if (len < 12) return 0.35;
  if (len > 140) return 0.55;
  if (/[^\w\s\-.,'"()]/u.test(title)) return 0.5;
  return 0.85;
}

export function trackMerchantConsistency(products: QuantProduct[]): MerchantConsistencySnapshot[] {
  const byStore = new Map<string, QuantProduct[]>();
  for (const p of products) {
    const k = storeKey(p.store);
    const list = byStore.get(k) ?? [];
    list.push(p);
    byStore.set(k, list);
  }

  const out: MerchantConsistencySnapshot[] = [];
  for (const [store, listings] of byStore) {
    const trusts = listings.map((p) => getStoreTrustScore(p.store));
    const trustSpread = trusts.length > 1 ? Math.max(...trusts) - Math.min(...trusts) : 0;
    const prices = listings.map((p) => p.price).filter((n) => n > 0);
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : 0;
    const priceSpreadRatio = minP > 0 ? round4((maxP - minP) / minP) : 0;
    const tq =
      listings.reduce((s, p) => s + titleQuality01(p.title), 0) / Math.max(1, listings.length);
    const consistencyScore = round4(
      clamp01(1 - trustSpread / 100 - priceSpreadRatio * 0.35) * 0.5 + tq * 0.5
    );
    const reasons: string[] = [];
    if (trustSpread > 15) reasons.push("trust_score_spread_within_store");
    if (priceSpreadRatio > 0.25) reasons.push("wide_price_spread_same_merchant");
    if (tq < 0.6) reasons.push("low_catalog_title_quality");
    out.push({
      storeKey: store,
      listingCount: listings.length,
      trustSpread,
      priceSpreadRatio,
      titleQuality01: round4(tq),
      consistencyScore,
      reasons,
    });
  }
  return out;
}
