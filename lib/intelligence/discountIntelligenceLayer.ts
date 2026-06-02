/**
 * Phase 3 — Discount intelligence: cross-retailer savings + verified discount detection.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import { buildDealIntelByLink } from "@/lib/intelligence/dealIntelligenceEngine";
import { parseCommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";

export type VerifiedDiscountOffer = {
  link: string;
  store: string;
  title: string;
  price: number;
  savingsVsMedian: number;
  savingsVsHighest: number;
  trustScore: number;
  fakeDiscountRisk: "low" | "medium" | "high";
  label: "Best Verified Discount" | null;
};

export type DiscountIntelligenceResult = {
  offers: VerifiedDiscountOffer[];
  bestVerifiedDiscount: VerifiedDiscountOffer | null;
  medianPrice: number;
  highestTrustedPrice: number;
  clusterCount: number;
};

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(new|refurb|used|open box|renewed)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 8)
    .join(" ");
}

function median(nums: number[]): number {
  const s = [...nums].filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Build cross-retailer discount intelligence for a product tray. */
export function buildDiscountIntelligence(
  products: QuantProduct[],
  query: string
): DiscountIntelligenceResult {
  const priced = products.filter((p) => p.price > 0);
  const med = median(priced.map((p) => p.price));
  const dealIntel = buildDealIntelByLink(priced, parseCommerceSearchIntents(query), undefined, undefined);

  const trusted = priced.filter((p) => getStoreTrustScore(p.store) >= 68);
  const highestTrusted = trusted.length
    ? Math.max(...trusted.map((p) => p.price))
    : Math.max(...priced.map((p) => p.price), 0);

  const clusters = new Map<string, QuantProduct[]>();
  for (const p of priced) {
    const key = normalizeTitleKey(p.title);
    if (!key) continue;
    const arr = clusters.get(key) ?? [];
    arr.push(p);
    clusters.set(key, arr);
  }

  const offers: VerifiedDiscountOffer[] = [];

  for (const p of priced) {
    const intel = dealIntel.get(p.link);
    const fakeRisk = intel?.fakeDiscountRisk ?? "low";
    const trust = getStoreTrustScore(p.store);
    const savingsVsMedian = med > 0 ? Math.max(0, med - p.price) : 0;
    const savingsVsHighest = highestTrusted > 0 ? Math.max(0, highestTrusted - p.price) : 0;

    if (fakeRisk === "high") continue;
    if (trust < 58) continue;
    if (savingsVsMedian < 5 && savingsVsHighest < 8) continue;

    offers.push({
      link: p.link,
      store: p.store,
      title: p.title,
      price: p.price,
      savingsVsMedian,
      savingsVsHighest,
      trustScore: trust,
      fakeDiscountRisk: fakeRisk === "medium" ? "medium" : "low",
      label: null,
    });
  }

  offers.sort((a, b) => {
    const scoreA = a.savingsVsMedian * 0.5 + a.trustScore * 0.35 - (a.fakeDiscountRisk === "medium" ? 8 : 0);
    const scoreB = b.savingsVsMedian * 0.5 + b.trustScore * 0.35 - (b.fakeDiscountRisk === "medium" ? 8 : 0);
    return scoreB - scoreA;
  });

  let bestVerifiedDiscount: VerifiedDiscountOffer | null = null;
  if (offers.length && offers[0]!.savingsVsMedian >= 8 && offers[0]!.trustScore >= 65) {
    bestVerifiedDiscount = { ...offers[0]!, label: "Best Verified Discount" };
    offers[0] = bestVerifiedDiscount;
  }

  return {
    offers: offers.slice(0, 8),
    bestVerifiedDiscount,
    medianPrice: med,
    highestTrustedPrice: highestTrusted,
    clusterCount: clusters.size,
  };
}

/** Ranking nudge for verified discount (never overrides trust/relevance). */
export function discountRankingNudge(
  product: QuantProduct,
  discount: DiscountIntelligenceResult
): number {
  if (!discount.bestVerifiedDiscount) return 0;
  if (product.link !== discount.bestVerifiedDiscount.link) return 0;
  if (discount.bestVerifiedDiscount.trustScore < 65) return 0;
  return Math.min(6, discount.bestVerifiedDiscount.savingsVsMedian * 0.04);
}
