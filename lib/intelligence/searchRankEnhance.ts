import type { QuantProduct } from "@/lib/shoppingScore";
import { listingTextQuality01 } from "@/lib/commerce/listingQuality";
import {
  getFinalComposite,
  getStoreTrustScore,
  ratingValue,
} from "@/lib/shoppingScore";
import { queryListingRelevance01 } from "@/lib/intelligence/queryRelevance";
import { adaptiveListingScoreDelta } from "@/lib/intelligence/adaptiveRanking";
import { extractHumanSearchIntent } from "@/lib/intelligence/searchIntentBrain";
import {
  intentCompositeLift,
  parseCommerceSearchIntents,
  type CommerceSearchIntents,
} from "@/lib/intelligence/searchIntentV2";
import type { ProductCategorySlug } from "@/lib/intelligence/types";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";
import { relationshipGraphRankAdjustment, alternativeSeekingRankAdjustment } from "@/lib/intelligence/alternativeRanking";
import { tasteCompositeLift, tasteProductAlignment01 } from "@/lib/commerce-os";
import { normalizeQiListingIdentity } from "@/lib/intelligence/normalizeIntelligenceSignals";

export type PurchaseIntent =
  | "neutral"
  | "budget"
  | "premium"
  | "value"
  | "fast";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function normalizeStore(store: string): string {
  return store.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Collapse near-duplicate rows from the same retailer (re-list noise, feed dupes).
 * Preserves first-seen order among survivors.
 */
export function dedupeProductList(list: QuantProduct[]): QuantProduct[] {
  if (list.length < 2) return list;

  const groups = new Map<string, QuantProduct[]>();
  for (const p of list) {
    const key = `${normalizeStore(p.store)}::${normalizeTitle(p.title)}`;
    const g = groups.get(key);
    if (g) g.push(p);
    else groups.set(key, [p]);
  }

  const keep = new Set<string>();

  for (const [, g] of groups) {
    if (g.length === 1) {
      keep.add(g[0].link);
      continue;
    }
    const priceClusters: QuantProduct[][] = [];
    for (const p of g) {
      let placed = false;
      for (const c of priceClusters) {
        const ref = c[0];
        if (ref.price <= 0 || p.price <= 0) {
          if (ref.price === p.price) {
            c.push(p);
            placed = true;
            break;
          }
          continue;
        }
        const rel = Math.abs(p.price - ref.price) / Math.max(ref.price, p.price);
        if (rel < 0.022) {
          c.push(p);
          placed = true;
          break;
        }
      }
      if (!placed) priceClusters.push([p]);
    }
    for (const c of priceClusters) {
      c.sort((a, b) => getFinalComposite(b, list) - getFinalComposite(a, list));
      keep.add(c[0].link);
    }
  }

  return list.filter((p) => keep.has(p.link));
}

/**
 * When two ultra-low-trust rows share the same title and nearly the same price, keep the stronger composite only.
 */
function dedupeLowTrustNoiseAcrossStores(list: QuantProduct[]): QuantProduct[] {
  if (list.length < 2) return list;
  const byTitle = new Map<string, QuantProduct[]>();
  for (const p of list) {
    const k = normalizeTitle(p.title);
    if (k.length < 8) continue;
    const g = byTitle.get(k) ?? [];
    g.push(p);
    byTitle.set(k, g);
  }
  const drop = new Set<string>();
  for (const [, g] of byTitle) {
    if (g.length < 2) continue;
    const sorted = [...g].sort((a, b) => getFinalComposite(b, list) - getFinalComposite(a, list));
    const head = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const b = sorted[i];
      const ta = getStoreTrustScore(head.store);
      const tb = getStoreTrustScore(b.store);
      if (ta >= 55 || tb >= 55) continue;
      if (head.price <= 0 || b.price <= 0) continue;
      const rel = Math.abs(head.price - b.price) / Math.max(head.price, b.price);
      if (rel < 0.026) drop.add(b.link);
    }
  }
  if (drop.size === 0) return list;
  return list.filter((p) => !drop.has(p.link));
}

/** Dedupe retailer noise, then collapse suspicious cross-store duplicates. */
export function dedupeSearchTray(list: QuantProduct[]): QuantProduct[] {
  return dedupeLowTrustNoiseAcrossStores(dedupeProductList(list));
}

function anchorInflationPenalty(p: QuantProduct): number {
  if (p.oldPrice == null || p.oldPrice <= p.price || p.price <= 0) return 0;
  const pct = ((p.oldPrice - p.price) / p.oldPrice) * 100;
  if (pct >= 62) return 14;
  if (pct >= 48) return 8;
  if (pct >= 38) return 4;
  return 0;
}

export function purchaseIntentFromQuery(q: string): PurchaseIntent {
  const intents = parseCommerceSearchIntents(q);
  const s = q.toLowerCase();
  if (
    intents.deliveryCare ||
    /\b(fast\s+shipping|overnight|next\s+day|two.day|2.day|quick\s+delivery|arrive\s+fast)\b/.test(s)
  ) {
    return "fast";
  }
  if (
    intents.budget ||
    intents.dealHunter ||
    intents.realDiscountOnly ||
    /\b(cheap|budget|affordable|lowest|under\s+(\$|€|£|eur|gbp|usd)|save\s+money|discount|clearance|bargain)\b/.test(
      s
    )
  ) {
    return "budget";
  }
  if (
    intents.premium ||
    intents.luxury ||
    intents.aestheticPremium ||
    intents.quietLuxury ||
    /\b(premium|luxury|flagship|best\s+quality|pro\s+model|top\s+tier|high.end)\b/.test(s)
  ) {
    return "premium";
  }
  if (
    /\b(best\s+value|bang\s+for|worth\s+it|value\s+pick|price.to.quality)\b/.test(s) ||
    intents.productivity ||
    intents.gaming ||
    intents.explicitBestValue ||
    intents.longTermValue ||
    intents.comfortSeeking ||
    intents.schoolUse ||
    intents.giftUse ||
    intents.alternativeSeeking ||
    intents.comparisonIntent ||
    intents.qualitySeeking
  ) {
    return "value";
  }
  return "neutral";
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

/**
 * Composite ordering with lightweight query intent, review popularity, trust,
 * delivery signal, and inflated-anchor suppression (no per-row deal engine — keeps search fast).
 */
export function sortByCompositeRankEnhanced(list: QuantProduct[], query: string): QuantProduct[] {
  if (list.length === 0) return list;
  const intents = parseCommerceSearchIntents(query);
  const humanSearch = query.trim() ? extractHumanSearchIntent(query) : null;
  const intent = purchaseIntentFromQuery(query);
  const prices = list.map((x) => x.price).filter((n) => n > 0).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0;

  const rankScore = (p: QuantProduct): number => {
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
    return c;
  };

  return [...list].sort((a, b) => rankScore(b) - rankScore(a));
}
