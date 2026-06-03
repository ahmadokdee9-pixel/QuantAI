/**
 * Phase 9.4 — Query intelligence hardening (pre-search).
 * Canonicalizes mixed Arabic/English shopping queries, strengthens intent,
 * and produces one improved upstream search rewrite (no extra SerpAPI calls).
 */

import {
  buildCanonicalQuery,
  type CanonicalQueryContract,
  type CanonicalQueryLanguage,
} from "@/lib/search/canonicalQuery";
import { fixCommonCommerceTypos } from "@/lib/search/conversationalQueryLayer";
import { extractSearchIntent } from "@/lib/search/intentExtractionEngine";
import { extractSearchConstraints } from "@/lib/search/constraintExtractionEngine";
import {
  appendArabicCommerceGlosses,
  latinSkeletonForMatching,
  normalizeEasternDigitsInString,
} from "@/lib/search/queryScriptNormalize";
import { buildUpstreamShoppingQuery } from "@/lib/search/shoppingQueryV3";
import {
  parseCompareEntities,
  type CompareEntityPair,
} from "@/lib/search/compareIntentIntegrity";

export type QueryIntelligenceSkuIntent = "exact" | "discovery" | "compare" | "unknown";

export type QueryIntelligencePriceIntent =
  | "premium"
  | "budget"
  | "value"
  | "discount"
  | "balanced";

export type QueryIntelligenceDetectedIntent = {
  productType: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  skuIntent: QueryIntelligenceSkuIntent;
  priceIntent: QueryIntelligencePriceIntent;
  comparisonIntent: boolean;
  performanceIntent: string | null;
  useCase: string | null;
  gender: string | null;
  marketMode: string;
};

export type QueryIntelligenceConstraints = {
  budget: {
    active: boolean;
    maxPrice: number | null;
    currency: string;
  };
  size: string | null;
  gender: string | null;
  condition: string;
  exclusions: string[];
};

export type QueryIntelligenceMeta = {
  version: "phase9.4-v1";
  originalQuery: string;
  canonicalQuery: string;
  language: CanonicalQueryLanguage;
  detectedIntent: QueryIntelligenceDetectedIntent;
  constraints: QueryIntelligenceConstraints;
  compareEntities: string[] | null;
  confidence: number;
};

const PHASE94_EXTRA_GLOSSES: { rx: RegExp; en: string }[] = [
  { rx: /(?:افضل|أفضل|احسن|أحسن)/i, en: " best " },
  { rx: /(?:مناسب|مناسبة)/i, en: " suitable " },
  { rx: /(?:قوي|قوية)/i, en: " powerful performance " },
  { rx: /(?:اصل|أصلي|اصلي|أصلية)/i, en: " original authentic genuine " },
  { rx: /(?:ديسكاونت)/i, en: " discount deal " },
  { rx: /(?:جودة|جوده)/i, en: " quality " },
  { rx: /(?:ضد\s*الماء|مقاوم\s*للماء)/i, en: " waterproof water resistant " },
  { rx: /(?:للبرمجة|برمجة)/i, en: " programming developer coding " },
];

const VAGUE_SHOPPING_PREFIXES: RegExp[] = [
  /^(?:i\s+(?:want|need)|looking\s+for|show\s+me|find\s+me|can\s+you\s+(?:find|recommend|suggest))\s+/i,
  /^(?:please\s+)?(?:help\s+me\s+)?(?:find|get|buy)\s+/i,
  /^(?:ابغى|أبغى|بدي|عايز|محتاج|أريد|اريد|دور\s+لي|دورلي)\s+/i,
];

const COMPARE_NOISE_RX =
  /\b(compare|comparison|versus|vs\.?|difference|which\s+is\s+better|better\s+than|مقارنة|فرق\s*بين|أيهما|ايهما|أحسن|احسن|ضد)\b/gi;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function applyPhase94ExtraGlosses(q: string): string {
  let out = q;
  for (const { rx, en } of PHASE94_EXTRA_GLOSSES) {
    if (rx.test(out)) out += en;
  }
  return out;
}

/** Surface normalization before semantic understanding. */
export function normalizeQuerySurface(raw: string): string {
  let s = normalizeEasternDigitsInString(raw.trim());
  s = fixCommonCommerceTypos(s);
  for (const rx of VAGUE_SHOPPING_PREFIXES) {
    s = s.replace(rx, "");
  }
  s = s.replace(/[؟?!.,;:]+/g, " ");
  s = s.replace(/[""''"]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Arabic + English gloss expansion for intent engines (does not strip Arabic script). */
export function applyPhase94ArabicGlosses(q: string): string {
  const glossed = appendArabicCommerceGlosses(q);
  return applyPhase94ExtraGlosses(glossed);
}

/** Extended compare parsing — English (Phase 9.2) + Arabic shopping patterns. */
export function parsePhase94CompareEntities(query: string): CompareEntityPair | null {
  const fromBase = parseCompareEntities(query);
  if (fromBase) return fromBase;

  const q = query.trim();
  const arabicPatterns: { rx: RegExp; pattern: CompareEntityPair["pattern"] }[] = [
    { rx: /مقارنة\s+(.+?)\s+(?:و|vs|ضد|or|versus)\s+(.+)/i, pattern: "compare_vs" },
    { rx: /(.+?)\s+ضد\s+(.+)/i, pattern: "versus" },
    {
      rx: /(?:أيهما|ايهما|أحسن|احسن|أفضل|افضل)\s+(.+?)\s+(?:أو|or)\s+(.+)/i,
      pattern: "or_better",
    },
    { rx: /فرق\s*بين\s+(.+?)\s+(?:و|and)\s+(.+)/i, pattern: "difference" },
  ];

  for (const { rx, pattern } of arabicPatterns) {
    const m = q.match(rx);
    if (!m?.[1] || !m[2]) continue;
    const left = collapseSpaces(m[1]);
    const right = collapseSpaces(m[2]);
    if (left.length < 2 || right.length < 2) continue;
    if (left.toLowerCase() === right.toLowerCase()) continue;
    return { left, right, entities: [left, right], pattern };
  }
  return null;
}

function stripCompareNoise(entity: string): string {
  return collapseSpaces(entity.replace(COMPARE_NOISE_RX, " "));
}

function inferPriceIntent(
  canonical: CanonicalQueryContract,
  envelope: string
): QueryIntelligencePriceIntent {
  if (
    /\b(discount|deal|sale|off)\b/i.test(envelope) ||
    /(?:تخفيض|خصم|ديسكاونت|رخيص|ارخص|أرخص)/i.test(envelope) ||
    canonical.commerceIntents.storeDealHunter
  ) {
    return "discount";
  }
  if (
    canonical.intent.primary === "premium" ||
    canonical.intent.premium01 >= 0.56 ||
    canonical.intent.quality === "luxury" ||
    canonical.intent.quality === "premium"
  ) {
    return "premium";
  }
  if (
    canonical.intent.primary === "cheapest_trusted" ||
    canonical.intent.primary === "best_value" ||
    canonical.budget.active ||
    canonical.intent.quality === "cheap" ||
    canonical.intent.quality === "value"
  ) {
    return canonical.budget.active ? "budget" : "value";
  }
  return "balanced";
}

function inferSkuIntent(
  canonical: CanonicalQueryContract,
  compare: CompareEntityPair | null
): QueryIntelligenceSkuIntent {
  if (compare) return "compare";
  const hasExactIdentity =
    Boolean(canonical.brand && canonical.model) ||
    Boolean(canonical.variant && (canonical.brand || canonical.model)) ||
    /\b(ean|gtin|sku|model\s*(no|number))\b/i.test(canonical.semantic.envelope) ||
    /\b(galaxy\s+s\d{1,2}|iphone\s*\d{1,2}|airpods?\s*(pro|max|\d))\b/i.test(canonical.semantic.envelope);
  if (hasExactIdentity && !canonical.semantic.comparisonIntent) return "exact";
  if (canonical.marketMode === "exact_sku") return "exact";
  if (canonical.marketMode === "broad_discovery") return "discovery";
  if (canonical.marketMode === "hybrid_compare") return "compare";
  return canonical.marketMode === "category_shopping" ? "discovery" : "unknown";
}

function buildDetectedIntent(
  canonical: CanonicalQueryContract,
  extracted: ReturnType<typeof extractSearchIntent>,
  compare: CompareEntityPair | null,
  envelope: string
): QueryIntelligenceDetectedIntent {
  return {
    productType: extracted.productType !== "unknown" ? extracted.productType : canonical.productType,
    category: canonical.category !== "unknown" ? canonical.category : extracted.category,
    brand: canonical.brand ?? extracted.brand,
    model: canonical.model,
    skuIntent: inferSkuIntent(canonical, compare),
    priceIntent: inferPriceIntent(canonical, envelope),
    comparisonIntent: Boolean(compare) || canonical.semantic.comparisonIntent || extracted.userGoal === "comparison",
    performanceIntent: extracted.performanceIntent,
    useCase: extracted.useCase ?? canonical.semantic.constraints.useCase,
    gender: extracted.gender,
    marketMode: canonical.marketMode,
  };
}

function buildConstraints(
  canonical: CanonicalQueryContract,
  extracted: ReturnType<typeof extractSearchIntent>,
  constraintEngine: ReturnType<typeof extractSearchConstraints>
): QueryIntelligenceConstraints {
  const size = constraintEngine.sizeInches != null ? `${constraintEngine.sizeInches} inch` : null;
  return {
    budget: {
      active: canonical.budget.active || extracted.budgetConstraints.maxPrice != null,
      maxPrice: canonical.budget.maxPrice ?? extracted.budgetConstraints.maxPrice,
      currency: canonical.budget.currency !== "unknown" ? canonical.budget.currency : extracted.budgetConstraints.currency,
    },
    size,
    gender: extracted.gender,
    condition: canonical.condition,
    exclusions: canonical.exclusions,
  };
}

function upstreamTokenScore(q: string): number {
  const tokens = q.split(/\s+/).filter(Boolean);
  let score = tokens.length;
  if (/\b\d{2,3}\s?(gb|inch|hz|4k|tb)\b/i.test(q)) score += 3;
  if (/\b(rtx|galaxy|airpods|samba|iphone|s24|wh-1000)\b/i.test(q)) score += 2;
  if (/\b(gaming|wireless|standing|mechanical|monitor|keyboard|gpu)\b/i.test(q)) score += 1;
  return score;
}

function dedupeTokens(q: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of q.split(/\s+/)) {
    const key = token.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }
  return out.join(" ");
}

/** One canonical SerpAPI `q` rewrite — never fans out to multiple primary calls. */
export function buildSingleCanonicalSearchRewrite(
  canonical: CanonicalQueryContract,
  detected: QueryIntelligenceDetectedIntent,
  compare: CompareEntityPair | null,
  glossedQuery: string
): string {
  const parts: string[] = [];

  if (compare) {
    parts.push(stripCompareNoise(compare.left));
    parts.push(stripCompareNoise(compare.right));
  } else if (detected.skuIntent === "exact") {
    const skeleton = collapseSpaces(latinSkeletonForMatching(canonical.normalizedQuery));
    if (skeleton.split(/\s+/).length >= 3) {
      parts.push(skeleton);
    } else {
      if (canonical.brand) parts.push(canonical.brand);
      if (canonical.model) parts.push(canonical.model);
      if (canonical.variant) parts.push(canonical.variant);
    }
  } else {
    const keywords = canonical.semantic.semanticKeywords.slice(0, 6);
    if (keywords.length) {
      parts.push(keywords.join(" "));
    } else {
      const skeleton = latinSkeletonForMatching(glossedQuery);
      if (skeleton) parts.push(skeleton);
      else parts.push(canonical.normalizedQuery);
    }
    if (detected.brand && !parts.join(" ").toLowerCase().includes(detected.brand.toLowerCase())) {
      parts.unshift(detected.brand);
    }
  }

  if (detected.useCase && detected.skuIntent !== "exact") {
    parts.push(detected.useCase.replace(/_/g, " "));
  }
  if (detected.performanceIntent && detected.skuIntent !== "exact") {
    parts.push(detected.performanceIntent.replace(/_/g, " "));
  }
  if (detected.priceIntent === "premium" && detected.skuIntent !== "exact") {
    parts.push("premium");
  }
  if (detected.gender) {
    parts.push(detected.gender);
  }

  const composed = collapseSpaces(parts.filter(Boolean).join(" "));
  const candidate = dedupeTokens(
    buildUpstreamShoppingQuery(composed || canonical.normalizedQuery || glossedQuery)
  );
  const base = dedupeTokens(canonical.upstreamQuery);

  if (compare) {
    return collapseSpaces(buildUpstreamShoppingQuery(composed || canonical.normalizedQuery || glossedQuery));
  }
  if (detected.skuIntent === "exact") {
    return upstreamTokenScore(candidate) >= upstreamTokenScore(base) ? candidate : base;
  }
  if (upstreamTokenScore(candidate) <= upstreamTokenScore(base)) return base;
  return candidate;
}

function computeConfidence(
  canonical: CanonicalQueryContract,
  detected: QueryIntelligenceDetectedIntent,
  compare: CompareEntityPair | null,
  constraints: QueryIntelligenceConstraints
): number {
  let score = 0.32;
  if (detected.brand) score += 0.14;
  if (detected.model) score += 0.14;
  if (detected.category && detected.category !== "unknown") score += 0.1;
  if (compare) score += 0.1;
  if (constraints.budget.active) score += 0.06;
  if (detected.skuIntent === "exact") score += 0.08;
  if (detected.performanceIntent) score += 0.05;
  if (canonical.language !== "unknown") score += 0.04;
  return clamp01(score);
}

export function buildPhase94QueryIntelligence(rawQuery: string): {
  meta: QueryIntelligenceMeta;
  canonicalQuery: CanonicalQueryContract;
} {
  const originalQuery = rawQuery.trim();
  const normalizedSurface = normalizeQuerySurface(originalQuery);
  const glossedQuery = applyPhase94ArabicGlosses(normalizedSurface);
  const baseCanonical = buildCanonicalQuery(glossedQuery || originalQuery);

  const compare = parsePhase94CompareEntities(originalQuery) ?? parsePhase94CompareEntities(glossedQuery);
  const extracted = extractSearchIntent(glossedQuery || originalQuery);
  const constraintEngine = extractSearchConstraints(glossedQuery || originalQuery);
  const envelope = baseCanonical.semantic.envelope;

  const detectedIntent = buildDetectedIntent(baseCanonical, extracted, compare, envelope);
  const constraints = buildConstraints(baseCanonical, extracted, constraintEngine);
  const canonicalSearchRewrite = buildSingleCanonicalSearchRewrite(
    baseCanonical,
    detectedIntent,
    compare,
    glossedQuery
  );
  const confidence = computeConfidence(baseCanonical, detectedIntent, compare, constraints);

  const canonicalQuery: CanonicalQueryContract = {
    ...baseCanonical,
    originalQuery,
    normalizedQuery: baseCanonical.normalizedQuery || normalizedSurface,
    upstreamQuery: canonicalSearchRewrite,
  };

  return {
    meta: {
      version: "phase9.4-v1",
      originalQuery,
      canonicalQuery: canonicalSearchRewrite,
      language: baseCanonical.language,
      detectedIntent,
      constraints,
      compareEntities: compare ? [...compare.entities] : null,
      confidence,
    },
    canonicalQuery,
  };
}
