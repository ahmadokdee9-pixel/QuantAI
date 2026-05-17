import { buildSearchQueryUnderstanding, type SemanticQueryUnderstanding } from "@/lib/search/queryUnderstanding";
import { buildUpstreamShoppingQuery } from "@/lib/search/shoppingQueryV3";
import { parseCommerceSearchIntents, type CommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";

export type CanonicalQueryLanguage = "arabic" | "english" | "mixed" | "unknown";

export type CanonicalQueryIntent =
  | "exact_product"
  | "best_value"
  | "cheapest_trusted"
  | "alternative"
  | "premium"
  | "used_or_refurb"
  | "market_compare"
  | "general_search";

export type CanonicalQueryContract = {
  version: 1;
  originalQuery: string;
  normalizedQuery: string;
  upstreamQuery: string;
  language: CanonicalQueryLanguage;
  languages: ("arabic" | "english")[];
  category: SemanticQueryUnderstanding["productCategory"];
  productType: string;
  brand: string | null;
  model: string | null;
  variant: string | null;
  budget: {
    active: boolean;
    intent01: number;
    maxPrice: number | null;
    currency: "EUR" | "USD" | "GBP" | "unknown";
  };
  intent: {
    primary: CanonicalQueryIntent;
    alternatives: CanonicalQueryIntent[];
    premium01: number;
    urgency01: number;
    quality: SemanticQueryUnderstanding["qualityExpectation"];
  };
  condition: "new" | "used" | "refurbished" | "any";
  merchantHints: string[];
  exclusions: string[];
  semantic: SemanticQueryUnderstanding;
  commerceIntents: CommerceSearchIntents;
};

const BRAND_ALIASES = [
  "apple",
  "samsung",
  "nike",
  "adidas",
  "sony",
  "bose",
  "dyson",
  "ysl",
  "yves saint laurent",
  "ikea",
  "lg",
  "asus",
  "lenovo",
  "dell",
  "hp",
  "msi",
  "philips",
];

const MERCHANT_HINTS = [
  "bol",
  "bol.com",
  "coolblue",
  "mediamarkt",
  "amazon",
  "amazon.nl",
  "amazon.de",
  "apple",
  "samsung",
  "nike",
  "adidas",
  "zalando",
  "ikea",
  "douglas",
  "notino",
  "marktplaats",
  "ebay",
];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function uniq(xs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const t = x.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function languageFrom(languages: ("arabic" | "english")[]): CanonicalQueryLanguage {
  if (languages.includes("arabic") && languages.includes("english")) return "mixed";
  if (languages.includes("arabic")) return "arabic";
  if (languages.includes("english")) return "english";
  return "unknown";
}

function detectBrand(envelope: string): string | null {
  for (const brand of BRAND_ALIASES) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(envelope)) return brand;
  }
  if (/\bairpods?\b/i.test(envelope)) return "apple";
  if (/\biphone\b/i.test(envelope)) return "apple";
  if (/(ايفون|آيفون)/i.test(envelope)) return "apple";
  return null;
}

function detectModel(envelope: string, brand: string | null): string | null {
  const patterns = [
    /\biphone\s*(\d{1,2}(?:\s*(?:pro|max|plus|mini|e))?)\b/i,
    /\bairpods?\s*(pro|pro\s*\d|max|\d)?\b/i,
    /\badidas\s+(samba|gazelle|superstar|campus)\b/i,
    /\bnike\s+(air\s+force\s+1|dunk|air\s+max|jordan\s*\d*)\b/i,
    /\b(gaming\s+monitor|monitor)\s*(\d{2,3}\s?hz|4k|qhd|oled)?\b/i,
  ];
  for (const rx of patterns) {
    const match = envelope.match(rx);
    if (!match) continue;
    return match[0].replace(/\s+/g, " ").trim();
  }
  if (brand) {
    const afterBrand = envelope.match(new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+([a-z0-9][a-z0-9\\s+-]{1,32})`, "i"))?.[1];
    return afterBrand?.replace(/\s+/g, " ").trim() ?? null;
  }
  return null;
}

function detectVariant(envelope: string): string | null {
  const parts = [
    envelope.match(/\b(64|128|256|512)\s?gb\b/i)?.[0],
    envelope.match(/\b(1|2)\s?tb\b/i)?.[0],
    envelope.match(/\b(pro|max|plus|mini|ultra|oled|qhd|4k)\b/i)?.[0],
    envelope.match(/\b(size|maat)\s?(\d{2}|\d\.\d)\b/i)?.[0],
    envelope.match(/\b(edp|edt|eau de parfum|eau de toilette)\b/i)?.[0],
    envelope.match(/\b\d{2,4}\s?ml\b/i)?.[0],
  ].filter(Boolean) as string[];
  return uniq(parts).join(" ").trim() || null;
}

function detectBudget(envelope: string, semantic: SemanticQueryUnderstanding): CanonicalQueryContract["budget"] {
  const priceMatch = envelope.match(/(?:under|below|less than|max|tot|onder|below)\s*(?:€|eur|usd|\$|£|gbp)?\s*(\d{2,5})/i);
  const looseCurrency = envelope.match(/(€|eur|usd|\$|£|gbp)/i)?.[1]?.toLowerCase();
  const currency = looseCurrency === "$" || looseCurrency === "usd" ? "USD" : looseCurrency === "£" || looseCurrency === "gbp" ? "GBP" : looseCurrency === "€" || looseCurrency === "eur" ? "EUR" : "unknown";
  return {
    active: semantic.budgetIntent01 >= 0.45 || Boolean(priceMatch),
    intent01: clamp01(semantic.budgetIntent01),
    maxPrice: priceMatch ? Number.parseInt(priceMatch[1]!, 10) : null,
    currency,
  };
}

function detectCondition(envelope: string): CanonicalQueryContract["condition"] {
  if (/\b(refurb|refurbished|renewed|back market|gereviseerd)\b/i.test(envelope)) return "refurbished";
  if (/\b(used|second hand|pre-owned|occasion|مستعمل|مستعملة)\b/i.test(envelope)) return "used";
  if (/\b(new|nieuw|sealed)\b/i.test(envelope)) return "new";
  return "any";
}

function detectMerchantHints(envelope: string): string[] {
  return uniq(MERCHANT_HINTS.filter((m) => envelope.includes(m)));
}

function detectExclusions(envelope: string): string[] {
  const out: string[] = [];
  if (/\b(no|not|without|exclude|avoid)\s+(case|cover|protector|accessory|box|parts?)\b/i.test(envelope)) out.push("accessories");
  if (/\b(no|not|without|exclude|avoid)\s+(used|refurb|second hand|pre-owned)\b/i.test(envelope)) out.push("used_or_refurbished");
  if (/\b(no|not|without|exclude|avoid)\s+(marketplace|ebay|aliexpress|temu)\b/i.test(envelope)) out.push("marketplace");
  if (/\b(no|avoid)\s+(fake|replica|dupe)\b/i.test(envelope)) out.push("replica_or_fake");
  return uniq(out);
}

function primaryIntent(semantic: SemanticQueryUnderstanding, commerce: CommerceSearchIntents, condition: CanonicalQueryContract["condition"]): CanonicalQueryIntent {
  if (condition === "used" || condition === "refurbished") return "used_or_refurb";
  if (semantic.alternativeIntent.active || commerce.alternativeSeeking) return "alternative";
  if (commerce.cheapestTrusted) return "cheapest_trusted";
  if (commerce.explicitBestValue || semantic.qualityExpectation === "value") return "best_value";
  if (commerce.comparisonIntent || commerce.storeDealHunter) return "market_compare";
  if (semantic.premiumIntent01 >= 0.56 || commerce.premium || commerce.luxury) return "premium";
  if (semantic.productCategory !== "unknown") return "exact_product";
  return "general_search";
}

function intentAlternatives(primary: CanonicalQueryIntent, semantic: SemanticQueryUnderstanding, commerce: CommerceSearchIntents): CanonicalQueryIntent[] {
  const intents: CanonicalQueryIntent[] = [primary];
  if (semantic.alternativeIntent.active || commerce.alternativeSeeking) intents.push("alternative");
  if (commerce.cheapestTrusted) intents.push("cheapest_trusted");
  if (commerce.explicitBestValue || semantic.budgetIntent01 >= 0.5) intents.push("best_value");
  if (commerce.comparisonIntent || commerce.storeDealHunter) intents.push("market_compare");
  if (semantic.premiumIntent01 >= 0.56 || commerce.premium || commerce.luxury) intents.push("premium");
  return uniq(intents) as CanonicalQueryIntent[];
}

export function buildCanonicalQuery(rawQuery: string): CanonicalQueryContract {
  const semantic = buildSearchQueryUnderstanding(rawQuery);
  const commerceIntents = parseCommerceSearchIntents(rawQuery);
  const originalQuery = rawQuery.trim();
  const normalizedQuery = semantic.rewritten || originalQuery;
  const envelope = semantic.envelope;
  const brand = detectBrand(envelope);
  const model = detectModel(envelope, brand);
  const variant = detectVariant(envelope);
  const budget = detectBudget(envelope, semantic);
  const condition = detectCondition(envelope);
  const primary = primaryIntent(semantic, commerceIntents, condition);
  return {
    version: 1,
    originalQuery,
    normalizedQuery,
    upstreamQuery: buildUpstreamShoppingQuery(normalizedQuery || originalQuery),
    language: languageFrom(semantic.languages),
    languages: semantic.languages,
    category: semantic.productCategory,
    productType: semantic.productCategory === "unknown" ? "unknown" : semantic.productCategory.replace("_", " "),
    brand,
    model,
    variant,
    budget,
    intent: {
      primary,
      alternatives: intentAlternatives(primary, semantic, commerceIntents),
      premium01: clamp01(semantic.premiumIntent01),
      urgency01: clamp01(semantic.urgency01),
      quality: semantic.qualityExpectation,
    },
    condition,
    merchantHints: detectMerchantHints(envelope),
    exclusions: detectExclusions(envelope),
    semantic,
    commerceIntents,
  };
}

export function canonicalQueryForDebug(q: CanonicalQueryContract): Record<string, unknown> {
  return {
    version: q.version,
    originalQuery: q.originalQuery,
    normalizedQuery: q.normalizedQuery,
    upstreamQuery: q.upstreamQuery,
    language: q.language,
    languages: q.languages,
    category: q.category,
    productType: q.productType,
    brand: q.brand,
    model: q.model,
    variant: q.variant,
    budget: q.budget,
    intent: q.intent,
    condition: q.condition,
    merchantHints: q.merchantHints,
    exclusions: q.exclusions,
  };
}
