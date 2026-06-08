/**
 * Phase 33 — Commerce Intelligence Authority Engine.
 * Market opportunity, value, merchant trust, and explainable commerce reasoning.
 */

import { getStoreTrustScore, ratingValue, type QuantProduct } from "@/lib/shoppingScore";
import type { IntentProfile } from "@/lib/intelligence/intentUnderstandingEngine";
import { intentRankingBoost } from "@/lib/intelligence/intentUnderstandingEngine";
import { getCategoryProfile, resolveCategoryProfileKey } from "@/lib/intelligence/categoryProfileRegistry";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";
import type { ProductIntelligenceSegment } from "@/lib/ui/universalProductIntelligenceEngine";

export type CommerceIntelligenceAuthority = {
  version: 1;
  marketOpportunityScore: number;
  marketValueScore: number;
  merchantTrustScore: number;
  marketAveragePrice: number;
  priceAdvantage: number;
  dealStrength: number;
  dealRarity: number;
  valueDelta: number;
  availabilityScore: number;
  competitorPressure: number;
  offerUniqueness: number;
  intentAlignment: number;
  commerceReasoning: {
    whyWon: string;
    whyLost: string;
    competitorEdge: string;
    improvementPath: string;
  };
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function clip(text: string, max = 160): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function median(nums: number[]): number {
  const s = nums.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function percentile(value: number, prices: number[]): number {
  const clean = prices.filter((n) => n > 0).sort((a, b) => a - b);
  if (!clean.length || value <= 0) return 50;
  const below = clean.filter((n) => n <= value).length;
  return Math.round((below / clean.length) * 100);
}

function discount01(product: QuantProduct): number {
  if (product.oldPrice == null || product.oldPrice <= product.price || product.price <= 0) return 0;
  return clamp((product.oldPrice - product.price) / product.oldPrice, 0, 0.85);
}

function availabilityScore(product: QuantProduct): number {
  const avail = (product.availability ?? "").toLowerCase();
  if (/in stock|available|op voorraad/i.test(avail)) return 88;
  if (/limited|few left|laatste/i.test(avail)) return 62;
  if (/out of stock|unavailable|niet op voorraad/i.test(avail)) return 18;
  return product.price > 0 ? 72 : 40;
}

function computeMerchantTrustScore(product: QuantProduct): number {
  const storeTrust = getStoreTrustScore(product.store);
  const merchantConfidence = Math.round((product.qiMerchantConfidence01 ?? 0.58) * 100);
  const quality = product.qiCommerceQuality?.merchantTrustConfidence ?? merchantConfidence;
  const rating = ratingValue(product.rating);
  const reviews = product.reviewsCount ?? 0;
  const shipping = /free|express|next day|same day/i.test(product.shipping ?? "") ? 8 : 0;
  const returns = /free return|30 day|60 day|easy return/i.test(
    `${product.shipping ?? ""} ${(product.extensions ?? []).join(" ")}`
  )
    ? 6
    : 0;
  const warranty = /warranty|guarantee|2 year|3 year|5 year/i.test(
    `${product.title} ${(product.extensions ?? []).join(" ")}`
  )
    ? 5
    : 0;
  const reviewBoost = reviews > 100 ? 6 : reviews > 20 ? 3 : 0;
  const ratingBoost = rating >= 4.5 ? 8 : rating >= 4 ? 4 : rating > 0 && rating < 3.5 ? -8 : 0;

  return clamp(
    Math.round(
      storeTrust * 0.38 +
        quality * 0.28 +
        merchantConfidence * 0.18 +
        shipping +
        returns +
        warranty +
        reviewBoost +
        ratingBoost +
        6
    ),
    0,
    100
  );
}

function computeMarketValue(product: QuantProduct, tray: QuantProduct[]) {
  const prices = tray.map((p) => p.price).filter((n) => n > 0);
  const marketAveragePrice = median(prices);
  const pct = percentile(product.price, prices);
  const priceAdvantage =
    marketAveragePrice > 0 && product.price > 0
      ? clamp((marketAveragePrice - product.price) / marketAveragePrice, -0.55, 0.65)
      : 0;

  const existingDeal = product.qiCommerceQuality?.dealStrength;
  const dealStrength =
    existingDeal ??
    clamp(
      Math.round(
        42 +
          discount01(product) * 42 +
          Math.max(0, priceAdvantage) * 34 +
          (pct <= 20 ? 12 : pct <= 35 ? 6 : 0)
      ),
      0,
      100
    );

  const dealRarity = clamp(Math.round(100 - pct + dealStrength * 0.22), 0, 100);
  const valueDelta = Math.round(priceAdvantage * 100);

  const existingValue = product.qiCommerceQuality?.valueScore;
  const marketValueScore =
    existingValue ??
    clamp(
      Math.round(
        46 +
          Math.max(0, priceAdvantage) * 38 +
          dealStrength * 0.12 +
          (pct <= 25 ? 10 : 0) -
          (pct >= 85 ? 14 : pct >= 70 ? 6 : 0)
      ),
      0,
      100
    );

  return { marketAveragePrice, priceAdvantage, dealStrength, dealRarity, valueDelta, marketValueScore, pricePercentile: pct };
}

function computeCompetitorPressure(
  product: QuantProduct,
  tray: QuantProduct[],
  intelligence: UniversalProductIntelligenceSnapshot
): number {
  const peers = tray.filter((p) => p.link !== product.link && p.price > 0);
  if (!peers.length) return intelligence.alternativePressure;

  const cheaperBetter = peers.filter(
    (p) =>
      p.price <= product.price * 0.95 &&
      ratingValue(p.rating) >= ratingValue(product.rating) - 0.2
  ).length;

  const pressure = intelligence.alternativePressure * 0.55 + (cheaperBetter / peers.length) * 45;
  return clamp(Math.round(pressure), 0, 100);
}

function computeOfferUniqueness(product: QuantProduct, tray: QuantProduct[]): number {
  const titleTokens = new Set(product.title.toLowerCase().split(/\W+/).filter((t) => t.length > 3));
  let overlapSum = 0;
  let count = 0;

  for (const peer of tray) {
    if (peer.link === product.link) continue;
    const peerTokens = peer.title.toLowerCase().split(/\W+/).filter((t) => t.length > 3);
    const overlap = peerTokens.filter((t) => titleTokens.has(t)).length;
    overlapSum += overlap / Math.max(1, peerTokens.length);
    count += 1;
  }

  const avgOverlap = count ? overlapSum / count : 0;
  return clamp(Math.round(100 - avgOverlap * 85), 12, 96);
}

function computeIntentAlignment(
  profile: IntentProfile,
  product: QuantProduct,
  segment: ProductIntelligenceSegment | null,
  searchQuery: string
): number {
  const boost = intentRankingBoost(profile, product, segment, searchQuery);
  return clamp(Math.round(52 + boost * 2.2), 0, 100);
}

export function computeMarketOpportunityScore(args: {
  intelligence: UniversalProductIntelligenceSnapshot;
  marketValueScore: number;
  merchantTrustScore: number;
  availabilityScore: number;
  competitorPressure: number;
  offerUniqueness: number;
  intentAlignment: number;
  priceAdvantage: number;
}): number {
  const {
    intelligence,
    marketValueScore,
    merchantTrustScore,
    availabilityScore,
    competitorPressure,
    offerUniqueness,
    intentAlignment,
    priceAdvantage,
  } = args;

  const categoryQuality = intelligence.productQualityScore * 0.22 + intelligence.categoryFitScore * 0.14;
  const priceCompetitiveness = marketValueScore * 0.2 + Math.max(0, priceAdvantage) * 40;
  const marketOpportunity = offerUniqueness * 0.1 + availabilityScore * 0.08;
  const relativeValue = intelligence.valueScore * 0.12 + marketValueScore * 0.08;
  const trustPlane = merchantTrustScore * 0.1 + intelligence.trustScore * 0.06;
  const intentPlane = intentAlignment * 0.06;
  const pressurePenalty = competitorPressure * 0.14;

  return clamp(
    Math.round(
      categoryQuality +
        priceCompetitiveness +
        marketOpportunity +
        relativeValue +
        trustPlane +
        intentPlane -
        pressurePenalty +
        8
    ),
    0,
    100
  );
}

function buildCommerceReasoning(args: {
  verdict: PrimaryVerdict;
  intelligence: UniversalProductIntelligenceSnapshot;
  authority: Omit<CommerceIntelligenceAuthority, "commerceReasoning">;
  profileKey: ReturnType<typeof resolveCategoryProfileKey>;
  store: string;
  pricePercentile: number;
}): CommerceIntelligenceAuthority["commerceReasoning"] {
  const { verdict, intelligence, authority, profileKey, store, pricePercentile } = args;
  const profile = getCategoryProfile(profileKey);
  const focus = profile.reasoningFocus.slice(0, 2).join(" and ");
  const priceLine =
    authority.priceAdvantage > 0.05
      ? `${Math.round(authority.priceAdvantage * 100)}% below tray market average`
      : authority.priceAdvantage < -0.08
        ? "priced above current tray average"
        : "priced near tray market average";
  const dealLine =
    authority.dealRarity >= 78
      ? "among the strongest offers in this tray"
      : authority.dealStrength >= 68
        ? "carries solid deal strength"
        : "offer strength is moderate";

  const whyWon =
    verdict === "BUY READY"
      ? clip(
          `Leads on ${focus}; ${priceLine}; merchant trust holds at ${store}; ${dealLine}.`,
          160
        )
      : verdict === "COMPARE"
        ? clip(
            `Strong ${focus} but rival listings undercut on price position (${priceLine}).`,
            160
          )
        : verdict === "WAIT"
          ? clip(
              `Category fit is acceptable, but market opportunity is weak — ${priceLine} with elevated rival pressure.`,
              160
            )
          : clip(
              `Poor opportunity: weak ${focus}, low merchant trust, and unfavorable ${priceLine}.`,
              160
            );

  const whyLost =
    verdict === "BUY READY"
      ? clip(`No material loss — current tray leader on opportunity and ${focus}.`, 160)
      : clip(
          `Lost ground on market opportunity (${authority.marketOpportunityScore}/100) and ${priceLine}; ${focus} not tray-leading.`,
          160
        );

  const competitorEdge = clip(
    authority.competitorPressure >= 60
      ? `Competitors beat this on price percentile (~${pricePercentile}th) or parallel spec at lower cost.`
      : `Limited rival pressure — differentiation comes from ${focus} and merchant trust.`,
    160
  );

  const improvementPath =
    verdict === "AVOID" || verdict === "WAIT"
      ? clip(
          `Improve verdict by closing price gap, raising merchant trust, or strengthening ${focus}.`,
          160
        )
      : verdict === "COMPARE"
        ? clip(`Needs sharper pricing or stronger ${focus} to reach BUY READY.`, 160)
        : clip(`Maintain price position and ${focus} lead to hold BUY READY.`, 160);

  return { whyWon, whyLost, competitorEdge, improvementPath };
}

export function buildCommerceIntelligenceAuthority(args: {
  product: QuantProduct;
  tray: QuantProduct[];
  searchQuery: string;
  intentProfile: IntentProfile;
  intelligence: UniversalProductIntelligenceSnapshot;
  verdict: PrimaryVerdict;
  store: string;
}): CommerceIntelligenceAuthority {
  const { product, tray, searchQuery, intentProfile, intelligence, verdict, store } = args;
  const segment = intelligence.segment;
  const profileKey = resolveCategoryProfileKey(segment, product.title, searchQuery);

  const merchantTrustScore = computeMerchantTrustScore(product);
  const avail = availabilityScore(product);
  const market = computeMarketValue(product, tray);
  const competitorPressure = computeCompetitorPressure(product, tray, intelligence);
  const offerUniqueness = computeOfferUniqueness(product, tray);
  const intentAlignment = computeIntentAlignment(intentProfile, product, segment, searchQuery);

  const marketOpportunityScore = computeMarketOpportunityScore({
    intelligence,
    marketValueScore: market.marketValueScore,
    merchantTrustScore,
    availabilityScore: avail,
    competitorPressure,
    offerUniqueness,
    intentAlignment,
    priceAdvantage: market.priceAdvantage,
  });

  const base = {
    version: 1 as const,
    marketOpportunityScore,
    marketValueScore: market.marketValueScore,
    merchantTrustScore,
    marketAveragePrice: Math.round(market.marketAveragePrice),
    priceAdvantage: Math.round(market.priceAdvantage * 1000) / 1000,
    dealStrength: market.dealStrength,
    dealRarity: market.dealRarity,
    valueDelta: market.valueDelta,
    availabilityScore: avail,
    competitorPressure,
    offerUniqueness,
    intentAlignment,
  };

  return {
    ...base,
    commerceReasoning: buildCommerceReasoning({
      verdict,
      intelligence,
      authority: base,
      profileKey,
      store,
      pricePercentile: market.pricePercentile,
    }),
  };
}

/** Commerce-aware tray rank score — blends category quality with market opportunity. */
export function commerceTrayRankScore(
  intelligence: UniversalProductIntelligenceSnapshot,
  authority: CommerceIntelligenceAuthority | undefined,
  dimensionLead: number
): number {
  if (!authority) {
    return (
      dimensionLead * 0.34 +
      intelligence.productQualityScore * 0.24 +
      intelligence.categoryFitScore * 0.2 +
      intelligence.valueScore * 0.16 -
      intelligence.alternativePressure * 0.12
    );
  }

  return (
    authority.marketOpportunityScore * 0.38 +
    dimensionLead * 0.18 +
    intelligence.productQualityScore * 0.14 +
    authority.marketValueScore * 0.12 +
    authority.merchantTrustScore * 0.1 +
    authority.intentAlignment * 0.08 -
    authority.competitorPressure * 0.1
  );
}

export function commerceReasoningReferencesMarket(text: string): boolean {
  const blob = text.toLowerCase();
  return (
    /\b(market|price|merchant|trust|rival|competitor|opportunity|deal|tray)\b/.test(blob) &&
    /\b(below|above|strong|weak|lead|pressure|trust)\b/.test(blob)
  );
}
