/**
 * QuantAI Wide Merchant Discovery Engine v1.
 * Builds many NL/EU-first merchant search routes before offer fusion and ranking.
 */

import { buildMerchantSearchUrl } from "@/lib/search/directMerchantRouter";
import { buildSearchQueryUnderstanding, type SemanticQueryUnderstanding } from "@/lib/search/queryUnderstanding";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import { fuseProductFeeds } from "./productFeedFusion";

export type WideMerchantRegion = "nl" | "eu" | "global";
export type WideMerchantQueryKind = "exact" | "identity" | "specs" | "ean" | "fallback";

export type WideMerchant = {
  key: string;
  label: string;
  region: WideMerchantRegion;
  priority: number;
  cats?: string[];
  lowTrustFallback?: boolean;
};

export type WideMerchantCandidate = {
  merchantKey: string;
  label: string;
  url: string;
  priority: number;
  region: WideMerchantRegion;
  identityQuery: string;
  queryKind: WideMerchantQueryKind;
  routeQuality: number;
  directRoute: boolean;
};

const WIDE_MERCHANTS: WideMerchant[] = [
  { key: "bol", label: "bol.com", region: "nl", priority: 98 },
  { key: "coolblue", label: "Coolblue", region: "nl", priority: 96, cats: ["phone", "laptop", "audio", "electronics", "watch"] },
  { key: "mediamarkt", label: "MediaMarkt", region: "nl", priority: 93, cats: ["phone", "laptop", "audio", "electronics", "watch"] },
  { key: "amazon", label: "Amazon.nl", region: "nl", priority: 89 },
  { key: "amazon_de", label: "Amazon.de", region: "eu", priority: 84 },
  { key: "apple", label: "Apple", region: "eu", priority: 93, cats: ["phone", "laptop", "audio", "watch", "electronics"] },
  { key: "samsung", label: "Samsung", region: "eu", priority: 90, cats: ["phone", "audio", "watch", "electronics"] },
  { key: "nike", label: "Nike", region: "eu", priority: 91, cats: ["shoes", "fashion", "sports"] },
  { key: "adidas", label: "Adidas", region: "eu", priority: 90, cats: ["shoes", "fashion", "sports"] },
  { key: "zalando", label: "Zalando", region: "eu", priority: 88, cats: ["shoes", "fashion", "beauty"] },
  { key: "wehkamp", label: "Wehkamp", region: "nl", priority: 82, cats: ["fashion", "beauty", "home", "furniture"] },
  { key: "decathlon", label: "Decathlon", region: "nl", priority: 82, cats: ["sports", "shoes"] },
  { key: "belsimpel", label: "Belsimpel", region: "nl", priority: 86, cats: ["phone", "audio", "watch"] },
  { key: "backmarket", label: "Back Market", region: "nl", priority: 75, cats: ["phone", "laptop", "audio", "electronics"] },
  { key: "ebay", label: "eBay", region: "global", priority: 66 },
  { key: "marktplaats", label: "Marktplaats", region: "nl", priority: 63 },
  { key: "fnac", label: "Fnac", region: "eu", priority: 80, cats: ["phone", "laptop", "audio", "electronics", "beauty"] },
  { key: "galaxus", label: "Galaxus", region: "eu", priority: 83, cats: ["phone", "laptop", "audio", "electronics", "home"] },
  { key: "alternate", label: "Alternate", region: "nl", priority: 84, cats: ["laptop", "electronics"] },
  { key: "azerty", label: "Azerty", region: "nl", priority: 82, cats: ["laptop", "electronics"] },
  { key: "megekko", label: "Megekko", region: "nl", priority: 82, cats: ["laptop", "electronics"] },
  { key: "aboutyou", label: "AboutYou", region: "eu", priority: 77, cats: ["shoes", "fashion", "beauty"] },
  { key: "hm", label: "H&M", region: "eu", priority: 72, cats: ["fashion", "beauty"] },
  { key: "zara", label: "Zara", region: "eu", priority: 73, cats: ["fashion", "beauty"] },
  { key: "ikea", label: "IKEA", region: "nl", priority: 88, cats: ["furniture", "home", "desk_setup"] },
  { key: "praxis", label: "Praxis", region: "nl", priority: 73, cats: ["home", "furniture", "desk_setup"] },
  { key: "gamma", label: "Gamma", region: "nl", priority: 73, cats: ["home", "furniture", "desk_setup"] },
  { key: "hornbach", label: "Hornbach", region: "nl", priority: 73, cats: ["home", "furniture", "desk_setup"] },
  { key: "blokker", label: "Blokker", region: "nl", priority: 75, cats: ["home", "furniture", "beauty"] },
  { key: "hema", label: "HEMA", region: "nl", priority: 70, cats: ["home", "fashion", "beauty"] },
  { key: "douglas", label: "Douglas", region: "nl", priority: 84, cats: ["fragrance", "beauty"] },
  { key: "notino", label: "Notino", region: "eu", priority: 82, cats: ["fragrance", "beauty"] },
  { key: "bolia", label: "Bolia", region: "eu", priority: 80, cats: ["furniture", "home"] },
  { key: "fonq", label: "FonQ", region: "nl", priority: 80, cats: ["furniture", "home", "desk_setup"] },
  { key: "vidaxl", label: "VidaXL", region: "eu", priority: 70, cats: ["furniture", "home"] },
  { key: "westwing", label: "Westwing", region: "eu", priority: 76, cats: ["furniture", "home"] },
  { key: "leenbakker", label: "Leen Bakker", region: "nl", priority: 78, cats: ["furniture", "home"] },
  { key: "jysk", label: "JYSK", region: "nl", priority: 76, cats: ["furniture", "home"] },
  { key: "beterbed", label: "Beter Bed", region: "nl", priority: 74, cats: ["furniture", "home"] },
  { key: "otto", label: "OTTO", region: "eu", priority: 78, cats: ["fashion", "home", "furniture", "electronics"] },
  { key: "debijenkorf", label: "de Bijenkorf", region: "nl", priority: 79, cats: ["fashion", "beauty", "home", "fragrance"] },
  { key: "expert", label: "Expert", region: "nl", priority: 78, cats: ["electronics", "home", "audio", "phone"] },
  { key: "koffiewarenhuis", label: "Koffiewarenhuis", region: "nl", priority: 77, cats: ["home", "electronics"] },
  { key: "tuinmeubelland", label: "Tuinmeubelland", region: "nl", priority: 76, cats: ["home", "furniture"] },
  { key: "babypark", label: "Babypark", region: "nl", priority: 78 },
  { key: "prenatal", label: "Prenatal", region: "nl", priority: 75 },
  { key: "aliexpress", label: "AliExpress", region: "global", priority: 48, lowTrustFallback: true },
  { key: "temu", label: "Temu", region: "global", priority: 40, lowTrustFallback: true },
];

function cleanQuery(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(cheap|cheaper|discount|deal|deals|best|trusted|safe|buy|now|official|stores?|winkel|kopen)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function eanTokens(query: string): string[] {
  return Array.from(query.matchAll(/\b\d{8,14}\b/g), (m) => m[0]!).slice(0, 2);
}

function compactIdentityQuery(parts: Array<string | null | undefined>): string {
  return cleanQuery(parts.filter(Boolean).join(" "));
}

function queryVariants(
  query: string,
  intent: SemanticQueryUnderstanding,
  canonicalQuery?: CanonicalQueryContract
): { kind: WideMerchantQueryKind; value: string }[] {
  const semantic = cleanQuery(intent.semanticKeywords.slice(0, 10).join(" "));
  const category = intent.productCategory !== "unknown" ? intent.productCategory.replace("_", " ") : "";
  const anchor = cleanQuery(intent.alternativeIntent.anchor);
  const exact = query.trim();
  const canonicalIdentity = compactIdentityQuery([
    canonicalQuery?.brand,
    canonicalQuery?.model,
    canonicalQuery?.variant,
    canonicalQuery?.productType !== "general" ? canonicalQuery?.productType : "",
  ]);
  const identity = canonicalIdentity || cleanQuery([semantic, anchor].filter(Boolean).join(" ")) || intent.rewritten || exact;
  const budget = canonicalQuery?.budget.active && canonicalQuery.budget.maxPrice ? `under ${canonicalQuery.budget.maxPrice}` : "";
  const specs = cleanQuery([
    identity,
    canonicalQuery?.productType,
    category,
    canonicalQuery?.condition !== "any" ? canonicalQuery?.condition : "",
    budget,
    ...intent.productPurpose,
    ...intent.usageContext,
  ].join(" "));
  const eans = eanTokens(query).map((value) => ({ kind: "ean" as const, value }));
  const variants: { kind: WideMerchantQueryKind; value: string }[] = [
    { kind: "exact", value: exact },
    { kind: "identity", value: identity },
    { kind: "specs", value: specs || identity },
    ...eans,
  ];
  return variants.filter((x) => x.value.trim());
}

function googleFallbackRoute(query: string, merchant: WideMerchant): string {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${query} ${merchant.label}`.trim())}`;
}

export function scoreMerchantRouteQuality(args: {
  merchant: WideMerchant;
  queryKind: WideMerchantQueryKind;
  directRoute: boolean;
  parsedIntent: SemanticQueryUnderstanding;
}): number {
  const { merchant, queryKind, directRoute, parsedIntent } = args;
  const catFit = !merchant.cats || merchant.cats.includes(parsedIntent.productCategory);
  let score = merchant.priority + (catFit ? 14 : parsedIntent.productCategory === "unknown" ? 0 : -8);
  if (merchant.region === "nl") score += 5;
  if (merchant.region === "eu") score += 2;
  if (queryKind === "ean") score += 12;
  if (queryKind === "identity") score += 7;
  if (queryKind === "specs") score += 4;
  if (directRoute) score += 8;
  if (merchant.lowTrustFallback) score -= 24;
  return Math.max(1, Math.min(100, Math.round(score)));
}

export function generateMerchantSearchRoutes(
  query: string,
  merchant: WideMerchant,
  parsedIntent: SemanticQueryUnderstanding | CanonicalQueryContract = buildSearchQueryUnderstanding(query)
): WideMerchantCandidate[] {
  const semanticIntent = "semantic" in parsedIntent ? parsedIntent.semantic : parsedIntent;
  const canonicalQuery = "semantic" in parsedIntent ? parsedIntent : undefined;
  return queryVariants(query, semanticIntent, canonicalQuery).map(({ kind, value }) => {
    const directUrl = buildMerchantSearchUrl(merchant.key, value, merchant.key === "amazon_de" ? "de" : "nl");
    const directRoute = Boolean(directUrl);
    const routeQuality = scoreMerchantRouteQuality({ merchant, queryKind: kind, directRoute, parsedIntent: semanticIntent });
    return {
      merchantKey: merchant.key,
      label: merchant.label,
      url: directUrl ?? googleFallbackRoute(value, merchant),
      priority: routeQuality,
      region: merchant.region,
      identityQuery: value,
      queryKind: kind,
      routeQuality,
      directRoute,
    };
  });
}

export function buildWideMerchantCandidates(
  query: string,
  parsedIntent: SemanticQueryUnderstanding | CanonicalQueryContract = buildSearchQueryUnderstanding(query)
): WideMerchantCandidate[] {
  const semanticIntent = "semantic" in parsedIntent ? parsedIntent.semantic : parsedIntent;
  const canonicalQuery = "semantic" in parsedIntent ? parsedIntent : undefined;
  const conservativeUnknown = semanticIntent.productCategory === "unknown";
  const candidates = WIDE_MERCHANTS.flatMap((merchant) => generateMerchantSearchRoutes(query, merchant, canonicalQuery ?? semanticIntent))
    .filter((c) => c.routeQuality >= (conservativeUnknown ? 58 : 50) || c.queryKind === "ean")
    .sort((a, b) => b.routeQuality - a.routeQuality || a.label.localeCompare(b.label));
  const keyed = new Map<string, WideMerchantCandidate>();
  for (const c of candidates) {
    const key = `${c.merchantKey}:${c.queryKind}:${c.identityQuery.toLowerCase()}`;
    if (!keyed.has(key)) keyed.set(key, c);
  }
  return Array.from(keyed.values()).slice(0, 96);
}

export function mergeExternalAndInternalOffersWithoutEarlyCollapse(args: {
  internal: QuantProduct[];
  external: QuantProduct[];
  query: string;
  canonicalQuery?: CanonicalQueryContract;
}): QuantProduct[] {
  return fuseProductFeeds({
    ...args,
    maxRows: 60,
    preserveExactMerchantOffers: true,
  });
}

