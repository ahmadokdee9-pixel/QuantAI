import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";

export type BuyingDecisionAction =
  | "BUY_NOW"
  | "WAIT_FOR_DROP"
  | "HIGH_VOLATILITY"
  | "STRONG_VALUE"
  | "PREMIUM_PRICING"
  | "DISCOUNT_LIKELY_SOON"
  | "SAFE_TRUSTED_OFFER"
  | "WEAK_MARKET_TIMING"
  | "HIDDEN_VALUE"
  | "RISKY_SELLER"
  | "BEST_REGIONAL_DEAL"
  | "COMPARE";

export type BuyingDecisionSignal = {
  version: 1;
  action: BuyingDecisionAction;
  confidence: number;
  decisionScore: number;
  decisionLabel: string;
  analystLine: string;
  primaryReasons: string[];
  priceIntelligence: {
    marketAverageEstimate: number;
    regionalBaselineEstimate: number;
    priceQuality: "underpriced" | "good" | "fair" | "premium" | "overpriced" | "unknown";
    discountConfidence: number;
    volatilityScore: number;
    seasonalDiscountPattern: boolean;
    pricingAnomaly: "none" | "underpriced_anomaly" | "overpriced" | "fake_markdown_risk";
  };
  trustIntelligence: {
    sellerTrustworthy: boolean;
    merchantReputationScore: number;
    fulfillmentConfidence: number;
    listingCompleteness: number;
    suspiciousMarketplaceBehavior: boolean;
    scamRisk: "low" | "medium" | "high";
  };
  comparisonFlags: {
    bestValue: boolean;
    cheapestTrusted: boolean;
    premiumSafest: boolean;
    bestDiscount: boolean;
    mostStablePrice: boolean;
    lowRiskPurchase: boolean;
    betterRegionalOfferLikely: boolean;
  };
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function median(nums: number[]): number {
  const s = nums.filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function average(nums: number[]): number {
  const clean = nums.filter((n) => Number.isFinite(n) && n > 0);
  return clean.length ? clean.reduce((sum, n) => sum + n, 0) / clean.length : 0;
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

function localFit(product: QuantProduct, canonicalQuery?: CanonicalQueryContract): boolean {
  if (!canonicalQuery) return false;
  const region = regionForStore(product.store);
  if (region === canonicalQuery.market.country) return true;
  return canonicalQuery.market.country === "NL" && region === "EU";
}

function priceQuality(priceVsMedian: number, fakeRisk: string): BuyingDecisionSignal["priceIntelligence"]["priceQuality"] {
  if (!Number.isFinite(priceVsMedian) || priceVsMedian <= 0) return "unknown";
  if (fakeRisk === "high") return "unknown";
  if (priceVsMedian < 0.55) return "underpriced";
  if (priceVsMedian < 0.86) return "good";
  if (priceVsMedian <= 1.12) return "fair";
  if (priceVsMedian <= 1.38) return "premium";
  return "overpriced";
}

function seasonalPattern(query: string, canonicalQuery?: CanonicalQueryContract): boolean {
  const q = query.toLowerCase();
  if (/\b(black friday|cyber monday|clearance|sale|winter|summer|holiday|january|back to school|aanbieding|korting)\b/i.test(q)) return true;
  const category = canonicalQuery?.category;
  return category === "fashion" || category === "furniture" || category === "fragrance";
}

function actionLabel(action: BuyingDecisionAction): string {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function chooseAction(args: {
  value: number;
  deal: number;
  trust: number;
  fakeRisk: string;
  volatility: number;
  priceQuality: BuyingDecisionSignal["priceIntelligence"]["priceQuality"];
  marketplaceRisk: "low" | "medium" | "high";
  cheapestTrusted: boolean;
  bestValue: boolean;
  localBest: boolean;
  likelyMove: string;
}): BuyingDecisionAction {
  if (args.marketplaceRisk === "high" || args.fakeRisk === "high" || args.trust < 42) return "RISKY_SELLER";
  if (args.priceQuality === "overpriced") return args.likelyMove === "down" ? "DISCOUNT_LIKELY_SOON" : "PREMIUM_PRICING";
  if (args.localBest && args.value >= 62 && args.trust >= 55) return "BEST_REGIONAL_DEAL";
  if (args.cheapestTrusted && args.value >= 64) return "SAFE_TRUSTED_OFFER";
  if (args.bestValue && args.value >= 74 && args.deal >= 62) return "HIDDEN_VALUE";
  if (args.value >= 76 && args.trust >= 62 && args.fakeRisk === "low") return "BUY_NOW";
  if (args.value >= 68 && args.deal >= 58) return "STRONG_VALUE";
  if (args.volatility >= 0.82 && args.likelyMove !== "stable" && (args.value < 64 || args.trust < 58)) return "HIGH_VOLATILITY";
  if (args.likelyMove === "down") return "WAIT_FOR_DROP";
  if (args.value < 48 && args.deal < 48) return "WEAK_MARKET_TIMING";
  return "COMPARE";
}

export function buildBuyingDecisionLayer(
  products: QuantProduct[],
  query: string,
  canonicalQuery?: CanonicalQueryContract
): QuantProduct[] {
  if (!products.length) return products;
  const withDecisions = products.map((product) => ({
    ...product,
    qiBuyingDecision: buildDecision(product, products, query, canonicalQuery),
  }));
  return withDecisions
    .sort((a, b) => {
      const scoreA = (a.qiComposite ?? 0) + (a.qiBuyingDecision?.decisionScore ?? 0) * 0.055;
      const scoreB = (b.qiComposite ?? 0) + (b.qiBuyingDecision?.decisionScore ?? 0) * 0.055;
      return scoreB - scoreA;
    })
    .map((product, index) => ({ ...product, qiRank: index }));
}

function buildDecision(
  product: QuantProduct,
  products: QuantProduct[],
  query: string,
  canonicalQuery?: CanonicalQueryContract
): BuyingDecisionSignal {
  const prices = products.map((p) => p.price).filter((n) => n > 0);
  const med = median(prices);
  const avg = average(prices);
  const regionalProducts = products.filter((p) => localFit(p, canonicalQuery));
  const regionalBaseline = median(regionalProducts.map((p) => p.price)) || med;
  const quality = product.qiCommerceQuality;
  const trust = quality?.merchantTrustConfidence ?? Math.round(getStoreTrustScore(product.store));
  const value = quality?.valueScore ?? 50;
  const deal = quality?.dealStrength ?? 50;
  const fakeRisk = quality?.fakeDiscountRisk ?? "low";
  const volatility = quality?.volatilitySignals.volatility01 ?? 0.35;
  const priceVsMedian = quality?.volatilitySignals.priceVsMedian ?? (med > 0 && product.price > 0 ? product.price / med : 1);
  const pq = priceQuality(priceVsMedian, fakeRisk);
  const marketplaceRisk = getMarketplaceSellerRiskTier(product.store, product.title);
  const listingRisk = product.qiListingIdentity?.listingRisk01 ?? 0.28;
  const completeness =
    100 -
    Math.round(
      ((product.title ? 0 : 0.28) +
        (product.image ? 0 : 0.22) +
        (product.price > 0 ? 0 : 0.22) +
        (product.shipping ? 0 : 0.12) +
        (product.availability ? 0 : 0.1)) *
        100
    );
  const sellerTrustworthy = trust >= 66 && marketplaceRisk !== "high" && fakeRisk !== "high";
  const fulfillmentConfidence = clamp(44 + trust * 0.35 + (product.shipping ? 12 : 0) + (product.availability ? 8 : 0) - listingRisk * 22, 0, 100);
  const seasonal = seasonalPattern(query, canonicalQuery);
  const discountConfidence = clamp(deal * 0.54 + (fakeRisk === "low" ? 24 : fakeRisk === "medium" ? 8 : -12) + (sellerTrustworthy ? 10 : 0), 0, 100);
  const trustedPrices = products.filter((p) => (p.qiCommerceQuality?.merchantTrustConfidence ?? getStoreTrustScore(p.store)) >= 66 && p.price > 0);
  const cheapestTrustedPrice = Math.min(...trustedPrices.map((p) => p.price), Number.POSITIVE_INFINITY);
  const bestValue = value >= Math.max(...products.map((p) => p.qiCommerceQuality?.valueScore ?? 0)) - 2;
  const cheapestTrusted = product.price > 0 && product.price <= cheapestTrustedPrice * 1.015 && sellerTrustworthy;
  const premiumSafest = trust >= 82 && pq === "premium" && marketplaceRisk === "low";
  const bestDiscount = deal >= Math.max(...products.map((p) => p.qiCommerceQuality?.dealStrength ?? 0)) - 2;
  const mostStablePrice = volatility <= 0.34 && fakeRisk === "low";
  const lowRiskPurchase = sellerTrustworthy && listingRisk < 0.38 && fakeRisk === "low";
  const localRows = regionalProducts.filter((p) => (p.qiCommerceQuality?.valueScore ?? 0) >= value + 6 && (p.qiCommerceQuality?.fakeDiscountRisk ?? "low") === "low");
  const betterRegionalOfferLikely = !localFit(product, canonicalQuery) && localRows.length > 0 && (canonicalQuery?.market.localPreference01 ?? 0) >= 0.58;
  const localBest = localFit(product, canonicalQuery) && value >= Math.max(...regionalProducts.map((p) => p.qiCommerceQuality?.valueScore ?? 0), 0) - 2;
  const action = chooseAction({
    value,
    deal,
    trust,
    fakeRisk,
    volatility,
    priceQuality: pq,
    marketplaceRisk,
    cheapestTrusted,
    bestValue,
    localBest,
    likelyMove: quality?.volatilitySignals.likelyPriceMove ?? "uncertain",
  });
  const scamRisk: "low" | "medium" | "high" =
    marketplaceRisk === "high" || fakeRisk === "high" || listingRisk >= 0.76
      ? "high"
      : marketplaceRisk === "medium" || fakeRisk === "medium" || listingRisk >= 0.52
        ? "medium"
        : "low";
  const decisionScore = Math.round(
    clamp(
      value * 0.28 +
        deal * 0.18 +
        trust * 0.18 +
        discountConfidence * 0.1 +
        fulfillmentConfidence * 0.1 +
        completeness * 0.08 +
        (cheapestTrusted ? 8 : 0) +
        (bestValue ? 6 : 0) -
        (betterRegionalOfferLikely ? 8 : 0) -
        (scamRisk === "high" ? 24 : scamRisk === "medium" ? 8 : 0),
      0,
      100
    )
  );
  const reasons = [
    `${pq} price vs market baseline`,
    `${Math.round(discountConfidence)}/100 discount confidence`,
    `${Math.round(fulfillmentConfidence)}/100 fulfillment confidence`,
  ];
  if (cheapestTrusted) reasons.push("cheapest trusted offer in tray");
  if (bestValue) reasons.push("strongest value score in tray");
  if (betterRegionalOfferLikely) reasons.push("better regional offer may exist in this tray");
  if (scamRisk !== "low") reasons.push(`${scamRisk} seller/listing risk`);
  const analystLine =
    action === "BUY_NOW" || action === "SAFE_TRUSTED_OFFER" || action === "BEST_REGIONAL_DEAL"
      ? `${actionLabel(action)}: value, seller trust, and price position are aligned.`
      : action === "WAIT_FOR_DROP" || action === "DISCOUNT_LIKELY_SOON"
        ? `${actionLabel(action)}: volatility and price position suggest patience may improve the offer.`
        : action === "RISKY_SELLER"
          ? "Risky seller: marketplace or listing signals need extra verification before purchase."
          : `${actionLabel(action)}: compare against safer or better-priced alternatives before buying.`;
  return {
    version: 1,
    action,
    confidence: Math.round(clamp(38 + decisionScore * 0.48 + (products.length >= 12 ? 10 : 0) + (sellerTrustworthy ? 8 : 0), 0, 100)),
    decisionScore,
    decisionLabel: actionLabel(action),
    analystLine,
    primaryReasons: reasons.slice(0, 5),
    priceIntelligence: {
      marketAverageEstimate: Math.round(avg || med),
      regionalBaselineEstimate: Math.round(regionalBaseline || med),
      priceQuality: pq,
      discountConfidence: Math.round(discountConfidence),
      volatilityScore: Math.round(volatility * 100),
      seasonalDiscountPattern: seasonal,
      pricingAnomaly:
        fakeRisk === "high"
          ? "fake_markdown_risk"
          : pq === "underpriced" && (priceVsMedian < 0.45 || !sellerTrustworthy)
            ? "underpriced_anomaly"
            : pq === "overpriced"
              ? "overpriced"
              : "none",
    },
    trustIntelligence: {
      sellerTrustworthy,
      merchantReputationScore: trust,
      fulfillmentConfidence: Math.round(fulfillmentConfidence),
      listingCompleteness: Math.round(clamp(completeness, 0, 100)),
      suspiciousMarketplaceBehavior: marketplaceRisk !== "low" && (fakeRisk !== "low" || listingRisk >= 0.42),
      scamRisk,
    },
    comparisonFlags: {
      bestValue,
      cheapestTrusted,
      premiumSafest,
      bestDiscount,
      mostStablePrice,
      lowRiskPurchase,
      betterRegionalOfferLikely,
    },
  };
}

export function buildBuyingDecisionDebug(products: QuantProduct[]): Record<string, unknown> {
  const decisions = products.map((p) => p.qiBuyingDecision).filter(Boolean) as BuyingDecisionSignal[];
  const counts = decisions.reduce<Record<string, number>>((acc, decision) => {
    acc[decision.action] = (acc[decision.action] ?? 0) + 1;
    return acc;
  }, {});
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((sum, n) => sum + n, 0) / xs.length) : 0);
  return {
    decisionActionCounts: counts,
    averageDecisionScore: avg(decisions.map((d) => d.decisionScore)),
    averageDecisionConfidence: avg(decisions.map((d) => d.confidence)),
    bestValueCount: decisions.filter((d) => d.comparisonFlags.bestValue).length,
    cheapestTrustedCount: decisions.filter((d) => d.comparisonFlags.cheapestTrusted).length,
    riskySellerCount: decisions.filter((d) => d.action === "RISKY_SELLER" || d.trustIntelligence.scamRisk !== "low").length,
    topDecisions: products.slice(0, 12).map((product) => ({
      title: product.title.slice(0, 110),
      store: product.store,
      action: product.qiBuyingDecision?.action,
      decisionScore: product.qiBuyingDecision?.decisionScore,
      confidence: product.qiBuyingDecision?.confidence,
      reasons: product.qiBuyingDecision?.primaryReasons,
    })),
  };
}
