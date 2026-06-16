/**
 * Phase 3D — Trust-driven composite ranking.
 * Combines legacy composite base + bounded truthRankDelta (2C–2K) into auditable final scores.
 */

import { listingTextQuality01 } from "@/lib/commerce/listingQuality";
import { tasteCompositeLift, tasteProductAlignment01 } from "@/lib/commerce-os";
import { adaptiveListingScoreDelta } from "@/lib/intelligence/adaptiveRanking";
import { alternativeSeekingRankAdjustment, relationshipGraphRankAdjustment } from "@/lib/intelligence/alternativeRanking";
import { extractHumanSearchIntent } from "@/lib/intelligence/searchIntentBrain";
import { intentCompositeLift, type CommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import type { ProductCategorySlug } from "@/lib/intelligence/types";
import { normalizeQiListingIdentity } from "@/lib/intelligence/normalizeIntelligenceSignals";
import { queryListingRelevance01 } from "@/lib/intelligence/queryRelevance";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";
import {
  getFinalComposite,
  getStoreTrustScore,
  ratingValue,
  type QuantProduct,
} from "@/lib/shoppingScore";
import {
  buildIntentAwareRetrieval,
  intentRetrievalRankNudge,
} from "@/lib/truth/intentAwareRetrievalEngine";
import { computeTruthRankContributions } from "@/lib/truth/truthIntegrationKernel";
import {
  buildRankingDecisionRecord,
  type RankingDecisionRecord,
} from "@/lib/truth/rankingDecisionRecord";
import { buildTruthFoundationSnapshot } from "@/lib/truth/truthEvidenceBuilder";
import type { TruthFoundationPrefetchEntry, TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";
import {
  resolveUnifiedSearchIntent,
  type PurchaseIntent,
  type UnifiedSearchIntent,
} from "@/lib/truth/unifiedIntentPipeline";

export type TrustDrivenRankResult = {
  finalScore: number;
  legacyBase: number;
  truthDelta: number;
  record: RankingDecisionRecord;
};

export type TrustDrivenRankOptions = {
  truthPrefetchByLink?: Map<string, TruthFoundationPrefetchEntry> | null;
  unified?: UnifiedSearchIntent;
  /** Batch memoization — same inputs return same snapshot within one sort. */
  foundationCache?: Map<string, TruthFoundationSnapshot>;
};

function foundationCacheKey(
  product: QuantProduct,
  query: string,
  prefetch?: TruthFoundationPrefetchEntry | null
): string {
  return `${product.link}::${query}::${prefetch?.canonicalSkuId ?? "inline"}`;
}

function resolveTruthFoundationSnapshot(args: {
  product: QuantProduct;
  searchQuery: string;
  prefetch?: TruthFoundationPrefetchEntry | null;
  foundationCache?: Map<string, TruthFoundationSnapshot>;
}): TruthFoundationSnapshot {
  const key = foundationCacheKey(args.product, args.searchQuery, args.prefetch);
  const cached = args.foundationCache?.get(key);
  if (cached) return cached;

  const foundation = buildTruthFoundationSnapshot({
    product: args.product,
    listingUrl: args.product.link,
    searchQuery: args.searchQuery,
    prefetch: args.prefetch ?? null,
  });
  args.foundationCache?.set(key, foundation);
  return foundation;
}

function anchorInflationPenalty(p: QuantProduct): number {
  if (p.oldPrice == null || p.oldPrice <= p.price || p.price <= 0) return 0;
  const pct = ((p.oldPrice - p.price) / p.oldPrice) * 100;
  if (pct >= 62) return 14;
  if (pct >= 48) return 8;
  if (pct >= 38) return 4;
  return 0;
}

function intentCompositeDelta(
  p: QuantProduct,
  list: QuantProduct[],
  intent: PurchaseIntent,
  medianPrice: number,
  query: string,
  intents: CommerceSearchIntents
): number {
  if (intent === "neutral") return 0;
  const trust = getStoreTrustScore(p.store);
  const del = (p.qiSignals?.delivery ?? 52) / 100;
  const rev = p.reviewsCount ?? 0;
  const pop = Math.min(6, Math.log10(rev + 1) * 2.2);
  const r = ratingValue(p.rating);

  switch (intent) {
    case "budget": {
      if (medianPrice <= 0 || p.price <= 0) return 0;
      const under = (medianPrice - p.price) / medianPrice;
      let beat = under > 0.08 ? 5.5 : under > 0.03 ? 3.2 : 1.2;
      beat = trust >= 52 ? beat : beat * 0.55;
      const dh = intents.dealHunter || intents.realDiscountOnly;
      if (dh && p.oldPrice != null && p.oldPrice > p.price) {
        const pct = (p.oldPrice - p.price) / p.oldPrice;
        beat += pct > 0.18 ? 3.1 : pct > 0.1 ? 1.8 : 0.6;
      }
      return beat;
    }
    case "premium": {
      const tier = trust * 0.045 + (r >= 4.35 ? 3.2 : r > 0 ? 0.8 : 0);
      return tier + pop * 0.35;
    }
    case "fast": {
      return del * 7.5 + (trust >= 60 ? 1.2 : 0);
    }
    case "value": {
      const consist = r >= 4.25 && rev >= 24 ? 2.8 : r > 0 && r < 3.9 && rev >= 12 ? -2.4 : 0;
      let v = trust * 0.028 + pop * 0.45 + consist;
      if (
        intents.cheapestTrusted &&
        trust >= 78 &&
        medianPrice > 0 &&
        p.price > 0 &&
        p.price <= medianPrice * 1.04
      ) {
        v += 2.3;
      }
      return v;
    }
    default:
      return 0;
  }
}

/** Legacy composite score stack (pre-truth) — preserved from searchRankEnhance. */
export function computeLegacyCompositeBase(args: {
  product: QuantProduct;
  list: QuantProduct[];
  query: string;
  unified?: UnifiedSearchIntent;
}): number {
  const { product: p, list, query } = args;
  const unified = args.unified ?? resolveUnifiedSearchIntent(query);
  const intents = unified.commerceIntents;
  const humanSearch = unified.query ? extractHumanSearchIntent(unified.query) : null;
  const intentEngine = unified.intentEngine;
  const intent = unified.purchaseIntent;
  const prices = list.map((x) => x.price).filter((n) => n > 0).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0;

  let c = getFinalComposite(p, list);
  let anchorPen = anchorInflationPenalty(p);
  if (intents.realDiscountOnly) anchorPen *= 1.28;
  c -= anchorPen;
  const trust = getStoreTrustScore(p.store);
  const rev = p.reviewsCount ?? 0;
  const r = ratingValue(p.rating);
  const del = p.qiSignals?.delivery ?? 52;
  const pop = Math.min(5, Math.log10(rev + 1) * 1.35);
  const reviewConsist =
    r >= 4.2 && rev >= 28 ? 2.2 : r > 0 && r < 3.85 && rev >= 15 ? -3.5 : 0;
  c += pop;
  c += reviewConsist;
  c += trust >= 78 ? 1.8 : trust < 46 ? -2.6 : 0;
  c += del >= 72 ? 1.2 : del < 44 ? -1.1 : 0;
  c += intentCompositeDelta(p, list, intent, medianPrice, query, intents);
  if (intents.buyNowUrgency) {
    c += trust >= 72 ? 0.55 : -0.28;
    c += del >= 65 ? 0.38 : -0.15;
  }
  if (intents.storeDealHunter && trust >= 74) c += 0.42;
  if (intents.riskAvoidance) {
    c += trust >= 80 ? 1.85 : trust < 52 ? -3.4 : trust < 64 ? -1.1 : 0.35;
  }
  if (intents.qualitySeeking) {
    c += r >= 4.2 && rev >= 20 ? 2.0 : r > 0 && r < 3.95 && rev >= 10 ? -2.8 : 0;
  }
  if (intents.portableLight && /\b(air|thin|light|ultra|gram|lg\s*gram|carbon|feather|compact)\b/i.test(p.title)) {
    c += 1.15;
  }
  if (intents.gaming && intents.portableLight && p.qiCategory === "electronics" && /\b(ultra|air|thin|light|gram|4050|4060|4070)\b/i.test(p.title)) {
    c += 0.95;
  }
  if (intents.lifestyleCreator && /\b(pro|studio|ultra|creator|oled|4k|microphone|webcam|camera)\b/i.test(p.title)) {
    c += 0.65;
  }
  const priceVsMedian =
    medianPrice > 0 && p.price > 0 ? (medianPrice - p.price) / medianPrice : undefined;
  const cat = (p.qiCategory ?? "general") as ProductCategorySlug;
  const disc01 =
    p.oldPrice != null && p.oldPrice > p.price && p.price > 0
      ? (p.oldPrice - p.price) / p.oldPrice
      : undefined;
  c += intentCompositeLift(intents, cat, trust / 100, priceVsMedian, { headlineDiscount01: disc01 }) * 92;
  c +=
    tasteCompositeLift(intents.taste, cat, trust / 100, tasteProductAlignment01(p, intents.taste), priceVsMedian) *
    92;
  c += alternativeSeekingRankAdjustment(query, p, medianPrice, intents);
  c += relationshipGraphRankAdjustment(query, p, list, intents);
  c += (listingTextQuality01(p.title) - 0.55) * 5.8;
  c += (queryListingRelevance01(query, p) - 0.5) * 10;
  if (humanSearch) {
    c += adaptiveListingScoreDelta(p, list, intents, humanSearch);
  }
  if (intentEngine) {
    const retrieval = buildIntentAwareRetrieval({ product: p, intentEngine });
    c += intentRetrievalRankNudge(retrieval.retrievalIntentScore);
  }
  const mp = getMarketplaceSellerRiskTier(p.store, p.title);
  if (mp === "high") c -= 3.4;
  else if (mp === "medium") c -= 1.05;
  const eliteRaw = p.qiListingIdentity;
  if (eliteRaw) {
    const eliteId = normalizeQiListingIdentity(eliteRaw);
    c -= Math.round(eliteId.semanticMismatchPenalty01 * 11);
    c -= Math.round(eliteId.contaminationRisk01 * 7);
    c += Math.round(eliteId.bundleIntegrity01 * 4);
  }
  return Math.round(c * 10) / 10;
}

/** Resolve bounded truth rank delta for one listing (2C–2K snapshots only). */
export function resolveTruthRankDelta(args: {
  product: QuantProduct;
  searchQuery: string;
  prefetch?: TruthFoundationPrefetchEntry | null;
  foundationCache?: Map<string, TruthFoundationSnapshot>;
}): number {
  const foundation = resolveTruthFoundationSnapshot({
    product: args.product,
    searchQuery: args.searchQuery,
    prefetch: args.prefetch ?? null,
    foundationCache: args.foundationCache,
  });
  return computeTruthRankContributions(foundation).truthRankDelta;
}

/** Compute trust-driven final score + auditable decision record for one product. */
export function computeTrustDrivenRankScore(args: {
  product: QuantProduct;
  list: QuantProduct[];
  query: string;
  prefetch?: TruthFoundationPrefetchEntry | null;
  unified?: UnifiedSearchIntent;
  foundationCache?: Map<string, TruthFoundationSnapshot>;
}): TrustDrivenRankResult {
  const legacyBase = computeLegacyCompositeBase({
    product: args.product,
    list: args.list,
    query: args.query,
    unified: args.unified,
  });
  const foundation = resolveTruthFoundationSnapshot({
    product: args.product,
    searchQuery: args.query,
    prefetch: args.prefetch ?? null,
    foundationCache: args.foundationCache,
  });
  const truthDelta = computeTruthRankContributions(foundation).truthRankDelta;
  const finalScore = Math.round((legacyBase + truthDelta) * 10) / 10;
  const record = buildRankingDecisionRecord({
    link: args.product.link,
    foundation,
    baseScore: legacyBase,
    finalRankScore: finalScore,
  });

  return { finalScore, legacyBase, truthDelta, record };
}

/** Sort products by trust-driven final score (desc). */
export function sortProductsByTrustDrivenRank(
  list: QuantProduct[],
  query: string,
  options?: TrustDrivenRankOptions
): { sorted: QuantProduct[]; scoresByLink: Map<string, TrustDrivenRankResult> } {
  if (list.length === 0) {
    return { sorted: list, scoresByLink: new Map() };
  }

  const unified = options?.unified ?? resolveUnifiedSearchIntent(query);
  const scoresByLink = new Map<string, TrustDrivenRankResult>();
  const foundationCache = options?.foundationCache ?? new Map<string, TruthFoundationSnapshot>();

  for (const product of list) {
    scoresByLink.set(
      product.link,
      computeTrustDrivenRankScore({
        product,
        list,
        query,
        prefetch: options?.truthPrefetchByLink?.get(product.link) ?? null,
        unified,
        foundationCache,
      })
    );
  }

  const sorted = [...list].sort((a, b) => {
    const scoreA = scoresByLink.get(a.link)?.finalScore ?? 0;
    const scoreB = scoresByLink.get(b.link)?.finalScore ?? 0;
    return scoreB - scoreA;
  });

  return { sorted, scoresByLink };
}

/** Derive unified link order from trust-driven scores (stable tie-break on original order). */
export function trustDrivenRankOrder(
  links: string[],
  scoresByLink: Map<string, TrustDrivenRankResult>
): string[] {
  const indexByLink = new Map(links.map((link, index) => [link, index]));
  return [...links].sort((a, b) => {
    const scoreA = scoresByLink.get(a)?.finalScore;
    const scoreB = scoresByLink.get(b)?.finalScore;
    if (typeof scoreA === "number" && typeof scoreB === "number" && scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return (indexByLink.get(a) ?? 0) - (indexByLink.get(b) ?? 0);
  });
}
