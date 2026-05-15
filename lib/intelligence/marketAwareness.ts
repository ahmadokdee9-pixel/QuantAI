/**
 * Tray-local market awareness — no external market feeds.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore } from "@/lib/shoppingScore";
import { parseCommerceSearchIntents } from "./searchIntentV2";
import type { ProductCategorySlug } from "./types";

export type CategoryDemandTrend = "rising" | "stable" | "falling" | "seasonal";
export type MarketHeat = "cold" | "normal" | "hot" | "overheated";
export type BuyerMomentum = "weak" | "normal" | "strong";
export type DiscountWindow = "now" | "soon" | "unlikely" | "unknown";
export type CategoryVolatilityBand = "low" | "medium" | "high";

export type MarketAwarenessTray = {
  categoryDemandTrend: CategoryDemandTrend;
  marketHeat: MarketHeat;
  seasonalOpportunity: boolean;
  categoryVolatility: CategoryVolatilityBand;
  buyerMomentum: BuyerMomentum;
  discountWindow: DiscountWindow;
  dominantCategory: ProductCategorySlug;
};

function trayPriceCv01(products: QuantProduct[]): number {
  const prices = products.map((p) => p.price).filter((n) => n > 0);
  if (prices.length < 3) return 0.2;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const v = prices.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, prices.length - 1);
  const cv = mean > 0 ? Math.sqrt(v) / mean : 0;
  return Math.min(1, cv / 0.45);
}

function dominantCategoryFromTray(products: QuantProduct[]): ProductCategorySlug {
  const counts = new Map<string, number>();
  for (const p of products) {
    const c = p.qiCategory ?? "general";
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best: ProductCategorySlug = "general";
  let n = 0;
  for (const [k, v] of counts) {
    if (v > n) {
      n = v;
      best = k as ProductCategorySlug;
    }
  }
  return best;
}

/** Single tray snapshot → market posture (shared across listings in that search). */
export function computeMarketAwarenessForTray(query: string, products: QuantProduct[]): MarketAwarenessTray {
  const intents = parseCommerceSearchIntents(query);
  const q = query.toLowerCase();
  const cv = trayPriceCv01(products);
  const dom = dominantCategoryFromTray(products);

  const trusts = products.map((p) => getStoreTrustScore(p.store));
  const avgTrust = trusts.length ? trusts.reduce((a, b) => a + b, 0) / trusts.length : 50;
  const comps = products.map((p) => getFinalComposite(p, products));
  const avgQi = comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : 50;

  let categoryDemandTrend: CategoryDemandTrend = "stable";
  if (/\b(trending|viral|sold out|restock|hype)\b/i.test(q) || intents.buyNowUrgency) categoryDemandTrend = "rising";
  else if (/\b(clearance|last season|outlet|older model)\b/i.test(q)) categoryDemandTrend = "falling";
  if (/\b(season|holiday|black friday|cyber|summer sale|winter)\b/i.test(q) || intents.dealHunter) {
    categoryDemandTrend = "seasonal";
  }

  let marketHeat: MarketHeat = "normal";
  if (intents.buyNowUrgency && avgTrust >= 62) marketHeat = "hot";
  if (cv >= 0.72 && products.length >= 6) marketHeat = "overheated";
  else if (cv >= 0.55) marketHeat = "hot";
  if (products.length <= 3 && avgQi < 58) marketHeat = "cold";

  const seasonalOpportunity =
    /\b(season|clearance|holiday|black friday|january sale|summer|winter)\b/i.test(q) ||
    (dom === "fashion" && /\b(sale|markdown|outlet)\b/i.test(q));

  const categoryVolatility: CategoryVolatilityBand =
    cv >= 0.62 ? "high" : cv >= 0.38 ? "medium" : "low";

  let buyerMomentum: BuyerMomentum = "normal";
  if (intents.buyNowUrgency || intents.giftUse) buyerMomentum = "strong";
  if (avgQi < 54 && avgTrust < 56) buyerMomentum = "weak";

  const discShare =
    products.filter((p) => p.oldPrice != null && p.oldPrice > p.price).length / Math.max(1, products.length);

  let discountWindow: DiscountWindow = "unknown";
  if (discShare >= 0.45) discountWindow = "now";
  else if (seasonalOpportunity || categoryDemandTrend === "seasonal") discountWindow = "soon";
  else if (discShare < 0.12 && cv < 0.35) discountWindow = "unlikely";

  if (dom === "home" && /\b(furniture|sofa|mattress|dining)\b/i.test(q)) {
    if (/\b(delivery|lead time|backorder)\b/i.test(q)) categoryDemandTrend = "seasonal";
    if (seasonalOpportunity && discountWindow !== "now") discountWindow = "soon";
  }
  if (dom === "beauty" || /\b(perfume|cologne|fragrance|skincare)\b/i.test(q)) {
    if (discShare > 0.55 && avgTrust < 60) marketHeat = marketHeat === "cold" ? "normal" : "overheated";
    if (/\b(authentic|fake|dupe|grey market)\b/i.test(q)) buyerMomentum = "weak";
  }
  if (dom === "electronics" && /\b(refurb|renewed|open[- ]?box)\b/i.test(q)) {
    categoryDemandTrend = categoryDemandTrend === "rising" ? "stable" : "falling";
  }
  if (intents.giftUse && /\b(gift|present|birthday|christmas)\b/i.test(q)) {
    buyerMomentum = "strong";
  }

  return {
    categoryDemandTrend,
    marketHeat,
    seasonalOpportunity,
    categoryVolatility,
    buyerMomentum,
    discountWindow,
    dominantCategory: dom,
  };
}

/** Subtle composite nudge from market + category heuristics (post-cache). */
export function applyMarketAwarenessRanking(products: QuantProduct[], query: string): QuantProduct[] {
  if (products.length === 0) return products;
  const m = computeMarketAwarenessForTray(query, products);
  const intents = parseCommerceSearchIntents(query);
  const out = products.map((p) => {
    let d = 0;
    const trust = getStoreTrustScore(p.store);
    const cat = (p.qiCategory ?? "general") as ProductCategorySlug;
    if (m.marketHeat === "hot" && trust >= 72) d += 0.6;
    if (m.marketHeat === "overheated" && trust < 62) d -= 1.1;
    if (m.discountWindow === "soon" && m.seasonalOpportunity && (cat === "fashion" || cat === "home")) d += 0.5;
    if (m.categoryVolatility === "high" && trust >= 76) d += 0.4;
    if (m.categoryVolatility === "high" && trust < 58) d -= 0.8;
    if (m.buyerMomentum === "weak" && (p.qiComposite ?? 0) < 65) d -= 0.5;
    if (
      intents.gaming &&
      cat === "electronics" &&
      /\b(rtx|ryzen|gen)\b/i.test(p.title) &&
      m.categoryDemandTrend === "falling"
    ) {
      d -= 0.4;
    }
    if ((cat === "beauty" || cat === "fashion") && m.buyerMomentum === "strong" && trust >= 70) d += 0.35;
    if (m.dominantCategory === "home" && /\b(sofa|dining table|bed frame)\b/i.test(query) && trust >= 74) d += 0.25;
    if (cat === "electronics" && /\b(2023|2022|last gen)\b/i.test(p.title) && m.categoryDemandTrend === "falling") d -= 0.35;
    const qi = Math.min(100, Math.max(0, Math.round((p.qiComposite ?? 0) + d)));
    return { ...p, qiComposite: qi };
  });
  return [...out].sort((a, b) => (b.qiComposite ?? 0) - (a.qiComposite ?? 0));
}
