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

export type CanonicalMarketIntentMode =
  | "exact_sku"
  | "category_shopping"
  | "broad_discovery"
  | "hybrid_compare";

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
  marketMode: CanonicalMarketIntentMode;
  condition: "new" | "used" | "refurbished" | "any";
  merchantHints: string[];
  market: {
    country: "NL" | "BE" | "DE" | "FR" | "UK" | "US" | "ES" | "IT" | "EU" | "GLOBAL";
    currency: "EUR" | "USD" | "GBP" | "unknown";
    regionHints: string[];
    localPreference01: number;
  };
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
  "chanel",
  "dior",
  "tom ford",
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
  if (/(ايفون|آيفون|ابل|أبل|آبل)/i.test(envelope)) return "apple";
  if (/(سامسونج|سامسونغ)/i.test(envelope)) return "samsung";
  if (/(نايك|نايكي)/i.test(envelope)) return "nike";
  if (/(اديداس|أديداس)/i.test(envelope)) return "adidas";
  return null;
}

function detectModel(envelope: string, brand: string | null): string | null {
  const patterns = [
    /\biphone\s*(\d{1,2}(?:\s*(?:pro|max|plus|mini|e))?)\b/i,
    /(?:ايفون|آيفون)\s*(\d{1,2}(?:\s*(?:pro|max|plus|mini|e))?)/i,
    /\bairpods?\s*(pro|pro\s*\d|max|\d)?\b/i,
    /\badidas\s+(samba|gazelle|superstar|campus)\b/i,
    /\bnike\s+(air\s+force\s+1|dunk|air\s+max|jordan\s*\d*)\b/i,
    /\b(gaming\s+monitor|monitor)\s*(\d{2,3}\s?hz|4k|qhd|oled)?\b/i,
    /\b(?:ysl|yves\s+saint\s+laurent)\s+libre\b/i,
    /\blibre\s+(?:edp|eau\s+de\s+parfum)\b/i,
    /\b(vomero|pegasus|ultraboost)\b/i,
  ];
  for (const rx of patterns) {
    const match = envelope.match(rx);
    if (!match) continue;
    if (/(?:ايفون|آيفون)/i.test(match[0])) {
      const version = match[1]?.replace(/\s+/g, " ").trim();
      return version ? `iphone ${version}` : "iphone";
    }
    return match[0].replace(/\s+/g, " ").trim();
  }
  if (brand) {
    if (/\b(like|similar|alternative|cheaper|dupe|مثل|شبيه|بديل|زي|شبه|ارخص|أرخص)\b/i.test(envelope)) {
      const anchor =
        envelope.match(/\b(?:like|similar to|alternative to)\s+([a-z0-9][a-z0-9\s+-]{2,28}?)(?:\s+but|\s+cheaper|$)/i)?.[1]?.trim() ??
        envelope.match(/\b(?:مثل|زي|شبه)\s+([a-z0-9][a-z0-9\s+-]{2,28}?)(?:\s+بس|\s+ارخص|$)/i)?.[1]?.trim();
      if (anchor && !/\b(cheaper|but|budget|like|shoes|sneakers)\b/i.test(anchor)) {
        return anchor.replace(/\s+/g, " ").trim();
      }
      const named = envelope.match(
        /\b(vomero|pegasus|ultraboost|samba|gazelle|air\s+force|dunk|jordan|libre|common\s+projects)\b/i
      )?.[0];
      if (named) return named.replace(/\s+/g, " ").trim();
      return null;
    }
    const afterBrand = envelope.match(new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+([a-z0-9][a-z0-9\\s+-]{1,32})`, "i"))?.[1];
    const model = afterBrand?.replace(/\s+/g, " ").trim() ?? null;
    if (model && /\b(like|similar|cheaper|but|alternative)\b/i.test(model)) return null;
    return model;
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
  const priceMatch =
    envelope.match(/(?:under|below|less than|max|tot|onder|below|up to)\s*(?:€|eur|usd|\$|£|gbp)?\s*(\d{2,5})/i) ??
    envelope.match(/(?:تحت|أقل\s*من|اقل\s*من|حتى)\s*(?:€|eur|usd|\$|£|gbp)?\s*(\d{2,5})/i);
  const looseCurrency = envelope.match(/(€|eur|usd|\$|£|gbp)/i)?.[1]?.toLowerCase();
  const currency = looseCurrency === "$" || looseCurrency === "usd" ? "USD" : looseCurrency === "£" || looseCurrency === "gbp" ? "GBP" : looseCurrency === "€" || looseCurrency === "eur" ? "EUR" : "unknown";
  const maxFromSemantic = semantic.constraints.maxPrice;
  return {
    active: semantic.budgetIntent01 >= 0.45 || Boolean(priceMatch) || maxFromSemantic != null,
    intent01: clamp01(semantic.budgetIntent01),
    maxPrice: priceMatch ? Number.parseInt(priceMatch[1]!, 10) : maxFromSemantic,
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

function detectMarket(envelope: string, budgetCurrency: CanonicalQueryContract["budget"]["currency"]): CanonicalQueryContract["market"] {
  const hints: string[] = [];
  let country: CanonicalQueryContract["market"]["country"] = "NL";
  if (/\b(netherlands|nederland|holland|nl|amsterdam|rotterdam|utrecht|eindhoven)\b|هولندا/i.test(envelope)) {
    country = "NL";
    hints.push("netherlands");
  } else if (/\b(belgium|belgie|belgië|brussels|brussel|be)\b/i.test(envelope)) {
    country = "BE";
    hints.push("belgium");
  } else if (/\b(germany|deutschland|de|berlin|munich)\b/i.test(envelope)) {
    country = "DE";
    hints.push("germany");
  } else if (/\b(france|frankrijk|fr|paris)\b/i.test(envelope)) {
    country = "FR";
    hints.push("france");
  } else if (/\b(uk|united kingdom|britain|england|london)\b/i.test(envelope)) {
    country = "UK";
    hints.push("united_kingdom");
  } else if (/\b(us|usa|united states|america|walmart|bestbuy|target)\b/i.test(envelope)) {
    country = "US";
    hints.push("united_states");
  } else if (/\b(spain|espana|españa|madrid|barcelona)\b/i.test(envelope)) {
    country = "ES";
    hints.push("spain");
  } else if (/\b(italy|italia|rome|milano|milan)\b/i.test(envelope)) {
    country = "IT";
    hints.push("italy");
  } else if (/\b(eu|europe|european)\b/i.test(envelope)) {
    country = "EU";
    hints.push("europe");
  } else if (/\b(global|international|worldwide)\b/i.test(envelope)) {
    country = "GLOBAL";
    hints.push("global");
  }
  const currency =
    budgetCurrency !== "unknown"
      ? budgetCurrency
      : country === "US"
        ? "USD"
        : country === "UK"
          ? "GBP"
          : country === "GLOBAL"
            ? "unknown"
            : "EUR";
  const localPreference01 = /\b(near me|nearby|local|in de buurt|in nederland|in holland|in nl|shipping|delivery|bezorging|ophalen|pickup)\b|هولندا|قريب/i.test(envelope)
    ? 0.82
    : country === "GLOBAL"
      ? 0.28
      : 0.58;
  return { country, currency, regionHints: uniq(hints), localPreference01 };
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
  if (semantic.comparisonIntent || commerce.comparisonIntent || commerce.storeDealHunter) return "market_compare";
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

function inferMarketMode(args: {
  envelope: string;
  semantic: SemanticQueryUnderstanding;
  commerce: CommerceSearchIntents;
  brand: string | null;
  model: string | null;
  variant: string | null;
  primary: CanonicalQueryIntent;
}): CanonicalMarketIntentMode {
  const { envelope, semantic, commerce, brand, model, variant, primary } = args;
  if (primary === "alternative") {
    if (brand && model) return "hybrid_compare";
    if (semantic.productCategory !== "unknown") return "category_shopping";
    return "broad_discovery";
  }
  const hasExactIdentity =
    Boolean(brand && model) ||
    Boolean(variant && (brand || model)) ||
    /\b(ean|gtin|sku|model\s*(no|number)|\d{8,14})\b/i.test(envelope) ||
    /(iphone\s*\d{1,2}|airpods?\s*(pro|max|\d)|adidas\s+samba)/i.test(envelope) ||
    /(ايفون|آيفون)\s*\d{1,2}/i.test(envelope);
  const compareLike =
    primary === "market_compare" ||
    primary === "best_value" ||
    primary === "cheapest_trusted" ||
    commerce.comparisonIntent ||
    commerce.storeDealHunter ||
    semantic.budgetIntent01 >= 0.52 ||
    semantic.premiumIntent01 >= 0.56;
  if (hasExactIdentity) return compareLike ? "hybrid_compare" : "exact_sku";
  if (compareLike && semantic.productCategory !== "unknown") return "hybrid_compare";
  if (semantic.productCategory !== "unknown") return "category_shopping";
  return "broad_discovery";
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
  const marketMode = inferMarketMode({ envelope, semantic, commerce: commerceIntents, brand, model, variant, primary });
  const market = detectMarket(envelope, budget.currency);
  let category = semantic.productCategory;
  if (category === "unknown") {
    if (/(?:كرسي|office\s+chair|desk\s+chair|كنبة|كنبه|sofa|couch|chair|stoel)/i.test(envelope)) category = "furniture";
    else if (/(?:libre|edp|edt|parfum|perfume|fragrance|ysl|yves\s+saint\s+laurent|عطر)/i.test(envelope)) category = "fragrance";
  }
  return {
    version: 1,
    originalQuery,
    normalizedQuery,
    upstreamQuery: buildUpstreamShoppingQuery(normalizedQuery || originalQuery),
    language: languageFrom(semantic.languages),
    languages: semantic.languages,
    category,
    productType: category === "unknown" ? "unknown" : category.replace("_", " "),
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
    marketMode,
    condition,
    merchantHints: detectMerchantHints(envelope),
    market,
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
    marketMode: q.marketMode,
    condition: q.condition,
    merchantHints: q.merchantHints,
    market: q.market,
    exclusions: q.exclusions,
  };
}
