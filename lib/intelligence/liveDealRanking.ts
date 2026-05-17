/**
 * QuantAI Live Commerce Discovery — live deal ranking.
 * Lightweight post-fusion ranking using relevance, trust, price advantage, identity, availability, freshness.
 */

import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { queryListingRelevance01 } from "./queryRelevance";
import { normalizeQiListingIdentity } from "./normalizeIntelligenceSignals";

function median(nums: number[]): number {
  const s = nums.filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function availability01(p: QuantProduct): number {
  const text = `${p.availability ?? ""} ${p.shipping ?? ""} ${Array.isArray(p.extensions) ? p.extensions.join(" ") : ""}`.toLowerCase();
  if (/in stock|op voorraad|available|ships|delivery|free/i.test(text)) return 0.82;
  if (/out of stock|sold out|unavailable|preorder/i.test(text)) return 0.22;
  return text.trim() ? 0.55 : 0.42;
}

function discountCredibility01(p: QuantProduct, trust: number): number {
  if (p.oldPrice == null || p.oldPrice <= p.price || p.price <= 0) return 0.42;
  const pct = (p.oldPrice - p.price) / p.oldPrice;
  let score = clamp(pct / 0.35, 0, 1);
  if (pct >= 0.5 && trust < 64) score *= 0.58;
  if (pct >= 0.38 && getMarketplaceSellerRiskTier(p.store, p.title) === "high") score *= 0.52;
  return clamp(score, 0, 1);
}

export function rankLiveDeals(products: QuantProduct[], query: string): QuantProduct[] {
  if (products.length <= 1) return products;
  const med = median(products.map((p) => p.price));
  const scored = products.map((p, index) => {
    const trust = getStoreTrustScore(p.store);
    const id = p.qiListingIdentity ? normalizeQiListingIdentity(p.qiListingIdentity) : null;
    const relevance = queryListingRelevance01(query, p);
    const priceAdv = med > 0 && p.price > 0 ? clamp((med - p.price) / med, -0.35, 0.45) : 0;
    const route = p.outboundRouteKind === "direct_merchant" ? 1 : p.outboundRouteKind === "merchant_search" ? 0.72 : 0.28;
    const identity = p.qiCanonicalIdentity?.identityConfidence ? p.qiCanonicalIdentity.identityConfidence / 100 : 0.58;
    const risk = (id?.listingRisk01 ?? 0.24) * 0.42 + (id?.contaminationRisk01 ?? 0.18) * 0.36 + (id?.semanticMismatchPenalty01 ?? 0.12) * 0.22;
    const score =
      relevance * 26 +
      (trust / 100) * 18 +
      route * 12 +
      identity * 14 +
      availability01(p) * 9 +
      discountCredibility01(p, trust) * 8 +
      priceAdv * 18 -
      risk * 26 +
      (p.qiDiscovery?.rankingNudge ?? 0);
    return { p, index, score };
  });
  return scored
    .sort((a, b) => {
      const d = b.score - a.score;
      return Math.abs(d) > 0.001 ? d : a.index - b.index;
    })
    .map((x, i) => ({ ...x.p, id: i + 1, qiRank: i }));
}
