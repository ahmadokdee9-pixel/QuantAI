/**
 * QuantAI Global Commerce Intelligence Foundation v1.
 * Tray-wide, deterministic commerce OS layer: query → identity → merchant → market → decision.
 */

import { extractProductIdentity } from "@/lib/deals/productIdentity";
import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";
import { normalizeStringArray } from "./normalizeIntelligenceSignals";
import { parseSemanticCommerceQuery } from "./semanticQueryBrain";
import { intentMatchEnvelope, parseCommerceSearchIntents } from "./searchIntentV2";
import { queryListingRelevance01 } from "./queryRelevance";
import { buildUnifiedMarketGroup } from "./unifiedMarketMatching";

export type GlobalCommerceAction = "BUY NOW" | "STRONG BUY" | "SAFE BUY" | "WAIT" | "COMPARE" | "AVOID";

export type GlobalIdentityRelation =
  | "exact_match"
  | "same_family"
  | "similar_alternative"
  | "accessory"
  | "fake_or_replica"
  | "wrong_product"
  | "unknown";

export type QiGlobalQueryUnderstanding = {
  raw: string;
  structuredQuery: string;
  languages: ("english" | "arabic")[];
  productType: string;
  brand: string;
  model: string;
  color: string;
  size: string;
  budget: { amount: number | null; currency: "EUR" | "USD" | "GBP" | null };
  qualityPreference: "budget" | "mid" | "premium" | "luxury";
  urgency: "none" | "low" | "high";
  countryMarket: "nl" | "eu" | "us" | "uk" | "unknown";
  authenticityConcern: boolean;
  dealIntent: "none" | "real_only" | "deal_hunt";
};

export type QiMerchantProfile = {
  trustScore: number;
  trustTier: "high" | "moderate" | "low";
  routeQuality01: number;
  preferredLinkKind: NonNullable<QuantProduct["outboundRouteKind"]> | "unknown";
  shippingClarity01: number;
  returnPolicyConfidence01: number;
  marketplaceRisk: "low" | "medium" | "high";
  brandAuthority01: number;
};

export type QiMarketPriceIntelligence = {
  familyId: string;
  sameProductListingCount: number;
  sameProductStoreCount: number;
  marketMedianPrice: number;
  cheapestTrustedPrice: number | null;
  cheapestTrustedStore: string;
  priceSpreadPct: number;
  pricePosition: "underpriced" | "fair" | "overpriced" | "abnormal" | "unknown";
  fakeDiscountRisk01: number;
  inflatedAnchorRisk01: number;
  abnormalListing01: number;
};

export type QiGlobalCommerceIntelligence = {
  query: QiGlobalQueryUnderstanding;
  identityRelation: GlobalIdentityRelation;
  merchant: QiMerchantProfile;
  market: QiMarketPriceIntelligence;
  decision: {
    action: GlobalCommerceAction;
    analystLine: string;
    confidence01: number;
  };
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const rx of patterns) {
    const m = text.match(rx);
    if (m?.[1]) return m[1].trim().toLowerCase();
    if (m?.[0]) return m[0].trim().toLowerCase();
  }
  return "unknown";
}

function detectLanguages(raw: string): ("english" | "arabic")[] {
  const out: ("english" | "arabic")[] = [];
  if (/[a-z]/i.test(raw)) out.push("english");
  if (/[\u0600-\u06FF]/.test(raw)) out.push("arabic");
  return out.length ? out : ["english"];
}

function buildStructuredQueryLabel(q: QiGlobalQueryUnderstanding): string {
  return [
    q.brand !== "unknown" ? q.brand : "",
    q.model !== "unknown" ? q.model : "",
    q.productType !== "unknown" ? q.productType : "",
    q.color !== "unknown" ? q.color : "",
    q.size !== "unknown" ? q.size : "",
    q.budget.amount != null ? `under ${q.budget.amount} ${q.budget.currency ?? ""}`.trim() : "",
    q.countryMarket !== "unknown" ? q.countryMarket : "",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildGlobalQueryUnderstanding(rawQuery: string): QiGlobalQueryUnderstanding {
  const semantic = parseSemanticCommerceQuery(rawQuery);
  const intents = parseCommerceSearchIntents(rawQuery);
  const envelope = intentMatchEnvelope(rawQuery);
  const brand = semantic.brandsDetected[0] ?? "unknown";
  const productType = semantic.productTypeHint ?? firstMatch(envelope, [
    /\b(shoes?|sneakers?|trainers?)\b/i,
    /\b(iphone|phone|smartphone)\b/i,
    /\b(sofa|couch)\b/i,
    /\b(perfume|fragrance|parfum|cologne)\b/i,
    /\b(laptop|notebook|macbook)\b/i,
    /\b(headphones?|earbuds?|airpods?)\b/i,
    /\b(watch|smartwatch)\b/i,
    /\b(ساعة|هاتف|لابتوب|حذاء|كنبة|عطر|سماعات)\b/i,
  ]);

  const q: QiGlobalQueryUnderstanding = {
    raw: rawQuery,
    structuredQuery: "",
    languages: detectLanguages(rawQuery),
    productType: productType || "unknown",
    brand,
    model: firstMatch(envelope, [
      /\b(iphone\s+\d{1,2}\s*(?:pro|max|plus|mini)?)\b/i,
      /\b(galaxy\s+s\d{1,2}\s*(?:ultra|plus)?)\b/i,
      /\b(pixel\s+\d{1,2}\s*(?:pro)?)\b/i,
      /\b(airpods\s*(?:pro|max)?\s*(?:\d|2|3)?)\b/i,
      /\b(rtx\s*\d{3,4}\s*(?:ti|super)?)\b/i,
    ]),
    color: firstMatch(envelope, [
      /\b(black|white|blue|red|green|silver|gold|grey|gray|pink|purple|beige|brown)\b/i,
      /\b(اسود|أسود|ابيض|أبيض|ازرق|أزرق|ذهبي|فضي|رمادي|وردي)\b/i,
    ]),
    size: firstMatch(envelope, [
      /\b(\d{2,3}\s*(?:gb|tb))\b/i,
      /\b(eu\s*\d{2}|us\s*\d{1,2}|uk\s*\d{1,2})\b/i,
      /\b(xs|s|m|l|xl|xxl)\b/i,
      /\b(\d{2,3}\s*cm)\b/i,
    ]),
    budget: { amount: semantic.budgetMaxAmount, currency: semantic.budgetCurrency },
    qualityPreference: semantic.qualityLevel,
    urgency: semantic.urgency,
    countryMarket: semantic.geoFocus ?? "unknown",
    authenticityConcern: intents.trustedOnly || intents.riskAvoidance || /\b(fake|replica|authentic|original|genuine|scam|تقليد|اصلي|أصلي)\b/i.test(envelope),
    dealIntent: semantic.discountIntent,
  };
  q.structuredQuery = buildStructuredQueryLabel(q) || rawQuery.trim();
  return q;
}

function routeQuality(kind: QuantProduct["outboundRouteKind"]): number {
  if (kind === "direct_merchant") return 1;
  if (kind === "merchant_search") return 0.74;
  if (kind === "google_interstitial") return 0.36;
  return 0.34;
}

function merchantAuthority(product: QuantProduct): number {
  const store = product.store.toLowerCase();
  const title = product.title.toLowerCase();
  const direct = routeQuality(product.outboundRouteKind);
  let s = 0.34 + direct * 0.28;
  if (/\b(official|authorized|brand store|apple|samsung|nike|adidas|sony|dyson|microsoft)\b/i.test(store)) s += 0.24;
  if (/(coolblue|bol\.com|mediamarkt|amazon|zalando|ikea|douglas|notino)/i.test(store)) s += 0.16;
  const brands = extractProductIdentity(product).brands;
  if (brands.some((b) => store.includes(b) || title.includes(b))) s += 0.08;
  return clamp01(s);
}

function shippingClarity(product: QuantProduct): number {
  const text = `${product.shipping ?? ""} ${product.availability ?? ""} ${normalizeStringArray(product.extensions).join(" ")}`.toLowerCase();
  if (!text.trim()) return 0.28;
  let s = 0.42;
  if (/\b(free|tracked|insured|next day|tomorrow|in stock|ships|delivery|returns?)\b/i.test(text)) s += 0.28;
  if (/\b(unknown|varies|contact seller|not specified)\b/i.test(text)) s -= 0.24;
  return clamp01(s);
}

function returnPolicyConfidence(product: QuantProduct): number {
  const text = `${product.store} ${product.shipping ?? ""} ${normalizeStringArray(product.extensions).join(" ")}`.toLowerCase();
  let s = getStoreTrustScore(product.store) / 160;
  if (/\b(return|returns|warranty|guarantee|authorized|official)\b/i.test(text)) s += 0.25;
  if (getMarketplaceSellerRiskTier(product.store, product.title) === "high") s -= 0.18;
  return clamp01(s);
}

function buildMerchantProfile(product: QuantProduct): QiMerchantProfile {
  const trustScore = getStoreTrustScore(product.store);
  const mp = getMarketplaceSellerRiskTier(product.store, product.title);
  return {
    trustScore,
    trustTier: trustScore >= 72 ? "high" : trustScore >= 52 ? "moderate" : "low",
    routeQuality01: routeQuality(product.outboundRouteKind),
    preferredLinkKind: product.outboundRouteKind ?? "unknown",
    shippingClarity01: shippingClarity(product),
    returnPolicyConfidence01: returnPolicyConfidence(product),
    marketplaceRisk: mp,
    brandAuthority01: merchantAuthority(product),
  };
}

function identityRelation(product: QuantProduct, query: QiGlobalQueryUnderstanding): GlobalIdentityRelation {
  const id = product.qiListingIdentity;
  const roles = normalizeStringArray(id?.commercialRoles);
  const qRel = queryListingRelevance01(query.structuredQuery || query.raw, product);
  if (roles.includes("replica_risk") || roles.includes("packaging_only")) return "fake_or_replica";
  if (id && (id.semanticMismatchPenalty01 >= 0.62 || id.contaminationRisk01 >= 0.78)) return "wrong_product";
  if (roles.includes("accessory") || roles.includes("replacement_part") || roles.includes("charging_case_component")) {
    return "accessory";
  }
  if ((product.qiCanonicalIdentity?.identityConfidence ?? 0) >= 78 && qRel >= 0.58) return "exact_match";
  if ((product.qiCanonicalIdentity?.identityConfidence ?? 0) >= 58) return "same_family";
  if ((product.qiRelationshipBundle?.universalSimilarity01 ?? 0) >= 0.58 || qRel >= 0.44) return "similar_alternative";
  return "unknown";
}

function pricePosition(product: QuantProduct, median: number, fake01: number): QiMarketPriceIntelligence["pricePosition"] {
  if (product.price <= 0 || median <= 0) return "unknown";
  const ratio = product.price / median;
  if (fake01 >= 0.65 || ratio < 0.45 || ratio > 1.75) return "abnormal";
  if (ratio <= 0.88) return "underpriced";
  if (ratio >= 1.16) return "overpriced";
  return "fair";
}

function inflatedAnchorRisk(product: QuantProduct, merchant: QiMerchantProfile): number {
  if (product.oldPrice == null || product.oldPrice <= product.price || product.price <= 0) return 0;
  const pct = (product.oldPrice - product.price) / product.oldPrice;
  let s = pct > 0.62 ? 0.72 : pct > 0.48 ? 0.5 : pct > 0.34 ? 0.28 : 0.12;
  if (merchant.trustTier === "low") s += 0.18;
  if (merchant.marketplaceRisk === "high") s += 0.16;
  return clamp01(s);
}

function fakeDiscountRiskLabel(product: QuantProduct, list: QuantProduct[]): "low" | "medium" | "high" {
  if (product.oldPrice == null || product.oldPrice <= product.price || product.price <= 0) return "low";
  const discount = (product.oldPrice - product.price) / product.oldPrice;
  const prices = list.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const peerMedian = prices.length ? prices[Math.floor(prices.length / 2)]! : 0;
  const trust = getStoreTrustScore(product.store);
  const tooCheapVsPeers = peerMedian > 0 && product.price < peerMedian * 0.56;
  const inflatedAnchor = peerMedian > 0 && product.oldPrice > peerMedian * 1.42;
  if ((discount >= 0.58 && trust < 62) || (tooCheapVsPeers && inflatedAnchor && trust < 68)) return "high";
  if (discount >= 0.42 || inflatedAnchor || (tooCheapVsPeers && trust < 72)) return "medium";
  return "low";
}

function fakeDiscountRisk01FromLabel(label: "low" | "medium" | "high"): number {
  if (label === "high") return 0.76;
  if (label === "medium") return 0.42;
  return 0.16;
}

function fallbackMarket(product: QuantProduct, list: QuantProduct[], merchant: QiMerchantProfile): QiMarketPriceIntelligence {
  const prices = list.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)]! : 0;
  const fake01 = fakeDiscountRisk01FromLabel(fakeDiscountRiskLabel(product, list));
  const anchor01 = inflatedAnchorRisk(product, merchant);
  return {
    familyId: product.qiCanonicalIdentity?.familyClusterId ?? "unknown",
    sameProductListingCount: 1,
    sameProductStoreCount: 1,
    marketMedianPrice: median,
    cheapestTrustedPrice: merchant.trustScore >= 66 && product.price > 0 ? product.price : null,
    cheapestTrustedStore: merchant.trustScore >= 66 ? product.store : "",
    priceSpreadPct: 0,
    pricePosition: pricePosition(product, median, Math.max(fake01, anchor01)),
    fakeDiscountRisk01: fake01,
    inflatedAnchorRisk01: anchor01,
    abnormalListing01: clamp01((product.qiListingIdentity?.contaminationRisk01 ?? 0) * 0.55 + Math.max(fake01, anchor01) * 0.45),
  };
}

function buildDecision(args: {
  product: QuantProduct;
  relation: GlobalIdentityRelation;
  merchant: QiMerchantProfile;
  market: QiMarketPriceIntelligence;
}): QiGlobalCommerceIntelligence["decision"] {
  const { product, relation, merchant, market } = args;
  const qi = product.qiComposite ?? 0;
  const reality = product.qiRealityTrust?.realityScore ?? 72;
  const stars = ratingValue(product.rating);
  let action: GlobalCommerceAction = "COMPARE";
  if (relation === "fake_or_replica" || relation === "wrong_product" || market.abnormalListing01 >= 0.74) action = "AVOID";
  else if (market.fakeDiscountRisk01 >= 0.66 && merchant.trustTier !== "high") action = "AVOID";
  else if (market.pricePosition === "overpriced" || product.qiPredictive?.likelyPriceMove === "drop") action = "WAIT";
  else if (relation === "accessory" || relation === "similar_alternative" || merchant.trustTier === "low") action = "COMPARE";
  else if (qi >= 84 && merchant.trustTier === "high") action = "STRONG BUY";
  else if (qi >= 74 && reality >= 70 && merchant.trustScore >= 62) action = "BUY NOW";
  else if (qi >= 62 && merchant.trustScore >= 56 && stars >= 4) action = "SAFE BUY";

  const confidence01 = clamp01(
    qi / 100 * 0.34 +
      merchant.trustScore / 100 * 0.28 +
      reality / 100 * 0.18 +
      (1 - market.abnormalListing01) * 0.12 +
      (relation === "exact_match" ? 0.08 : relation === "same_family" ? 0.04 : 0)
  );
  const analystLine =
    action === "AVOID"
      ? "Avoid: identity or trust risk is too high for a clean commerce decision."
      : action === "WAIT"
        ? "Wait: peer pricing or timing signals suggest a better entry may appear."
        : action === "COMPARE"
          ? "Compare: identity, merchant, or price spread needs one more trusted cross-check."
          : action === "STRONG BUY"
            ? "Strong buy: clean identity, trusted merchant, and pricing align."
            : action === "BUY NOW"
              ? "Buy now: trusted enough with a fair market position."
              : "Safe buy: acceptable trust and value, but not a rare bargain.";
  return { action, analystLine, confidence01 };
}

export function buildGlobalCommerceFoundationForTray(
  products: QuantProduct[],
  searchQuery: string
): Map<string, QiGlobalCommerceIntelligence> {
  const out = new Map<string, QiGlobalCommerceIntelligence>();
  if (!products.length) return out;
  const query = buildGlobalQueryUnderstanding(searchQuery);
  const unified = buildUnifiedMarketGroup(products, searchQuery).byLink;

  for (const product of products) {
    const merchant = buildMerchantProfile(product);
    const family = unified.get(product.link);
    const market = family
      ? {
          familyId: family.familyId,
          sameProductListingCount: family.listingCount,
          sameProductStoreCount: family.storeCount,
          marketMedianPrice: family.bestTrustedPrice > 0 ? family.bestTrustedPrice : product.price,
          cheapestTrustedPrice: family.bestTrustedPrice > 0 ? family.bestTrustedPrice : null,
          cheapestTrustedStore: family.bestTrustedStore,
          priceSpreadPct: family.marketSpreadPct,
          pricePosition: family.overpricedVsFair ? "overpriced" : pricePosition(product, family.bestTrustedPrice, 0),
          fakeDiscountRisk01: fakeDiscountRisk01FromLabel(fakeDiscountRiskLabel(product, products)),
          inflatedAnchorRisk01: inflatedAnchorRisk(product, merchant),
          abnormalListing01: clamp01((product.qiListingIdentity?.contaminationRisk01 ?? 0) * 0.5 + (family.overpricedVsFair ? 0.32 : 0)),
        }
      : fallbackMarket(product, products, merchant);
    const relation = identityRelation(product, query);
    out.set(product.link, {
      query,
      identityRelation: relation,
      merchant,
      market,
      decision: buildDecision({ product, relation, merchant, market }),
    });
  }
  return out;
}
