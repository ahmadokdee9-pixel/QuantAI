/**
 * QuantAI Living Commerce — discovery quality roles.
 * Classifies each listing for ranking/copy without adding UI surface area.
 */

import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";
import type { MarketPulseSnapshot } from "./marketPulseEngine";
import { normalizeQiListingIdentity } from "./normalizeIntelligenceSignals";

export type DiscoveryRole =
  | "best_match"
  | "best_value"
  | "premium_choice"
  | "safe_pick"
  | "watch"
  | "avoid"
  | "alternative";

export type DiscoveryClassification =
  | "exact_match"
  | "strong_alternative"
  | "weak_alternative"
  | "overpriced_duplicate"
  | "risky_listing"
  | "hidden_value";

export type ProductDiscoveryIntelligence = {
  classification: DiscoveryClassification;
  discoveryRole: DiscoveryRole;
  discoveryScore: number;
  rankingNudge: number;
  discoveryReason: string;
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

function familyCountMap(products: QuantProduct[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of products) {
    const key = p.qiCanonicalIdentity?.familyClusterId || p.qiGlobalCommerce?.market.familyId || p.link;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}

function familyKey(p: QuantProduct): string {
  return p.qiCanonicalIdentity?.familyClusterId || p.qiGlobalCommerce?.market.familyId || p.link;
}

export function buildDiscoveryIntelligenceForTray(
  products: QuantProduct[],
  marketPulse: MarketPulseSnapshot
): Map<string, ProductDiscoveryIntelligence> {
  const out = new Map<string, ProductDiscoveryIntelligence>();
  if (!Array.isArray(products) || products.length === 0) return out;

  const med = median(products.map((p) => p.price));
  const famCounts = familyCountMap(products);
  for (const p of products) {
    const trust = getStoreTrustScore(p.store);
    const rating = ratingValue(p.rating);
    const id = p.qiListingIdentity ? normalizeQiListingIdentity(p.qiListingIdentity) : null;
    const familyCount = famCounts.get(familyKey(p)) ?? 1;
    const priceRatio = med > 0 && p.price > 0 ? p.price / med : 1;
    const mp = getMarketplaceSellerRiskTier(p.store, p.title);
    const identityConfidence = p.qiCanonicalIdentity?.identityConfidence ?? 58;
    const productConfidence = p.qiProductUnderstanding?.productConfidence ?? 60;
    const globalRelation = p.qiGlobalCommerce?.identityRelation ?? "unknown";
    const exactish = globalRelation === "exact_match" || identityConfidence >= 78;
    const risky =
      mp === "high" ||
      trust < 44 ||
      (id?.listingRisk01 ?? 0) >= 0.72 ||
      (id?.contaminationRisk01 ?? 0) >= 0.72 ||
      globalRelation === "fake_or_replica" ||
      globalRelation === "wrong_product";
    const overpricedDuplicate = familyCount >= 2 && priceRatio >= 1.16 && trust < 76;
    const hiddenValue =
      priceRatio <= 0.9 &&
      trust >= 62 &&
      productConfidence >= 62 &&
      (id?.listingRisk01 ?? 0) < 0.42 &&
      (id?.semanticMismatchPenalty01 ?? 0) < 0.42;

    let classification: DiscoveryClassification = "strong_alternative";
    if (risky) classification = "risky_listing";
    else if (overpricedDuplicate) classification = "overpriced_duplicate";
    else if (hiddenValue) classification = "hidden_value";
    else if (exactish) classification = "exact_match";
    else if ((p.qiRelationshipBundle?.universalSimilarity01 ?? 0) < 0.34 && globalRelation !== "same_family") {
      classification = "weak_alternative";
    }

    let discoveryRole: DiscoveryRole = "alternative";
    if (classification === "risky_listing") discoveryRole = "avoid";
    else if (classification === "overpriced_duplicate") discoveryRole = "watch";
    else if (classification === "hidden_value") discoveryRole = "best_value";
    else if (exactish && trust >= 70 && productConfidence >= 66) discoveryRole = "best_match";
    else if (priceRatio >= 1.18 && trust >= 72 && rating >= 4.2) discoveryRole = "premium_choice";
    else if (trust >= 72 && (id?.listingRisk01 ?? 0) < 0.36) discoveryRole = "safe_pick";

    let score =
      (p.qiComposite ?? 58) * 0.38 +
      trust * 0.2 +
      productConfidence * 0.16 +
      identityConfidence * 0.12 +
      marketPulse.dailyOpportunityScore * 0.08 +
      (rating > 0 ? (rating / 5) * 6 : 2);
    if (classification === "hidden_value") score += 9;
    if (classification === "exact_match") score += 6;
    if (classification === "overpriced_duplicate") score -= 9;
    if (classification === "risky_listing") score -= 22;
    if (classification === "weak_alternative") score -= 7;
    score = clamp(score, 0, 100);

    const rankingNudge =
      discoveryRole === "best_match"
        ? 5.5
        : discoveryRole === "best_value"
          ? 5
          : discoveryRole === "safe_pick"
            ? 3
            : discoveryRole === "premium_choice"
              ? 2
              : discoveryRole === "watch"
                ? -4
                : discoveryRole === "avoid"
                  ? -18
                  : -1;

    const discoveryReason =
      discoveryRole === "best_match"
        ? "Best match: clean identity, strong merchant trust, and product confidence align."
        : discoveryRole === "best_value"
          ? "Best value among trusted sellers."
          : discoveryRole === "premium_choice"
            ? "Premium choice: higher price, but stronger brand/trust signals support it."
            : discoveryRole === "safe_pick"
              ? "Safe pick: trusted retailer and low listing risk."
              : discoveryRole === "watch"
                ? "Watch: duplicate family pricing looks high versus peers."
                : discoveryRole === "avoid"
                  ? "Avoid: listing risk, identity mismatch, or marketplace trust is too weak."
                  : "Alternative: relevant, but not the cleanest match in this tray.";

    out.set(p.link, {
      classification,
      discoveryRole,
      discoveryScore: Math.round(score),
      rankingNudge,
      discoveryReason,
    });
  }
  return out;
}
