/**
 * QuantAI Semantic Reranker v1 — search-only quality pass.
 * Reorders and trims obvious junk after upstream search without UI changes or heavy models.
 */

import { listingTextQuality01 } from "@/lib/commerce/listingQuality";
import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";
import { normalizeQiListingIdentity } from "@/lib/intelligence/normalizeIntelligenceSignals";
import { assessStructuredProductIdentity } from "@/lib/intelligence/productIdentity";
import { queryListingRelevance01 } from "@/lib/intelligence/queryRelevance";
import {
  buildSearchQueryUnderstanding,
  type SemanticQueryUnderstanding,
} from "@/lib/search/queryUnderstanding";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";

const memo = new Map<string, SemanticQueryUnderstanding>();

function queryBrain(query: string): SemanticQueryUnderstanding {
  const key = query.trim().toLowerCase().slice(0, 180);
  const cached = memo.get(key);
  if (cached) return cached;
  const next = buildSearchQueryUnderstanding(query);
  if (memo.size > 80) memo.clear();
  memo.set(key, next);
  return next;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function normText(p: QuantProduct): string {
  return `${p.title} ${p.store} ${Array.isArray(p.extensions) ? p.extensions.join(" ") : ""} ${p.availability ?? ""}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordCoverage(text: string, keywords: string[]): number {
  if (!keywords.length) return 0.45;
  let hits = 0;
  let weight = 0;
  for (const kw of keywords.slice(0, 24)) {
    const k = kw.toLowerCase().trim();
    if (k.length < 2) continue;
    const w = k.length >= 6 ? 1.15 : 1;
    weight += w;
    if (text.includes(k)) hits += w;
    else if (k.endsWith("s") && text.includes(k.slice(0, -1))) hits += w * 0.7;
  }
  return weight > 0 ? clamp(hits / weight, 0, 1) : 0.45;
}

function categoryFit(q: SemanticQueryUnderstanding, text: string): number {
  switch (q.productCategory) {
    case "shoes":
      return /\b(shoe|sneaker|trainer|boot|yeezy|jordan|dunk|air force)\b/i.test(text) ? 1 : 0.15;
    case "phone":
      return /\b(phone|iphone|galaxy|pixel|smartphone|mobile)\b/i.test(text) ? 1 : 0.12;
    case "laptop":
      return /\b(laptop|notebook|macbook|thinkpad|ideapad|vivobook|zenbook|ultrabook)\b/i.test(text) ? 1 : 0.16;
    case "audio":
      return /\b(headphone|earbud|airpod|bose|sony wh|wireless audio|noise cancelling)\b/i.test(text) ? 1 : 0.16;
    case "furniture":
      return /\b(sofa|couch|chair|desk|table|furniture|sectional)\b/i.test(text) ? 1 : 0.18;
    case "fragrance":
      return /\b(perfume|fragrance|parfum|cologne|eau de|edp|edt)\b/i.test(text) ? 1 : 0.18;
    case "watch":
      return /\b(watch|smartwatch|wearable|wrist)\b/i.test(text) ? 1 : 0.18;
    case "desk_setup":
      return /\b(desk|workspace|monitor|keyboard|mouse|lamp|stand|organizer)\b/i.test(text) ? 1 : 0.22;
    case "beauty":
      return /\b(beauty|makeup|skincare|serum|cream|cosmetic)\b/i.test(text) ? 1 : 0.24;
    case "fashion":
      return /\b(jacket|dress|shirt|hoodie|fashion|outfit|bag|shoe)\b/i.test(text) ? 1 : 0.24;
    case "home":
      return /\b(home|kitchen|decor|bedroom|living room|furniture)\b/i.test(text) ? 1 : 0.24;
    case "electronics":
      return /\b(electronic|monitor|gpu|camera|tablet|console|tv|display)\b/i.test(text) ? 1 : 0.24;
    default:
      return 0.55;
  }
}

function aestheticFit(q: SemanticQueryUnderstanding, text: string): number {
  if (q.aestheticDirection === "neutral" && q.styleIntent.length === 0) return 0.5;
  let score = 0.36;
  if (q.aestheticDirection === "minimal_clean" && /\b(clean|minimal|simple|white|black|matte|wood|slim)\b/i.test(text)) {
    score += 0.35;
  }
  if (q.aestheticDirection === "premium_luxury" && /\b(premium|luxury|pro|leather|metal|designer|gold|parfum|edp)\b/i.test(text)) {
    score += 0.36;
  }
  if (q.aestheticDirection === "sporty" && /\b(sport|running|gym|athletic|training|streetwear)\b/i.test(text)) score += 0.32;
  if (q.aestheticDirection === "cozy_home" && /\b(soft|cozy|comfortable|fabric|velvet|living room)\b/i.test(text)) score += 0.32;
  if (q.styleIntent.includes("long_lasting") && /\b(intense|parfum|edp|long lasting|performance)\b/i.test(text)) score += 0.24;
  return clamp(score, 0, 1);
}

function purposeFit(q: SemanticQueryUnderstanding, text: string): number {
  if (!q.usageContext.length && !q.productPurpose.length) return 0.5;
  let score = 0.35;
  if (q.usageContext.includes("gaming") && /\b(gaming|rtx|geforce|hz|performance|esports)\b/i.test(text)) score += 0.32;
  if (q.usageContext.includes("travel") && /\b(lightweight|portable|compact|thin|slim|air)\b/i.test(text)) score += 0.3;
  if (q.usageContext.includes("student") && /\b(student|school|budget|portable|backpack|laptop)\b/i.test(text)) score += 0.2;
  if (q.productPurpose.includes("home_aesthetic") && /\b(sofa|couch|living room|modern|premium|comfortable)\b/i.test(text)) score += 0.28;
  if (q.productPurpose.includes("scent_performance") && /\b(edp|parfum|intense|long lasting|eau de parfum)\b/i.test(text)) score += 0.3;
  return clamp(score, 0, 1);
}

function budgetPremiumFit(q: SemanticQueryUnderstanding, p: QuantProduct, medianPrice: number, text: string): number {
  let score = 0.5;
  const underMedian = medianPrice > 0 && p.price > 0 ? (medianPrice - p.price) / medianPrice : 0;
  if (q.budgetIntent01 >= 0.55) score += clamp(underMedian, -0.25, 0.45) * 0.75;
  if (q.premiumIntent01 >= 0.55) {
    score += /\b(premium|luxury|pro|max|ultra|designer|leather|metal|parfum|edp)\b/i.test(text) ? 0.18 : -0.08;
  }
  if (q.qualityExpectation === "value") {
    score += underMedian > 0 ? 0.1 : -0.03;
    score += ratingValue(p.rating) >= 4.1 ? 0.08 : 0;
  }
  return clamp(score, 0, 1);
}

function semanticScore(
  q: SemanticQueryUnderstanding,
  p: QuantProduct,
  list: QuantProduct[],
  medianPrice: number,
  canonicalQuery?: CanonicalQueryContract
): number {
  const text = normText(p);
  const trust = getStoreTrustScore(p.store) / 100;
  const id = p.qiListingIdentity ? normalizeQiListingIdentity(p.qiListingIdentity) : null;
  const mp = getMarketplaceSellerRiskTier(p.store, p.title);
  const category01 = categoryFit(q, text);
  let keywords01 = keywordCoverage(text, q.semanticKeywords);
  if (q.languages.includes("arabic") && q.languages.includes("english")) {
    const mixedTokens = q.envelope.split(/\s+/).filter((t) => t.length >= 2).slice(0, 28);
    keywords01 = Math.max(keywords01, keywordCoverage(text, mixedTokens) * 0.92);
  }
  const queryRel = queryListingRelevance01(q.rewritten || q.raw, p);
  const aesthetic01 = aestheticFit(q, text);
  const purpose01 = purposeFit(q, text);
  const budget01 = budgetPremiumFit(q, p, medianPrice, text);
  const quality01 = clamp((ratingValue(p.rating) / 5) * 0.45 + trust * 0.38 + ((p.qiProductUnderstanding?.productConfidence ?? 60) / 100) * 0.17, 0, 1);
  const merchant01 = clamp((p.qiMerchantConfidence01 ?? trust) * 0.7 + trust * 0.3, 0, 1);
  let score =
    category01 * 27 +
    keywords01 * 16 +
    queryRel * 16 +
    aesthetic01 * 12 +
    purpose01 * 10 +
    budget01 * 7 +
    quality01 * 7 +
    merchant01 * 5;

  if (q.alternativeIntent.active && q.alternativeIntent.cheaper) {
    const underMedian = medianPrice > 0 && p.price > 0 ? (medianPrice - p.price) / medianPrice : 0;
    score += clamp(underMedian, -0.15, 0.45) * 10;
  }

  if (id) {
    score -= id.semanticMismatchPenalty01 * 22;
    score -= id.contaminationRisk01 * 18;
    score -= id.accessoryLikelihood01 * (q.productCategory === "unknown" ? 4 : 13);
    score += id.bundleIntegrity01 * 5;
  }
  const structured = assessStructuredProductIdentity({ product: p, canonicalQuery, listingIdentity: id });
  if (structured.relation === "exact_product") score += 5;
  else if (structured.relation === "same_product_family" || structured.relation === "variant") score += 2.5;
  else if (!structured.isMainProduct) score -= 14;
  if (structured.relation === "compatible_item" || structured.relation === "replacement_part") score -= 8;
  if (structured.relation === "fake_placeholder" || structured.relation === "wrong_product") score -= 18;
  if (mp === "high") score -= 9;
  else if (mp === "medium") score -= 3.5;
  score += (listingTextQuality01(p.title) - 0.5) * 9;
  if (p.qiGlobalCommerce?.identityRelation === "fake_or_replica" || p.qiGlobalCommerce?.identityRelation === "wrong_product") {
    score -= 18;
  }
  return score;
}

function isHardJunk(q: SemanticQueryUnderstanding, p: QuantProduct, score: number, canonicalQuery?: CanonicalQueryContract): boolean {
  const id = p.qiListingIdentity ? normalizeQiListingIdentity(p.qiListingIdentity) : null;
  const trust = getStoreTrustScore(p.store);
  if (id?.commercialRoles.includes("replica_risk") || id?.commercialRoles.includes("packaging_only")) return true;
  const structured = assessStructuredProductIdentity({ product: p, canonicalQuery, listingIdentity: id });
  if (structured.relation === "fake_placeholder" || structured.relation === "wrong_product") return true;
  if ((structured.relation === "compatible_item" || structured.relation === "replacement_part") && q.productCategory !== "unknown") return true;
  if (id && id.semanticMismatchPenalty01 >= 0.72 && id.contaminationRisk01 >= 0.68) return true;
  if (q.productCategory !== "unknown" && id && id.accessoryLikelihood01 >= 0.82 && id.semanticMismatchPenalty01 >= 0.5) return true;
  if (getMarketplaceSellerRiskTier(p.store, p.title) === "high" && trust < 42 && score < 36) return true;
  return false;
}

/** Search-only semantic rerank: keeps tray fast, stable, and layout-neutral. */
export function semanticRerankSearchResults(
  products: QuantProduct[],
  query: string,
  canonicalQuery?: CanonicalQueryContract
): QuantProduct[] {
  if (products.length <= 1 || !query.trim()) return products;
  const q = canonicalQuery?.semantic ?? queryBrain(query);
  const prices = products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0;
  const scored = products.map((p, index) => ({
    p,
    index,
    score: semanticScore(q, p, products, medianPrice, canonicalQuery),
  }));

  const survivors = scored.filter((x) => !isHardJunk(q, x.p, x.score, canonicalQuery));
  const pool = survivors.length >= Math.min(5, products.length) ? survivors : scored;

  return pool
    .sort((a, b) => {
      const d = b.score - a.score;
      if (Math.abs(d) > 0.001) return d;
      return a.index - b.index;
    })
    .map((x, i) => ({ ...x.p, qiRank: i }));
}
