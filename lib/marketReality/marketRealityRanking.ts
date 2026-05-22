/**
 * P6.5 — Market reality ranking + replay integrity.
 */

import type { MarketRealityBalanceResult, MarketRealityBlendInfluence } from "@/lib/marketReality/marketRealityBalancer";
import type { MarketRealityIntelligenceProfile } from "@/lib/marketReality/marketRealityProfiles";
import type { MarketRealitySignalBundle } from "@/lib/marketReality/marketRealityConfidence";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyMarketRealityStabilizationRanking(args: {
  products: QuantProduct[];
  influence: MarketRealityBlendInfluence;
  balance: MarketRealityBalanceResult;
  signals: MarketRealitySignalBundle;
  profile: MarketRealityIntelligenceProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    const rt = p.qiRealityTrust;
    const storeTrust = getStoreTrustScore(p.store) / 100;

    score += influence.pricingInfluence * (1 - (rt?.fakeDiscountProbability ?? 0)) * 0.25;
    score += influence.merchantInfluence * (rt?.retailerReliability01 ?? storeTrust) * 0.22;
    score += influence.ecosystemReinforcement * 0.15;
    score += influence.trustStabilization * storeTrust * 0.08;
    score += influence.offerStabilization * (1 - (rt?.tooGoodToBeTrue01 ?? 0)) * 0.06;
    score -= influence.discountDampening * (rt?.discountManipulationRisk ?? 0) * 0.04;
    score -= influence.volatilityDampening * (rt?.stockVolatility01 ?? 0) * 0.03;

    if (balance.routingLane === "pricing-safe" || balance.routingLane === "reinforce") {
      score += influence.pricingInfluence * 0.06;
    }
    if (balance.routingLane === "discount-check" || balance.routingLane === "volatility-check") {
      score -= signals.fakeDiscountScore * 0.03;
    }
    if (rt?.weakRetailer) score -= influence.discountDampening * 0.02;
    if (index === 0) score += influence.pricingInfluence * 0.03;

    score = clamp(score, -profile.maxDelta * 5, products.length * 10 + profile.maxDelta);
    return { p, index, score: Math.round(score * 1000) / 1000 };
  });

  return scored
    .sort((a, b) => {
      const d = b.score - a.score;
      if (Math.abs(d) > 0.0001) return d;
      return a.index - b.index;
    })
    .map((x) => x.p);
}

export function computeMarketRealityReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: MarketRealitySignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.offerEcosystemStability >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
