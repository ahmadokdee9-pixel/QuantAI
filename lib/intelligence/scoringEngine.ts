import { listingTextQuality01 } from "@/lib/commerce/listingQuality";
import { getRetailerDiscoveryBoost, getStoreTrustScore, getTrustRankPercentile } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";
import { getCategoryWeights, inferProductCategory } from "./categoryContext";
import { scoreDeliverySpeed } from "./deliveryScore";
import { queryListingRelevance01 } from "./queryRelevance";
import type { CommerceSearchIntents } from "./searchIntentV2";
import { intentCompositeLift, parseCommerceSearchIntents } from "./searchIntentV2";
import type { IntelligenceSignals, ListStats, ProductCategorySlug } from "./types";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function toSignal01(x: number): number {
  return Math.round(clamp01(x) * 100);
}

export function computeListStats(products: QuantProduct[]): ListStats {
  const prices = products.map((p) => p.price).filter((n) => n > 0);
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const ratings = products.map((p) => ratingValue(p.rating)).filter((r) => r > 0);
  const sortedR = [...ratings].sort((a, b) => a - b);
  const midR = sortedR.length ? sortedR[Math.floor(sortedR.length / 2)] : 0;
  const maxReviews = Math.max(0, ...products.map((p) => p.reviewsCount ?? 0));
  const sumP = prices.reduce((a, b) => a + b, 0);
  const sumR = ratings.reduce((a, b) => a + b, 0);
  return {
    avgPrice: prices.length ? sumP / prices.length : 0,
    medianPrice: mid,
    minPrice: sorted.length ? sorted[0] : 0,
    maxPrice: sorted.length ? sorted[sorted.length - 1] : 0,
    maxReviews,
    avgRating: ratings.length ? sumR / ratings.length : 0,
    medianRating: midR,
  };
}

function priceFitScore(price: number, stats: ListStats): number {
  const med = stats.medianPrice > 0 ? stats.medianPrice : price;
  if (med <= 0 || price <= 0) return 0.55;
  const ratio = price / med;
  // Below median improves score smoothly; above median decays.
  return clamp01(1.15 - ratio * 0.55);
}

function reviewDepthScore(reviews: number | null, maxReviews: number): number {
  const r = reviews ?? 0;
  if (maxReviews <= 0) return r > 0 ? 0.55 : 0.35;
  const log = Math.log10(r + 1) / Math.log10(maxReviews + 1);
  return clamp01(log);
}

function discountQualityScore(
  price: number,
  oldPrice: number | null,
  trust: number,
  listingQuality01: number
): number {
  if (oldPrice == null || oldPrice <= price || price <= 0) return 0.35;
  const pct = (oldPrice - price) / oldPrice;
  let base = clamp01(pct / 0.35);
  if (pct >= 0.42 && trust < 62) base *= 0.52;
  if (pct >= 0.52 && trust < 72) base *= 0.68;
  if (pct >= 0.58 && trust < 82) base *= 0.82;
  base *= 0.78 + listingQuality01 * 0.35;
  return clamp01(base);
}

function pricePerformanceScore(
  price: number,
  rating: number,
  listMaxRaw: number
): { raw: number; norm: number } {
  const safePrice = Math.max(price, 1);
  const r = clamp01(rating / 5);
  const raw = (Math.pow(r, 1.25) * 20) / Math.sqrt(safePrice);
  const norm = listMaxRaw > 0 ? clamp01(raw / listMaxRaw) : clamp01(raw / 2);
  return { raw, norm };
}

function popularityScore(reviews: number | null, rating: number, maxReviews: number): number {
  const r = reviews ?? 0;
  const depth = reviewDepthScore(r, Math.max(maxReviews, 1));
  const stars = clamp01(rating / 5);
  return clamp01(0.55 * depth + 0.45 * stars);
}

export type EngineResult = {
  composite: number;
  modelLayer: number;
  signals: IntelligenceSignals;
  category: ProductCategorySlug;
};

export function scoreProductEngine(
  p: QuantProduct,
  searchQuery: string,
  stats: ListStats,
  listMaxValueRaw: number,
  intents?: CommerceSearchIntents
): EngineResult {
  const intentsResolved = intents ?? parseCommerceSearchIntents(searchQuery);
  const category = inferProductCategory(searchQuery, p.title);
  const w = getCategoryWeights(category);
  const rating = ratingValue(p.rating);
  const ratingNorm = clamp01(rating / 5);
  const trust = getStoreTrustScore(p.store);
  const trustNorm = clamp01(trust / 100);
  const trustRank = getTrustRankPercentile(p.store) / 100;
  const listingQ = listingTextQuality01(p.title);

  const queryRel = queryListingRelevance01(searchQuery, p);
  const categoryFitBase = category === "general" ? 0.45 : 0.85;
  const categoryFitBlend = clamp01(categoryFitBase * 0.52 + queryRel * 0.48);

  const priceFit = priceFitScore(p.price, stats);
  const reviewDepth = reviewDepthScore(p.reviewsCount, stats.maxReviews);
  const delivery = scoreDeliverySpeed(p.shipping);
  const discount = discountQualityScore(p.price, p.oldPrice, trust, listingQ);
  const { norm: valueNorm } = pricePerformanceScore(
    p.price,
    rating,
    listMaxValueRaw
  );
  const pop = popularityScore(p.reviewsCount, rating, stats.maxReviews);

  const weighted =
    w.price * priceFit +
    w.rating * ratingNorm +
    w.reviewDepth * reviewDepth +
    w.retailerTrust * trustNorm +
    w.delivery * delivery +
    w.popularity * pop +
    w.pricePerformance * valueNorm +
    w.discountQuality * discount;

  const medianHint =
    stats.medianPrice > 0 && p.price > 0
      ? (stats.medianPrice - p.price) / stats.medianPrice
      : undefined;
  const headlineDisc =
    p.oldPrice != null && p.oldPrice > p.price && p.price > 0
      ? (p.oldPrice - p.price) / p.oldPrice
      : undefined;
  const intentLift = intentCompositeLift(intentsResolved, category, trustNorm, medianHint, {
    headlineDiscount01: headlineDisc,
  });
  const listingFit = clamp01(0.52 + (listingQ - 0.5) * 0.22);

  const composite01 = clamp01(weighted * 0.86 + categoryFitBlend * 0.085 + listingFit * 0.035 + intentLift);

  const composite = Math.min(
    100,
    Math.round(composite01 * 100) + Math.min(4, Math.round(getRetailerDiscoveryBoost(p.store) * 0.55))
  );

  // “Model layer” — emphasizes absolute quality + trust vs pure deal-chasing
  const modelLayer = Math.round(
    clamp01(
      0.34 * ratingNorm +
        0.28 * trustNorm +
        0.22 * valueNorm +
        0.1 * reviewDepth +
        0.06 * trustRank
    ) * 100
  );

  const signals: IntelligenceSignals = {
    priceFit: toSignal01(priceFit),
    rating: toSignal01(ratingNorm),
    reviewDepth: toSignal01(reviewDepth),
    retailerTrust: toSignal01(trustNorm),
    delivery: toSignal01(delivery),
    popularity: toSignal01(pop),
    pricePerformance: toSignal01(valueNorm),
    discountQuality: toSignal01(discount),
    categoryFit: toSignal01(categoryFitBlend),
  };

  return { composite, modelLayer, signals, category };
}

export function computeListMaxValueRaw(products: QuantProduct[]): number {
  let max = 0;
  for (const p of products) {
    const r = ratingValue(p.rating);
    const raw = (Math.pow(clamp01(r / 5), 1.25) * 20) / Math.sqrt(Math.max(p.price, 1));
    if (raw > max) max = raw;
  }
  return max;
}
