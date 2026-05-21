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
import { assessModelGenerationConflict } from "@/lib/intelligence/modelGenerationGuard";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { bilingualMatchTokens } from "@/lib/search/bilingualMatchTokens";
import {
  hasLuxuryWatchIntent,
  isConsumerFitnessWatchListing,
  isLuxuryWatchListingEvidence,
  luxuryWatchIntent01,
} from "@/lib/search/luxuryWatchIntent";
import { computeFragranceTasteApplyDelta, isFragranceTasteApplyEnabled } from "@/lib/taste/fragranceTasteApply";
import { computeFurnitureTasteApplyDelta, isFurnitureCanaryQuery, isFurnitureTasteApplyEnabled } from "@/lib/taste/furnitureTasteApply";
import {
  computeUnifiedTasteApplyDelta,
  stabilizeUnifiedHardSuppressionOrder,
} from "@/lib/taste/unifiedTasteApply";
import { computeUnifiedTasteSignals } from "@/lib/taste/unifiedTasteIdentity";
import { isUnifiedTasteApplyEnabled } from "@/lib/taste/unifiedTasteFlags";
import {
  computeIntentApplyDelta,
  stabilizeIntentHardSuppressionOrder,
} from "@/lib/intent/intentApply";
import { computeIntentIntelligence } from "@/lib/intent/intentIntelligenceEngine";
import { isIntentIntelligenceApplyEnabled } from "@/lib/intent/intentIntelligenceFlags";
import { computeWatchTasteApplyDelta, isWatchTasteApplyEnabled } from "@/lib/taste/watchTasteApply";

const memo = new Map<string, SemanticQueryUnderstanding>();
const unifiedSignalsMemo = new Map<string, ReturnType<typeof computeUnifiedTasteSignals>>();
const intentMemo = new Map<string, ReturnType<typeof computeIntentIntelligence>>();

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
    case "watch": {
      const watchCue = /\b(watch|horloge|wristwatch|timepiece|chronograph)\b/i.test(text);
      if (!watchCue) return 0.16;
      if (hasLuxuryWatchIntent(q.envelope) || q.styleIntent.includes("luxury_watch_collector")) {
        if (isConsumerFitnessWatchListing(text) && !isLuxuryWatchListingEvidence(text)) return 0.12;
        if (isLuxuryWatchListingEvidence(text)) return 1;
        return 0.42;
      }
      return watchCue ? 1 : 0.18;
    }
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

function hasExplicitAestheticIntent(q: SemanticQueryUnderstanding): boolean {
  if (q.aestheticDirection !== "neutral") return true;
  if (q.premiumIntent01 >= 0.52 || q.usageContext.includes("focus")) return true;
  if (q.styleIntent.some((s) => /premium|minimal|clean|luxury|aesthetic/i.test(s))) return true;
  return /\b(aesthetic|style|looking|minimal|premium|luxury|focus|clean|designer|quiet luxury)\b/i.test(q.raw);
}

function aestheticFit(q: SemanticQueryUnderstanding, text: string): number {
  if (q.aestheticDirection === "neutral" && q.styleIntent.length === 0 && !hasExplicitAestheticIntent(q)) return 0.5;
  let score = 0.36;
  if (q.aestheticDirection === "minimal_clean" && /\b(clean|minimal|simple|white|black|matte|wood|slim|scandi|monochrome)\b/i.test(text)) {
    score += 0.38;
  }
  if (q.aestheticDirection === "premium_luxury" && /\b(premium|luxury|pro|leather|metal|designer|gold|parfum|edp|high end|luxe)\b/i.test(text)) {
    score += 0.4;
  }
  if (q.premiumIntent01 >= 0.52 && /\b(premium|luxury|designer|leather|metal|parfum|edp|high end)\b/i.test(text)) {
    score += 0.12;
  }
  if (q.usageContext.includes("focus") && /\b(noise cancelling|anc|over[-\s]?ear|quiet|focus|wireless headphone)\b/i.test(text)) {
    score += 0.14;
  }
  if (q.aestheticDirection === "sporty" && /\b(sport|running|gym|athletic|training|streetwear)\b/i.test(text)) score += 0.32;
  if (q.aestheticDirection === "cozy_home" && /\b(soft|cozy|comfortable|fabric|velvet|living room)\b/i.test(text)) score += 0.32;
  if (q.styleIntent.includes("long_lasting") && /\b(intense|parfum|edp|long lasting|performance)\b/i.test(text)) score += 0.24;
  if (q.styleIntent.includes("clean_minimal") && /\b(minimal|clean|simple|matte|wood)\b/i.test(text)) score += 0.1;
  if (q.styleIntent.includes("premium_look") && /\b(premium|luxury|designer|leather|velvet)\b/i.test(text)) score += 0.1;
  return clamp(score, 0, 1);
}

function isDeskSetupAccessoryPart(text: string): boolean {
  return /\b(monitor\s+stand|desk\s+organizer|desk\s+shelf|desk\s+pad|mouse\s+pad|pen\s+holder|cable\s+tray|monitor\s+riser|organizer|desk\s+mat|keyboard\s+tray)\b/i.test(
    text
  );
}

function isDeskSetupMainProduct(text: string): boolean {
  return /\b(desk|bureau|standing\s+desk|gaming\s+desk|office\s+desk|workstation|sit[-\s]?stand|monitor\b|keyboard\b|office\s+chair)\b/i.test(
    text
  );
}

function purposeFit(q: SemanticQueryUnderstanding, text: string): number {
  if (!q.usageContext.length && !q.productPurpose.length && !q.constraints.useCase) return 0.5;
  let score = 0.35;
  if (q.usageContext.includes("gaming") && /\b(gaming|rtx|geforce|hz|performance|esports|144hz|240hz|hdmi|displayport)\b/i.test(text)) score += 0.32;
  if (q.usageContext.includes("focus") && /\b(noise cancelling|anc|over[-\s]?ear|wireless|headphone|wh-1000|quietcomfort)\b/i.test(text)) score += 0.34;
  if (q.usageContext.includes("travel") && /\b(lightweight|portable|compact|thin|slim|air)\b/i.test(text)) score += 0.3;
  if (q.usageContext.includes("student") && /\b(student|school|budget|portable|backpack|laptop)\b/i.test(text)) score += 0.2;
  if (q.productPurpose.includes("home_aesthetic") && /\b(sofa|couch|living room|modern|premium|comfortable)\b/i.test(text)) score += 0.28;
  if (q.productPurpose.includes("scent_performance") && /\b(edp|parfum|intense|long lasting|eau de parfum)\b/i.test(text)) score += 0.3;
  if (q.constraints.useCase === "gaming" && /\b(gaming|144hz|240hz|ps5|xbox)\b/i.test(text)) score += 0.28;
  if (q.constraints.useCase === "focus" && /\b(noise cancelling|anc|wireless)\b/i.test(text)) score += 0.28;
  if (q.constraints.platform === "ps5" && /\b(ps5|playstation|hdmi\s*2\.1|120hz|vrr)\b/i.test(text)) score += 0.26;
  return clamp(score, 0, 1);
}

function styleReferenceFit(q: SemanticQueryUnderstanding, text: string): number {
  const ref = q.constraints.styleReference?.toLowerCase().trim();
  if (!ref || ref.length < 3) return 0.5;
  const tokens = ref.split(/\s+/).filter((t) => t.length >= 3);
  if (!tokens.length) return 0.5;
  let hits = 0;
  for (const t of tokens) {
    if (text.includes(t)) hits += 1;
    else if (t.replace(/\s/g, "").length >= 5 && text.includes(t.replace(/\s/g, ""))) hits += 0.7;
  }
  return clamp(hits / tokens.length, 0, 1);
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
  const bilingual = bilingualMatchTokens(q.raw, 32);
  if (bilingual.length > 0) {
    keywords01 = Math.max(keywords01, keywordCoverage(text, bilingual) * 0.94);
  }
  const queryRel = queryListingRelevance01(q.rewritten || q.raw, p);
  const aesthetic01 = aestheticFit(q, text);
  const aestheticIntent = hasExplicitAestheticIntent(q);
  const purpose01 = purposeFit(q, text);
  const styleRef01 = styleReferenceFit(q, text);
  const budget01 = budgetPremiumFit(q, p, medianPrice, text);
  const quality01 = clamp((ratingValue(p.rating) / 5) * 0.45 + trust * 0.38 + ((p.qiProductUnderstanding?.productConfidence ?? 60) / 100) * 0.17, 0, 1);
  const merchant01 = clamp((p.qiMerchantConfidence01 ?? trust) * 0.7 + trust * 0.3, 0, 1);
  const aestheticWeight = aestheticIntent ? 18 : 12;
  const purposeWeight = q.usageContext.includes("focus") || q.constraints.useCase === "focus" ? 12 : 9;
  let score =
    category01 * 27 +
    keywords01 * 16 +
    queryRel * 16 +
    aesthetic01 * aestheticWeight +
    purpose01 * purposeWeight +
    styleRef01 * 6 +
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
    const accessoryPenalty = q.productCategory === "unknown" ? 4 : aestheticIntent ? 17 : 13;
    score -= id.accessoryLikelihood01 * accessoryPenalty;
    score += id.bundleIntegrity01 * 5;
  }

  if (aestheticIntent && q.productCategory !== "unknown" && id && id.accessoryLikelihood01 >= 0.42 && !canonicalQuery?.originalQuery.match(/\b(case|cover|organizer only)\b/i)) {
    score -= 6 + id.accessoryLikelihood01 * 8;
  }

  const luxuryWatchLane =
    q.productCategory === "watch" &&
    (luxuryWatchIntent01(q.envelope) >= 0.42 ||
      q.styleIntent.includes("luxury_watch_collector") ||
      (q.premiumIntent01 >= 0.52 && /\bluxury\b/i.test(q.raw)));

  if (luxuryWatchLane) {
    if (isWatchTasteApplyEnabled() && canonicalQuery) {
      score += computeWatchTasteApplyDelta(canonicalQuery.originalQuery, p, canonicalQuery);
    } else {
      if (isConsumerFitnessWatchListing(text) && !isLuxuryWatchListingEvidence(text)) {
        score -= 22;
      } else if (isLuxuryWatchListingEvidence(text)) {
        score += 8;
      }
      if (/\b(dress watch|automatic|mechanical|swiss|chronograph|sapphire|prestige|timepiece)\b/i.test(text)) {
        score += 5;
      }
    }
  } else if (q.productCategory === "watch" && (q.premiumIntent01 >= 0.45 || q.aestheticDirection === "premium_luxury")) {
    if (isConsumerFitnessWatchListing(text) && !isLuxuryWatchListingEvidence(text)) score -= 12;
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

  const gen = assessModelGenerationConflict(p, canonicalQuery);
  if (gen.conflict) score -= 8 + gen.severity01 * 14;

  if (canonicalQuery?.budget.maxPrice != null && p.price > 0) {
    const max = canonicalQuery.budget.maxPrice;
    if (p.price > max * 1.08) score -= 6 + Math.min(12, ((p.price - max) / max) * 18);
    else if (p.price <= max * 0.98) score += 3;
  }

  if (q.alternativeIntent.active && q.alternativeIntent.anchor) {
    const anchorHits = keywordCoverage(text, q.alternativeIntent.anchor.split(/\s+/).filter((t) => t.length >= 3));
    if (anchorHits >= 0.45) score += q.alternativeIntent.cheaper ? 4 : 2.5;
  }

  if (q.productCategory === "desk_setup" && !canonicalQuery?.originalQuery.match(/\b(case|cover|organizer only|stand only)\b/i)) {
    if (isDeskSetupAccessoryPart(text) && !isDeskSetupMainProduct(text)) score -= 14;
    else if (isDeskSetupMainProduct(text)) score += 5;
  }

  if (canonicalQuery?.intent.primary === "alternative" || q.alternativeIntent.active) {
    if (structured.relation === "same_product_family" || structured.relation === "variant") score += 3;
    if (structured.relation === "exact_product") score += 1.5;
  }

  if (q.productCategory === "fragrance" && isFragranceTasteApplyEnabled() && canonicalQuery) {
    score += computeFragranceTasteApplyDelta(canonicalQuery.originalQuery, p, canonicalQuery);
  }

  if (isFurnitureTasteApplyEnabled() && canonicalQuery && isFurnitureCanaryQuery(canonicalQuery, canonicalQuery.originalQuery)) {
    score += computeFurnitureTasteApplyDelta(canonicalQuery.originalQuery, p, canonicalQuery);
  }

  if (isUnifiedTasteApplyEnabled() && canonicalQuery) {
    const uKey = canonicalQuery.originalQuery.trim().toLowerCase().slice(0, 180);
    let signals = unifiedSignalsMemo.get(uKey);
    if (!signals) {
      signals = computeUnifiedTasteSignals({
        query: canonicalQuery.originalQuery,
        canonicalQuery,
        products: [],
      });
      unifiedSignalsMemo.set(uKey, signals);
    }
    score += computeUnifiedTasteApplyDelta({
      query: canonicalQuery.originalQuery,
      product: p,
      canonicalQuery,
      signals,
    });
  }

  if (isIntentIntelligenceApplyEnabled() && canonicalQuery) {
    const iKey = canonicalQuery.originalQuery.trim().toLowerCase().slice(0, 180);
    let intent = intentMemo.get(iKey);
    if (!intent) {
      intent = computeIntentIntelligence({ query: canonicalQuery.originalQuery, canonicalQuery });
      intentMemo.set(iKey, intent);
    }
    const prices = list.map((x) => x.price).filter((n) => n > 0).sort((a, b) => a - b);
    const med = prices[Math.floor(prices.length / 2)] ?? medianPrice;
    score += computeIntentApplyDelta({
      product: p,
      canonicalQuery,
      intent,
      medianPrice: med,
      products: list,
    }).delta;
  }

  return Math.round(score * 100) / 100;
}

function isHardJunk(q: SemanticQueryUnderstanding, p: QuantProduct, score: number, canonicalQuery?: CanonicalQueryContract): boolean {
  const id = p.qiListingIdentity ? normalizeQiListingIdentity(p.qiListingIdentity) : null;
  const trust = getStoreTrustScore(p.store);
  if (id?.commercialRoles.includes("replica_risk") || id?.commercialRoles.includes("packaging_only")) return true;
  const structured = assessStructuredProductIdentity({ product: p, canonicalQuery, listingIdentity: id });
  if (structured.relation === "fake_placeholder" || structured.relation === "wrong_product") return true;
  if (
    (structured.relation === "compatible_item" || structured.relation === "replacement_part") &&
    q.productCategory !== "unknown" &&
    !q.alternativeIntent.active &&
    canonicalQuery?.intent.primary !== "alternative"
  ) {
    return true;
  }
  if (id && id.semanticMismatchPenalty01 >= 0.72 && id.contaminationRisk01 >= 0.68) return true;
  if (q.productCategory !== "unknown" && id && id.accessoryLikelihood01 >= 0.82 && id.semanticMismatchPenalty01 >= 0.5) return true;
  if (getMarketplaceSellerRiskTier(p.store, p.title) === "high" && trust < 42 && score < 36) return true;
  const gen = assessModelGenerationConflict(p, canonicalQuery);
  if (gen.conflict && gen.severity01 >= 0.85 && q.productCategory === "phone") return true;
  return false;
}

function dedupeListings(products: QuantProduct[]): QuantProduct[] {
  const seen = new Set<string>();
  const out: QuantProduct[] = [];
  for (const p of products) {
    const key = `${p.link}::${p.title.toLowerCase().replace(/\s+/g, " ").slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** Search-only semantic rerank: keeps tray fast, stable, and layout-neutral. */
export function semanticRerankSearchResults(
  products: QuantProduct[],
  query: string,
  canonicalQuery?: CanonicalQueryContract
): QuantProduct[] {
  if (products.length <= 1 || !query.trim()) return products;
  const deduped = dedupeListings(products);
  const q = canonicalQuery?.semantic ?? queryBrain(query);
  const prices = products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0;
  const scored = products.map((p, index) => ({
    p,
    index,
    score: semanticScore(q, p, deduped, medianPrice, canonicalQuery),
  }));

  const survivors = scored.filter((x) => !isHardJunk(q, x.p, x.score, canonicalQuery));
  const pool = survivors.length >= Math.min(5, deduped.length) ? survivors : scored;

  const sorted = pool
    .sort((a, b) => {
      const d = b.score - a.score;
      if (Math.abs(d) > 0.001) return d;
      return a.index - b.index;
    })
    .map((x) => x.p);

  const ranked =
    canonicalQuery && isUnifiedTasteApplyEnabled()
      ? stabilizeUnifiedHardSuppressionOrder({ query, canonicalQuery, products: sorted })
      : sorted;

  const intentRanked =
    canonicalQuery && isIntentIntelligenceApplyEnabled()
      ? (() => {
          const iKey = canonicalQuery.originalQuery.trim().toLowerCase().slice(0, 180);
          let intent = intentMemo.get(iKey);
          if (!intent) {
            intent = computeIntentIntelligence({ query: canonicalQuery.originalQuery, canonicalQuery });
            intentMemo.set(iKey, intent);
          }
          return stabilizeIntentHardSuppressionOrder({
            query,
            canonicalQuery,
            products: ranked,
            intent,
          });
        })()
      : ranked;

  return intentRanked.map((p, i) => ({ ...p, qiRank: i }));
}
