import type { QuantProduct } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";

export type MarketComparisonSummary = {
  version: 1;
  localMarket: CanonicalQueryContract["market"];
  offerCount: number;
  merchantCount: number;
  trustedMerchantCount: number;
  regionalCoverage: Record<string, number>;
  currency: CanonicalQueryContract["market"]["currency"];
  cheapestTrustedOffer: MarketComparisonPick | null;
  strongestValueOffer: MarketComparisonPick | null;
  highestConfidenceOffer: MarketComparisonPick | null;
  strongestDiscountOffer: MarketComparisonPick | null;
  premiumSellerOption: MarketComparisonPick | null;
  lowRiskOption: MarketComparisonPick | null;
  comparisonSignals: {
    priceSpreadRatio: number;
    trustedCoverage01: number;
    sameProductCoverage01: number;
    regionalFit01: number;
    marketplaceShare01: number;
    ebayShare01: number;
    merchantBalanceScore: number;
    bestDecisionAction: string | null;
    riskySellerShare01: number;
    productFamilyCount: number;
    strongestFamilyMerchantDepth: number;
    duplicateMerchantPressure01: number;
  };
};

export type MarketComparisonPick = {
  title: string;
  store: string;
  price: number;
  valueScore: number;
  dealStrength: number;
  merchantTrustConfidence: number;
  fakeDiscountRisk: string;
  buyTimingSignal: string;
};

function pickShape(product: QuantProduct): MarketComparisonPick {
  return {
    title: product.title.slice(0, 140),
    store: product.store,
    price: product.price,
    valueScore: product.qiCommerceQuality?.valueScore ?? 0,
    dealStrength: product.qiCommerceQuality?.dealStrength ?? 0,
    merchantTrustConfidence: product.qiCommerceQuality?.merchantTrustConfidence ?? Math.round(getStoreTrustScore(product.store)),
    fakeDiscountRisk: product.qiCommerceQuality?.fakeDiscountRisk ?? "unknown",
    buyTimingSignal: product.qiCommerceQuality?.buyTimingSignal ?? "unknown",
  };
}

function bestBy(products: QuantProduct[], score: (product: QuantProduct) => number): QuantProduct | null {
  let best: QuantProduct | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const product of products) {
    const s = score(product);
    if (s > bestScore) {
      best = product;
      bestScore = s;
    }
  }
  return best;
}

function priceSpreadRatio(products: QuantProduct[]): number {
  const prices = products.map((p) => p.price).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (prices.length < 2) return 0;
  return Number(((prices[prices.length - 1]! - prices[0]!) / Math.max(1, prices[0]!)).toFixed(2));
}

function familyKey(product: QuantProduct): string {
  return (
    product.qiCanonicalIdentity?.familyClusterId ||
    product.qiGlobalCommerce?.market.familyId ||
    product.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80)
  );
}

function regionForStore(store: string): string {
  const s = store.toLowerCase();
  if (/\b(bol|coolblue|wehkamp|hema|blokker|expert|fonq|leen bakker|jysk|praxis|gamma|hornbach|babypark|prenatal|koffie|tuinmeubelland)\b/i.test(s)) return "NL";
  if (/\b(walmart|best buy|target|newegg|b&h|home depot|lowe|fragrancex)\b/i.test(s)) return "US";
  if (/\b(currys|argos|john lewis|lookfantastic)\b/i.test(s)) return "UK";
  if (/\b(fnac|darty|boulanger|cdiscount|carrefour|rakuten|flaconi|notino|galaxus|otto|kaufland)\b/i.test(s)) return "EU";
  if (/\b(amazon|ebay|etsy|aliexpress|temu|wayfair)\b/i.test(s)) return "GLOBAL";
  return "OTHER";
}

export function buildMarketComparisonSummary(
  products: QuantProduct[],
  canonicalQuery: CanonicalQueryContract
): MarketComparisonSummary {
  const trusted = products.filter((p) => {
    const marketplaceRisk = getMarketplaceSellerRiskTier(p.store, p.title);
    const confidence = p.qiCommerceQuality?.merchantTrustConfidence ?? 0;
    if (marketplaceRisk !== "low") return confidence >= 78 && p.qiCommerceQuality?.fakeDiscountRisk === "low";
    return getStoreTrustScore(p.store) >= 66 || confidence >= 66;
  });
  const clean = products.filter((p) => p.qiCommerceQuality?.fakeDiscountRisk !== "high");
  const regionalCoverage = products.reduce<Record<string, number>>((acc, product) => {
    const region = regionForStore(product.store);
    acc[region] = (acc[region] ?? 0) + 1;
    return acc;
  }, {});
  const localRows = products.filter((p) => regionForStore(p.store) === canonicalQuery.market.country || (canonicalQuery.market.country === "NL" && regionForStore(p.store) === "EU"));
  const sameProductRows = products.filter((p) => p.qiIdentityGate?.identityGatePassed === true);
  const marketplaceShare = products.filter((p) => getMarketplaceSellerRiskTier(p.store, p.title) !== "low").length / Math.max(1, products.length);
  const ebayShare = products.filter((p) => /\bebay\b/i.test(p.store)).length / Math.max(1, products.length);
  const familyMerchants = products.reduce<Map<string, Set<string>>>((acc, product) => {
    const key = familyKey(product);
    const merchants = acc.get(key) ?? new Set<string>();
    merchants.add(product.store.toLowerCase().trim());
    acc.set(key, merchants);
    return acc;
  }, new Map());
  const merchantCounts = products.reduce<Map<string, number>>((acc, product) => {
    const key = product.store.toLowerCase().trim();
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map());
  const strongestFamilyMerchantDepth = Math.max(0, ...Array.from(familyMerchants.values()).map((merchants) => merchants.size));
  const duplicateMerchantPressure =
    Math.max(0, ...Array.from(merchantCounts.values()).map((count) => count / Math.max(1, products.length))) || 0;
  const merchantBalanceScore = Math.round(Math.max(0, Math.min(100, 100 - Math.max(0, ebayShare - 0.22) * 140 - Math.max(0, marketplaceShare - 0.42) * 90)));
  const cheapestTrusted = bestBy(trusted, (p) => (p.price > 0 ? -p.price : Number.NEGATIVE_INFINITY));
  const strongestValue = bestBy(clean, (p) => (p.qiCommerceQuality?.valueScore ?? 0) + (p.qiCommerceQuality?.dealStrength ?? 0) * 0.35);
  const highestConfidence = bestBy(clean, (p) => (p.qiCommerceQuality?.merchantTrustConfidence ?? 0) + (p.qiIdentityGate?.fusionConfidence ?? 0) * 20);
  const strongestDiscount = bestBy(clean, (p) => p.qiCommerceQuality?.dealStrength ?? 0);
  const premiumSeller = bestBy(clean, (p) => (p.qiCommerceQuality?.merchantTrustConfidence ?? 0) + getStoreTrustScore(p.store) * 0.35);
  const lowRisk = bestBy(clean, (p) => (p.qiCommerceQuality?.fakeDiscountRisk === "low" ? 30 : 0) + (p.qiCommerceQuality?.merchantTrustConfidence ?? 0) + (p.qiCommerceQuality?.valueScore ?? 0) * 0.25);
  const bestDecision = bestBy(clean, (p) => p.qiBuyingDecision?.decisionScore ?? 0);
  const riskySellerShare = products.filter((p) => p.qiBuyingDecision?.trustIntelligence.scamRisk !== "low").length / Math.max(1, products.length);
  return {
    version: 1,
    localMarket: canonicalQuery.market,
    offerCount: products.length,
    merchantCount: new Set(products.map((p) => p.store.toLowerCase().trim()).filter(Boolean)).size,
    trustedMerchantCount: new Set(trusted.map((p) => p.store.toLowerCase().trim()).filter(Boolean)).size,
    regionalCoverage,
    currency: canonicalQuery.market.currency,
    cheapestTrustedOffer: cheapestTrusted ? pickShape(cheapestTrusted) : null,
    strongestValueOffer: strongestValue ? pickShape(strongestValue) : null,
    highestConfidenceOffer: highestConfidence ? pickShape(highestConfidence) : null,
    strongestDiscountOffer: strongestDiscount ? pickShape(strongestDiscount) : null,
    premiumSellerOption: premiumSeller ? pickShape(premiumSeller) : null,
    lowRiskOption: lowRisk ? pickShape(lowRisk) : null,
    comparisonSignals: {
      priceSpreadRatio: priceSpreadRatio(products),
      trustedCoverage01: Number((trusted.length / Math.max(1, products.length)).toFixed(2)),
      sameProductCoverage01: Number((sameProductRows.length / Math.max(1, products.length)).toFixed(2)),
      regionalFit01: Number((localRows.length / Math.max(1, products.length)).toFixed(2)),
      marketplaceShare01: Number(marketplaceShare.toFixed(2)),
      ebayShare01: Number(ebayShare.toFixed(2)),
      merchantBalanceScore,
      bestDecisionAction: bestDecision?.qiBuyingDecision?.action ?? null,
      riskySellerShare01: Number(riskySellerShare.toFixed(2)),
      productFamilyCount: familyMerchants.size,
      strongestFamilyMerchantDepth,
      duplicateMerchantPressure01: Number(duplicateMerchantPressure.toFixed(2)),
    },
  };
}
