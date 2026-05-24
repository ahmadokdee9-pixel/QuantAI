/**
 * Phase 4 — Merchant price timeline (deterministic, commerceId-keyed).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { PriceSnapshot } from "../types";
import { trayPriceHistoryStore } from "./priceHistoryStore";
import { resolveProductIdentity } from "../productIdentityResolver";

export type MerchantTimelinePoint = {
  observedAt: string;
  price: number;
  oldPrice: number | null;
  store: string;
};

export type MerchantPriceTimeline = {
  commerceId: string;
  store: string;
  points: MerchantTimelinePoint[];
  volatility01: number;
  trend: "up" | "down" | "stable";
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function ingestTrayPrices(products: QuantProduct[], observedAt?: string): void {
  const ts = observedAt ?? new Date().toISOString();
  for (const p of products) {
    const id = p.qiNormalizedCommerce?.commerceId ?? resolveProductIdentity(p).commerceId;
    trayPriceHistoryStore.record({
      commerceId: id,
      store: p.store,
      link: p.link,
      price: p.price,
      oldPrice: p.oldPrice,
      observedAt: ts,
    });
  }
}

export function buildMerchantPriceTimeline(
  commerceId: string,
  store: string
): MerchantPriceTimeline {
  const history = trayPriceHistoryStore.getHistory(commerceId, store);
  const points: MerchantTimelinePoint[] = history.map((s) => ({
    observedAt: s.observedAt,
    price: s.price,
    oldPrice: s.oldPrice,
    store: s.store,
  }));

  let volatility01 = 0;
  let trend: "up" | "down" | "stable" = "stable";
  if (points.length >= 2) {
    const prices = points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const med = prices[Math.floor(prices.length / 2)] ?? 0;
    volatility01 = med > 0 ? round4((max - min) / med) : 0;
    const first = prices[0] ?? 0;
    const last = prices[prices.length - 1] ?? 0;
    if (last > first * 1.03) trend = "up";
    else if (last < first * 0.97) trend = "down";
  }

  return { commerceId, store, points, volatility01, trend };
}

export function buildTimelinesForTray(products: QuantProduct[]): MerchantPriceTimeline[] {
  const seen = new Set<string>();
  const out: MerchantPriceTimeline[] = [];
  for (const p of products) {
    const id = p.qiNormalizedCommerce?.commerceId ?? resolveProductIdentity(p).commerceId;
    const key = `${id}::${p.store}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(buildMerchantPriceTimeline(id, p.store));
  }
  return out;
}
