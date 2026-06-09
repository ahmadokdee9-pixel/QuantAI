/**
 * Phase 2A — Intent intelligence engine.
 * Parses Arabic + English shopping queries into structured intent snapshots.
 */

import { fixCommonCommerceTypos } from "@/lib/search/conversationalQueryLayer";
import {
  appendArabicCommerceGlosses,
  latinSkeletonForMatching,
  normalizeEasternDigitsInString,
} from "@/lib/search/queryScriptNormalize";

export type IntentLanguage = "en" | "ar" | "mixed" | "unknown";

export type IntentSnapshot = {
  category: string | null;
  productType: string | null;
  budget: number | null;
  currency: string | null;
  useCase: string | null;
  qualityLevel: string | null;
  urgency: string | null;
  preferredBrand: string | null;
  excludedBrands: string[];
  language: IntentLanguage;
};

export type QueryRewriteSnapshot = {
  productType: string | null;
  brand: string | null;
  objective: string | null;
  budgetSensitive: boolean;
};

export type IntentEngineSnapshot = {
  intent: IntentSnapshot;
  intentConfidence: number;
  intentCompleteness: number;
  normalizedQuery: string;
  rewrittenQuery: string;
  rewrite: QueryRewriteSnapshot;
};

const BRAND_ALIASES: { rx: RegExp; brand: string }[] = [
  { rx: /\b(iphone|ipad|macbook|airpods?|apple\s+watch)\b/i, brand: "Apple" },
  { rx: /\b(galaxy|samsung)\b/i, brand: "Samsung" },
  { rx: /\b(pixel|google)\b/i, brand: "Google" },
  { rx: /\b(xiaomi|redmi|poco)\b/i, brand: "Xiaomi" },
  { rx: /\b(huawei|honor)\b/i, brand: "Huawei" },
  { rx: /\b(sony|playstation|wh-1000)\b/i, brand: "Sony" },
  { rx: /\b(bose|quietcomfort)\b/i, brand: "Bose" },
  { rx: /\b(dell|alienware|xps)\b/i, brand: "Dell" },
  { rx: /\b(lenovo|thinkpad|legion)\b/i, brand: "Lenovo" },
  { rx: /\b(asus|rog|zenbook)\b/i, brand: "Asus" },
  { rx: /\b(hp|omen|spectre)\b/i, brand: "HP" },
  { rx: /\b(msi)\b/i, brand: "MSI" },
  { rx: /\b(acer|predator)\b/i, brand: "Acer" },
  { rx: /\b(nikon)\b/i, brand: "Nikon" },
  { rx: /\b(canon)\b/i, brand: "Canon" },
  { rx: /\b(fujifilm|fuji)\b/i, brand: "Fujifilm" },
  { rx: /\b(dyson)\b/i, brand: "Dyson" },
];

const EXCLUDED_BRAND_PATTERNS: { rx: RegExp; brand: string }[] = [
  { rx: /\b(no\s+apple|not\s+apple|without\s+apple|avoid\s+apple)\b/i, brand: "Apple" },
  { rx: /\b(no\s+samsung|not\s+samsung|without\s+samsung)\b/i, brand: "Samsung" },
  { rx: /\b(no\s+xiaomi|not\s+xiaomi)\b/i, brand: "Xiaomi" },
];

const PRODUCT_TYPE_PATTERNS: { rx: RegExp; productType: string; category: string }[] = [
  { rx: /(?:لابتوب|كمبيوتر\s*محمول|laptop|notebook|ultrabook|macbook|chromebook)/i, productType: "laptop", category: "computers" },
  { rx: /(?:هاتف|جوال|موبايل|phone|iphone|smartphone|mobile|galaxy\s+s|pixel)/i, productType: "smartphone", category: "mobile" },
  { rx: /(?:كاميرا|camera|dslr|mirrorless)/i, productType: "camera", category: "photography" },
  { rx: /\b(headphones|earbuds|airpods|headset|سماعة|سماعات)\b/i, productType: "headphones", category: "audio" },
  { rx: /\b(monitor|display|شاشة\s*كمبيوتر|مونيتور)\b/i, productType: "monitor", category: "computers" },
  { rx: /\b(tv|television|oled\s+tv|تلفزيون)\b/i, productType: "television", category: "home entertainment" },
  { rx: /\b(tablet|ipad)\b/i, productType: "tablet", category: "mobile" },
  { rx: /\b(watch|smartwatch|ساعة\s*ذكية)\b/i, productType: "smartwatch", category: "wearables" },
  { rx: /\b(gpu|graphics\s+card|video\s+card)\b/i, productType: "graphics card", category: "computers" },
  { rx: /\b(playstation|xbox|nintendo|console|gaming\s+console)\b/i, productType: "gaming console", category: "gaming" },
];

const USE_CASE_PATTERNS: { rx: RegExp; useCase: string }[] = [
  { rx: /(?:gaming|gamer|rtx|144hz|240hz|esports|ألعاب|قيمنق|جيمنق|للالعاب|للألعاب)/i, useCase: "gaming" },
  { rx: /(?:travel|portable|lightweight|للسفر|(?:\s|^)سفر)/i, useCase: "travel" },
  { rx: /(?:editing|montage|video\s+edit|content\s+creation|creator|stream|للمونتاج|مونتاج)/i, useCase: "video editing" },
  { rx: /\b(work|office|business|productivity|programming|developer|للبرمجة|برمجة|office)\b/i, useCase: "productivity" },
  { rx: /\b(photography|photo|portrait|landscape|تصوير)\b/i, useCase: "photography" },
  { rx: /\b(student|school|university|college|للمدرسة|للجامعة)\b/i, useCase: "student" },
  { rx: /\b(gift|present|هدية)\b/i, useCase: "gift" },
  { rx: /\b(fitness|gym|workout|رياضة|للرياضة)\b/i, useCase: "fitness" },
];

const QUALITY_PATTERNS: { rx: RegExp; qualityLevel: string; weight: number }[] = [
  { rx: /\b(best|top|flagship|leading|افضل|أفضل|احسن|أحسن)\b/i, qualityLevel: "best", weight: 80 },
  { rx: /(?:professional|(?:\s|^)pro(?:\s|$)|studio|احتراف|احترافية)/i, qualityLevel: "professional", weight: 78 },
  { rx: /\b(premium|luxury|high.end|فاخر|فاخرة|راقي)\b/i, qualityLevel: "premium", weight: 76 },
  { rx: /(?:powerful|performance|high\s+performance|قوي|قوية)/i, qualityLevel: "powerful", weight: 74 },
  { rx: /\b(cheap|budget|affordable|lowest|value|رخيص|ارخص|أرخص|goedkoop)\b/i, qualityLevel: "budget", weight: 72 },
  { rx: /\b(midrange|balanced|decent)\b/i, qualityLevel: "balanced", weight: 60 },
];

const URGENCY_PATTERNS: { rx: RegExp; urgency: string }[] = [
  { rx: /\b(asap|urgent|buy\s+now|today|ship\s+today|this\s+week|order\s+now)\b/i, urgency: "high" },
  { rx: /\b(soon|this\s+month|need\s+it)\b/i, urgency: "medium" },
];

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function detectLanguage(rawQuery: string): IntentLanguage {
  const hasArabic = /[\u0600-\u06FF]/.test(rawQuery);
  const hasLatin = /[a-z]/i.test(latinSkeletonForMatching(rawQuery));
  if (hasArabic && hasLatin) return "mixed";
  if (hasArabic) return "ar";
  if (hasLatin) return "en";
  return "unknown";
}

/** Normalize query text for deterministic intent parsing. */
export function normalizeShoppingQuery(rawQuery: string): string {
  const trimmed = rawQuery.trim();
  if (!trimmed) return "";
  const fixed = fixCommonCommerceTypos(trimmed);
  const digits = normalizeEasternDigitsInString(fixed);
  const glossed = appendArabicCommerceGlosses(digits);
  return glossed.replace(/\s+/g, " ").trim();
}

function matchEnvelope(normalizedQuery: string): string {
  return `${normalizedQuery} ${latinSkeletonForMatching(normalizedQuery)}`.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractBudget(envelope: string): { budget: number | null; currency: string | null } {
  const patterns: { rx: RegExp; currency: string }[] = [
    { rx: /\b(?:under|below|less\s+than|up\s+to|max|maximum|at\s+most|<=?)\s*(?:€|eur|euro|euros)?\s*(\d[\d,.\s]{0,9}\d|\d)\b/i, currency: "EUR" },
    { rx: /\b(?:under|below|less\s+than|up\s+to|max|maximum|at\s+most|<=?)\s*(?:\$|usd|dollar|dollars)?\s*(\d[\d,.\s]{0,9}\d|\d)\b/i, currency: "USD" },
    { rx: /\b(?:under|below|less\s+than|up\s+to|max|maximum|at\s+most|<=?)\s*(?:£|gbp|pound|pounds)?\s*(\d[\d,.\s]{0,9}\d|\d)\b/i, currency: "GBP" },
    { rx: /\b(\d[\d,.\s]{0,9}\d|\d)\s*(?:€|eur|euro|euros)\b/i, currency: "EUR" },
    { rx: /\b(\d[\d,.\s]{0,9}\d|\d)\s*(?:\$|usd|dollar|dollars)\b/i, currency: "USD" },
    { rx: /\b(\d[\d,.\s]{0,9}\d|\d)\s*(?:£|gbp|pound|pounds)\b/i, currency: "GBP" },
    { rx: /\b(?:تحت|أقل\s*من|اقل\s*من|حتى)\s*(\d[\d,.\s]{0,9}\d|\d)\b/i, currency: "EUR" },
  ];

  for (const { rx, currency } of patterns) {
    const match = envelope.match(rx);
    if (!match?.[1]) continue;
    const value = Number.parseFloat(match[1].replace(/[,\s]/g, ""));
    if (Number.isFinite(value) && value > 0) {
      return { budget: Math.round(value), currency };
    }
  }
  return { budget: null, currency: null };
}

function extractPreferredBrand(envelope: string): string | null {
  for (const { rx, brand } of BRAND_ALIASES) {
    if (rx.test(envelope)) return brand;
  }
  if (/\biphone\b/i.test(envelope)) return "Apple";
  return null;
}

function extractExcludedBrands(envelope: string): string[] {
  const excluded = new Set<string>();
  for (const { rx, brand } of EXCLUDED_BRAND_PATTERNS) {
    if (rx.test(envelope)) excluded.add(brand);
  }
  return [...excluded];
}

function extractProductType(envelope: string, rawQuery: string): { productType: string | null; category: string | null } {
  const sources = [envelope, rawQuery, normalizeEasternDigitsInString(rawQuery)];
  for (const source of sources) {
    for (const pattern of PRODUCT_TYPE_PATTERNS) {
      if (pattern.rx.test(source)) {
        return { productType: pattern.productType, category: pattern.category };
      }
    }
  }
  return { productType: null, category: null };
}

function extractUseCase(envelope: string, rawQuery: string): string | null {
  const sources = [envelope, rawQuery, normalizeEasternDigitsInString(rawQuery)];
  for (const source of sources) {
    for (const { rx, useCase } of USE_CASE_PATTERNS) {
      if (rx.test(source)) return useCase;
    }
  }
  return null;
}

function extractQualityLevel(envelope: string, rawQuery: string): string | null {
  let best: { qualityLevel: string; weight: number } | null = null;
  const sources = [envelope, rawQuery, normalizeEasternDigitsInString(rawQuery)];
  for (const source of sources) {
    for (const pattern of QUALITY_PATTERNS) {
      if (pattern.rx.test(source) && (!best || pattern.weight > best.weight)) {
        best = pattern;
      }
    }
  }
  return best?.qualityLevel ?? null;
}

function extractUrgency(envelope: string): string | null {
  for (const { rx, urgency } of URGENCY_PATTERNS) {
    if (rx.test(envelope)) return urgency;
  }
  return null;
}

function computeIntentCompleteness(intent: IntentSnapshot): number {
  const fields = [
    intent.category,
    intent.productType,
    intent.budget != null ? String(intent.budget) : null,
    intent.currency,
    intent.useCase,
    intent.qualityLevel,
    intent.urgency,
    intent.preferredBrand,
    intent.language !== "unknown" ? intent.language : null,
  ];
  const filled = fields.filter(Boolean).length;
  return clampScore(Math.round((filled / fields.length) * 100));
}

function computeIntentConfidence(args: {
  envelope: string;
  intent: IntentSnapshot;
  hasRewriteSignals: boolean;
}): number {
  let score = 28;
  if (args.intent.productType) score += 18;
  if (args.intent.preferredBrand) score += 12;
  if (args.intent.useCase) score += 12;
  if (args.intent.qualityLevel) score += 10;
  if (args.intent.budget != null) score += 14;
  if (args.intent.category) score += 8;
  if (args.intent.language !== "unknown") score += 6;
  if (args.hasRewriteSignals) score += 4;
  if (args.envelope.length >= 8) score += 6;
  if (args.intent.excludedBrands.length > 0) score += 4;
  return clampScore(score);
}

function deriveRewrite(args: {
  intent: IntentSnapshot;
  envelope: string;
}): QueryRewriteSnapshot {
  const budgetSensitive =
    args.intent.qualityLevel === "budget" ||
    /\b(cheap|budget|affordable|lowest|value|under|رخيص|ارخص|أرخص)\b/i.test(args.envelope);

  let objective: string | null = null;
  if (args.intent.qualityLevel === "best") objective = "best overall";
  else if (args.intent.qualityLevel === "professional") objective = "professional grade";
  else if (args.intent.qualityLevel === "powerful") objective = "high performance";
  else if (budgetSensitive) objective = "best value";
  else if (args.intent.useCase) objective = `optimized for ${args.intent.useCase}`;

  return {
    productType: args.intent.productType,
    brand: args.intent.preferredBrand,
    objective,
    budgetSensitive,
  };
}

/** Rewrite normalized query into retrieval-friendly commerce text. */
export function rewriteShoppingQuery(args: {
  normalizedQuery: string;
  intent: IntentSnapshot;
  rewrite: QueryRewriteSnapshot;
}): string {
  const parts: string[] = [];
  if (args.rewrite.brand) parts.push(args.rewrite.brand);
  if (args.rewrite.productType) parts.push(args.rewrite.productType);
  if (args.intent.useCase) parts.push(`for ${args.intent.useCase}`);
  if (args.rewrite.objective) parts.push(args.rewrite.objective);
  if (args.intent.budget != null && args.intent.currency) {
    parts.push(`under ${args.intent.budget} ${args.intent.currency}`);
  } else if (args.rewrite.budgetSensitive) {
    parts.push("budget value");
  }
  if (args.intent.qualityLevel && args.intent.qualityLevel !== "budget") {
    parts.push(args.intent.qualityLevel);
  }
  if (parts.length === 0) return args.normalizedQuery || "";
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function parseStructuredIntent(normalizedQuery: string, rawQuery: string): IntentSnapshot {
  const envelope = matchEnvelope(normalizedQuery);
  const { productType, category } = extractProductType(envelope, rawQuery);
  const { budget, currency } = extractBudget(envelope);
  return {
    category,
    productType,
    budget,
    currency,
    useCase: extractUseCase(envelope, rawQuery),
    qualityLevel: extractQualityLevel(envelope, rawQuery),
    urgency: extractUrgency(envelope),
    preferredBrand: extractPreferredBrand(envelope),
    excludedBrands: extractExcludedBrands(envelope),
    language: detectLanguage(rawQuery),
  };
}

export function hasIntentEngineSignal(snapshot: IntentEngineSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.intentConfidence >= 0);
}

/** Build intent intelligence snapshot from a raw shopping query. */
export function buildIntentIntelligenceEngine(rawQuery: string): IntentEngineSnapshot {
  const sourceQuery = rawQuery.trim();
  const normalizedQuery = normalizeShoppingQuery(sourceQuery);
  const intent = parseStructuredIntent(normalizedQuery, sourceQuery);
  const rewrite = deriveRewrite({ intent, envelope: matchEnvelope(normalizedQuery) });
  const rewrittenQuery = rewriteShoppingQuery({ normalizedQuery, intent, rewrite });
  const intentCompleteness = computeIntentCompleteness(intent);
  const intentConfidence = computeIntentConfidence({
    envelope: matchEnvelope(normalizedQuery),
    intent,
    hasRewriteSignals: Boolean(rewrite.productType || rewrite.brand || rewrite.objective),
  });

  return {
    intent,
    intentConfidence,
    intentCompleteness,
    normalizedQuery,
    rewrittenQuery,
    rewrite,
  };
}
