import { fakeDiscountRisk } from "@/lib/deals/dealAnalysis";
import { getStoreTrustScore, ratingValue, type QuantProduct } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { parseCommerceSearchIntents } from "./searchIntentV2";
import { computeMerchantConfidence01 } from "./merchantIntelligence";
import { normalizeQiListingIdentity } from "./normalizeIntelligenceSignals";
import { assessUniversalListingIdentity } from "./universalListingIdentity";

export type BuyTimingSignal =
  | "buy_now"
  | "wait"
  | "likely_upcoming_discount"
  | "risky_timing"
  | "price_stabilizing"
  | "volatility_cooling";

export type CommerceQualityInsight = {
  version: 1;
  dealStrength: number;
  fakeDiscountRisk: "low" | "medium" | "high";
  buyTimingSignal: BuyTimingSignal;
  merchantTrustConfidence: number;
  valueScore: number;
  marketSpreadAnalysis: {
    pricePosition: "cheapest" | "below_market" | "fair" | "premium" | "overpriced" | "unknown";
    percentile: number;
    peerMedian: number;
    spreadRatio: number;
    cheapestTrusted: boolean;
  };
  volatilitySignals: {
    volatility01: number;
    priceVsMedian: number;
    outlierRisk: "low" | "medium" | "high";
    likelyPriceMove: "down" | "stable" | "up" | "uncertain";
  };
  rankingReasonTrace: string[];
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function median(nums: number[]): number {
  const s = nums.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function percentile(value: number, prices: number[]): number {
  const clean = prices.filter((n) => n > 0).sort((a, b) => a - b);
  if (!clean.length || value <= 0) return 50;
  const below = clean.filter((n) => n <= value).length;
  return Math.round((below / clean.length) * 100);
}

function discount01(product: QuantProduct): number {
  if (product.oldPrice == null || product.oldPrice <= product.price || product.price <= 0) return 0;
  return clamp((product.oldPrice - product.price) / product.oldPrice, 0, 0.85);
}

function volatility01(prices: number[]): number {
  const clean = prices.filter((n) => n > 0);
  if (clean.length < 4) return 0.28;
  const avg = clean.reduce((sum, n) => sum + n, 0) / clean.length;
  const variance = clean.reduce((sum, n) => sum + (n - avg) ** 2, 0) / Math.max(1, clean.length - 1);
  return clamp(Math.sqrt(variance) / Math.max(1, avg) / 0.55, 0, 1);
}

function fakeRiskScore(risk: CommerceQualityInsight["fakeDiscountRisk"]): number {
  if (risk === "high") return 1;
  if (risk === "medium") return 0.5;
  return 0;
}

function pricePosition(price: number, med: number): CommerceQualityInsight["marketSpreadAnalysis"]["pricePosition"] {
  if (price <= 0 || med <= 0) return "unknown";
  if (price <= med * 0.72) return "cheapest";
  if (price <= med * 0.92) return "below_market";
  if (price <= med * 1.12) return "fair";
  if (price <= med * 1.32) return "premium";
  return "overpriced";
}

function outlierRisk(priceVsMedian: number, fakeRisk: CommerceQualityInsight["fakeDiscountRisk"]): "low" | "medium" | "high" {
  if (fakeRisk === "high" || priceVsMedian <= 0.48 || priceVsMedian >= 1.75) return "high";
  if (fakeRisk === "medium" || priceVsMedian <= 0.62 || priceVsMedian >= 1.38) return "medium";
  return "low";
}

function likelyMove(args: {
  fakeRisk: CommerceQualityInsight["fakeDiscountRisk"];
  pricePosition: CommerceQualityInsight["marketSpreadAnalysis"]["pricePosition"];
  volatility: number;
  priceTrend: QuantProduct["priceTrend"];
  trusted: boolean;
}): "down" | "stable" | "up" | "uncertain" {
  if (args.fakeRisk === "high") return "uncertain";
  if (args.priceTrend === "up" && args.pricePosition === "overpriced") return "down";
  if (args.volatility >= 0.62 && (args.pricePosition === "premium" || args.pricePosition === "overpriced")) return "down";
  if (args.pricePosition === "cheapest" && args.trusted) return "stable";
  if (args.volatility >= 0.72) return "uncertain";
  return args.priceTrend === "down" ? "down" : args.priceTrend === "up" ? "up" : "stable";
}

function timingSignal(args: {
  dealStrength: number;
  fakeRisk: CommerceQualityInsight["fakeDiscountRisk"];
  valueScore: number;
  pricePosition: CommerceQualityInsight["marketSpreadAnalysis"]["pricePosition"];
  volatility: number;
  trustConfidence: number;
  likelyPriceMove: "down" | "stable" | "up" | "uncertain";
  urgency: boolean;
}): BuyTimingSignal {
  if (args.fakeRisk === "high" || (args.pricePosition === "overpriced" && args.trustConfidence < 62)) return "risky_timing";
  if (args.likelyPriceMove === "down" && args.volatility >= 0.48) return "likely_upcoming_discount";
  if (args.dealStrength >= 76 && args.valueScore >= 70 && args.trustConfidence >= 62) return "buy_now";
  if (args.urgency && args.valueScore >= 62 && args.fakeRisk === "low") return "buy_now";
  if (args.volatility <= 0.34 && args.pricePosition === "fair") return "price_stabilizing";
  if (args.volatility >= 0.5 && args.likelyPriceMove === "stable") return "volatility_cooling";
  return "wait";
}

export function buildCommerceQualityLayer(
  products: QuantProduct[],
  query: string,
  canonicalQuery?: CanonicalQueryContract
): QuantProduct[] {
  if (products.length <= 1) {
    return products.map((p) => ({ ...p, qiCommerceQuality: buildSingleInsight(p, products, query, canonicalQuery) }));
  }
  const enriched = products.map((p) => ({ ...p, qiCommerceQuality: buildSingleInsight(p, products, query, canonicalQuery) }));
  return enriched
    .sort((a, b) => {
      const qa = a.qiCommerceQuality!;
      const qb = b.qiCommerceQuality!;
      const scoreA = (a.qiComposite ?? 0) + (qa.valueScore - 50) * 0.09 + (qa.dealStrength - 50) * 0.06 - fakeRiskScore(qa.fakeDiscountRisk) * 4;
      const scoreB = (b.qiComposite ?? 0) + (qb.valueScore - 50) * 0.09 + (qb.dealStrength - 50) * 0.06 - fakeRiskScore(qb.fakeDiscountRisk) * 4;
      return scoreB - scoreA;
    })
    .map((p, i) => ({ ...p, qiRank: i }));
}

function buildSingleInsight(
  product: QuantProduct,
  products: QuantProduct[],
  query: string,
  canonicalQuery?: CanonicalQueryContract
): CommerceQualityInsight {
  const prices = products.map((p) => p.price).filter((n) => n > 0);
  const med = median(prices);
  const low = prices.length ? Math.min(...prices) : 0;
  const high = prices.length ? Math.max(...prices) : 0;
  const maxReviews = Math.max(0, ...products.map((p) => p.reviewsCount ?? 0));
  const listingIdentity = product.qiListingIdentity ?? assessUniversalListingIdentity(product, query);
  const normalizedListing = normalizeQiListingIdentity(listingIdentity);
  const fakeRisk = fakeDiscountRisk(product, products, Math.round(discount01(product) * 100) || null, maxReviews);
  const trust = getStoreTrustScore(product.store);
  const merchantConfidence = Math.round((product.qiMerchantConfidence01 ?? computeMerchantConfidence01(product, listingIdentity)) * 100);
  const pct = percentile(product.price, prices);
  const pos = pricePosition(product.price, med);
  const priceVsMedian = med > 0 && product.price > 0 ? product.price / med : 1;
  const vol = volatility01(prices);
  const trusted = trust >= 66 && merchantConfidence >= 58;
  const cheapestTrusted =
    trusted &&
    product.price > 0 &&
    product.price <= Math.min(...products.filter((p) => getStoreTrustScore(p.store) >= 66 && p.price > 0).map((p) => p.price), Number.POSITIVE_INFINITY) * 1.015;
  const disc = discount01(product);
  const fakePenalty = fakeRiskScore(fakeRisk);
  const rating = ratingValue(product.rating);
  const priceAdvantage = clamp((med - product.price) / Math.max(1, med), -0.5, 0.65);
  const dealStrength = Math.round(
    clamp(
      42 +
        disc * 42 +
        Math.max(0, priceAdvantage) * 34 +
        (trusted ? 10 : -2) +
        (cheapestTrusted ? 8 : 0) -
        fakePenalty * 36 -
        normalizedListing.listingRisk01 * 10,
      0,
      100
    )
  );
  const valueScore = Math.round(
    clamp(
      46 +
        Math.max(0, priceAdvantage) * 38 +
        (trust - 60) * 0.22 +
        (merchantConfidence - 55) * 0.2 +
        (rating >= 4 ? 5 : 0) +
        (cheapestTrusted ? 10 : 0) -
        (pos === "overpriced" ? 18 : pos === "premium" ? 7 : 0) -
        fakePenalty * 24,
      0,
      100
    )
  );
  const move = likelyMove({ fakeRisk, pricePosition: pos, volatility: vol, priceTrend: product.priceTrend, trusted });
  const intents = canonicalQuery?.commerceIntents ?? parseCommerceSearchIntents(query);
  const timing = timingSignal({
    dealStrength,
    fakeRisk,
    valueScore,
    pricePosition: pos,
    volatility: vol,
    trustConfidence: merchantConfidence,
    likelyPriceMove: move,
    urgency: intents.buyNowUrgency,
  });
  const trace = [
    `value=${valueScore}`,
    `deal=${dealStrength}`,
    `trust=${merchantConfidence}`,
    `position=${pos}`,
    `fakeDiscount=${fakeRisk}`,
    `timing=${timing}`,
  ];
  if (getMarketplaceSellerRiskTier(product.store, product.title) !== "low") trace.push("marketplace-risk-check");
  if (normalizedListing.contaminationRisk01 >= 0.48) trace.push("listing-contamination-watch");

  return {
    version: 1,
    dealStrength,
    fakeDiscountRisk: fakeRisk,
    buyTimingSignal: timing,
    merchantTrustConfidence: merchantConfidence,
    valueScore,
    marketSpreadAnalysis: {
      pricePosition: pos,
      percentile: pct,
      peerMedian: Math.round(med),
      spreadRatio: low > 0 ? Number(((high - low) / low).toFixed(2)) : 0,
      cheapestTrusted,
    },
    volatilitySignals: {
      volatility01: Number(vol.toFixed(2)),
      priceVsMedian: Number(priceVsMedian.toFixed(2)),
      outlierRisk: outlierRisk(priceVsMedian, fakeRisk),
      likelyPriceMove: move,
    },
    rankingReasonTrace: trace.slice(0, 8),
  };
}

export function buildCommerceQualityDebug(products: QuantProduct[]): Record<string, unknown> {
  const rows = products.filter((p) => p.qiCommerceQuality).slice(0, 12);
  const qualities = products.map((p) => p.qiCommerceQuality).filter(Boolean) as CommerceQualityInsight[];
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((sum, n) => sum + n, 0) / xs.length) : 0);
  return {
    averageDealStrength: avg(qualities.map((q) => q.dealStrength)),
    averageValueScore: avg(qualities.map((q) => q.valueScore)),
    fakeDiscountRiskCounts: qualities.reduce<Record<string, number>>((acc, q) => {
      acc[q.fakeDiscountRisk] = (acc[q.fakeDiscountRisk] ?? 0) + 1;
      return acc;
    }, {}),
    buyTimingSignalCounts: qualities.reduce<Record<string, number>>((acc, q) => {
      acc[q.buyTimingSignal] = (acc[q.buyTimingSignal] ?? 0) + 1;
      return acc;
    }, {}),
    cheapestTrustedCount: qualities.filter((q) => q.marketSpreadAnalysis.cheapestTrusted).length,
    topRankingTraces: rows.map((p) => ({
      title: p.title.slice(0, 110),
      store: p.store,
      dealStrength: p.qiCommerceQuality?.dealStrength,
      fakeDiscountRisk: p.qiCommerceQuality?.fakeDiscountRisk,
      buyTimingSignal: p.qiCommerceQuality?.buyTimingSignal,
      merchantTrustConfidence: p.qiCommerceQuality?.merchantTrustConfidence,
      valueScore: p.qiCommerceQuality?.valueScore,
      rankingReasonTrace: p.qiCommerceQuality?.rankingReasonTrace,
    })),
  };
}
