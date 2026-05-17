/**
 * QuantAI Living Commerce — tray-local market pulse.
 * No external feeds: derives daily market posture from current search results only.
 */

import { getCategoryBehaviorProfileAdaptive } from "@/lib/intelligence/categoryBehaviorProfiles";
import type { ProductCategorySlug } from "@/lib/intelligence/types";
import { getStoreTrustScore, type QuantProduct } from "@/lib/shoppingScore";

export type MarketTrendMomentum = "cold" | "stable" | "rising" | "hot";
export type DiscountMomentum = "weak" | "normal" | "strong" | "exceptional";

export type MarketPulseSnapshot = {
  query: string;
  category: ProductCategorySlug;
  trendMomentum: MarketTrendMomentum;
  discountMomentum: DiscountMomentum;
  marketFreshness: number;
  retailerDiversity: number;
  dailyOpportunityScore: number;
  marketPulseReason: string;
};

const NEUTRAL_MARKET_PULSE: MarketPulseSnapshot = {
  query: "",
  category: "general",
  trendMomentum: "stable",
  discountMomentum: "normal",
  marketFreshness: 52,
  retailerDiversity: 50,
  dailyOpportunityScore: 52,
  marketPulseReason: "Market pulse is neutral: enough signal to compare, not enough to force timing.",
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function median(nums: number[]): number {
  const s = nums.filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function dominantCategory(products: QuantProduct[]): ProductCategorySlug {
  const counts = new Map<ProductCategorySlug, number>();
  for (const p of products) {
    const c = (p.qiCategory ?? "general") as ProductCategorySlug;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best: ProductCategorySlug = "general";
  let n = 0;
  for (const [cat, count] of counts) {
    if (count > n) {
      best = cat;
      n = count;
    }
  }
  return best;
}

function priceSpread01(products: QuantProduct[]): number {
  const prices = products.map((p) => p.price).filter((n) => n > 0);
  if (prices.length < 3) return 0.22;
  const med = median(prices);
  if (med <= 0) return 0.22;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return clamp((max - min) / med / 1.15, 0, 1);
}

function repeatedFamilyShare01(products: QuantProduct[]): number {
  if (!products.length) return 0;
  const counts = new Map<string, number>();
  for (const p of products) {
    const key = p.qiCanonicalIdentity?.familyClusterId || p.qiGlobalCommerce?.market.familyId || p.link;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const repeated = [...counts.values()].filter((n) => n >= 2).reduce((a, b) => a + b, 0);
  return clamp(repeated / Math.max(1, products.length), 0, 1);
}

export function safeMarketPulseSnapshot(query = "", category: ProductCategorySlug = "general"): MarketPulseSnapshot {
  return { ...NEUTRAL_MARKET_PULSE, query, category };
}

export function buildMarketPulseSnapshot(products: QuantProduct[], query: string): MarketPulseSnapshot {
  if (!Array.isArray(products) || products.length === 0) return safeMarketPulseSnapshot(query);

  const category = dominantCategory(products);
  const profile = getCategoryBehaviorProfileAdaptive(category, query);
  const stores = new Set(products.map((p) => p.store.toLowerCase().trim()).filter(Boolean));
  const trustedStores = new Set(
    products.filter((p) => getStoreTrustScore(p.store) >= 66).map((p) => p.store.toLowerCase().trim())
  );
  const retailerDiversity = clamp((stores.size / Math.min(8, Math.max(3, products.length))) * 72 + trustedStores.size * 5, 0, 100);

  const discountRows = products.filter((p) => p.oldPrice != null && p.oldPrice > p.price && p.price > 0);
  const discountShare = discountRows.length / Math.max(1, products.length);
  const avgDiscount =
    discountRows.length > 0
      ? discountRows.reduce((sum, p) => sum + ((p.oldPrice! - p.price) / p.oldPrice!) * 100, 0) / discountRows.length
      : 0;
  const spread = priceSpread01(products);
  const repeatShare = repeatedFamilyShare01(products);
  const avgTrust =
    products.reduce((sum, p) => sum + getStoreTrustScore(p.store), 0) / Math.max(1, products.length);
  const cleanShare =
    products.filter((p) => (p.qiListingIdentity?.listingRisk01 ?? 0) < 0.42 && (p.qiListingIdentity?.contaminationRisk01 ?? 0) < 0.48)
      .length / Math.max(1, products.length);

  let trendMomentum: MarketTrendMomentum = "stable";
  if (products.length <= 3 && avgTrust < 58) trendMomentum = "cold";
  else if (repeatShare >= 0.48 && avgTrust >= 64) trendMomentum = "hot";
  else if (repeatShare >= 0.28 || retailerDiversity >= 68 || profile.trustWeight >= 1.12) trendMomentum = "rising";

  let discountMomentum: DiscountMomentum = "normal";
  if (discountShare < 0.12 || avgDiscount < 5) discountMomentum = "weak";
  else if (discountShare >= 0.55 && avgDiscount >= 24 && avgTrust >= 58) discountMomentum = "exceptional";
  else if (discountShare >= 0.34 || avgDiscount >= 16) discountMomentum = "strong";

  const marketFreshness = clamp(
    36 + Math.min(products.length, 18) * 2.2 + retailerDiversity * 0.22 + repeatShare * 16 + cleanShare * 12,
    0,
    100
  );
  const dailyOpportunityScore = clamp(
    marketFreshness * 0.22 +
      retailerDiversity * 0.18 +
      cleanShare * 18 +
      avgTrust * 0.18 +
      (discountMomentum === "exceptional" ? 22 : discountMomentum === "strong" ? 14 : discountMomentum === "weak" ? -4 : 6) +
      (trendMomentum === "hot" ? 10 : trendMomentum === "rising" ? 6 : trendMomentum === "cold" ? -6 : 2) -
      spread * 8,
    0,
    100
  );

  const marketPulseReason =
    trendMomentum === "hot"
      ? "Market pulse is hot: multiple retailers cluster around the same product families today."
      : discountMomentum === "exceptional"
        ? "Market pulse shows exceptional discount pressure with enough trusted retailers to act."
        : trendMomentum === "cold"
          ? "Market pulse is cold: thin trusted inventory makes cleaner comparison more important."
          : `Market pulse is ${trendMomentum}: ${stores.size} retailers, ${Math.round(discountShare * 100)}% discounted rows, and ${Math.round(cleanShare * 100)}% clean listings.`;

  return {
    query,
    category,
    trendMomentum,
    discountMomentum,
    marketFreshness: Math.round(marketFreshness),
    retailerDiversity: Math.round(retailerDiversity),
    dailyOpportunityScore: Math.round(dailyOpportunityScore),
    marketPulseReason: marketPulseReason.slice(0, 180),
  };
}
