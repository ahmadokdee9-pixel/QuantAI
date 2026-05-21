/**
 * P5.8 — Volatility-aware market ranking stabilization.
 */

import type { MarketBalanceResult, MarketBlendInfluence } from "@/lib/market/marketBalancer";
import type { MarketProfile } from "@/lib/market/marketProfiles";
import type { MarketSignalBundle } from "@/lib/market/marketSignals";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyMarketStabilizationRanking(args: {
  products: QuantProduct[];
  influence: MarketBlendInfluence;
  balance: MarketBalanceResult;
  signals: MarketSignalBundle;
  profile: MarketProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.marketTrust * (getStoreTrustScore(p.store) / 100);
    score += influence.marketPressure * 0.3;
    score += influence.continuityStrength * 0.25;
    score += (1 - influence.marketVolatility) * 0.08;

    if (balance.routingLane === "compare") score += signals.premiumVsValue * 0.1;
    if (balance.routingLane === "reinforce" || balance.routingLane === "category-priority") {
      score += influence.marketLifecycle * 0.12;
    }
    if (balance.routingLane === "strategic-balance") score += (influence.marketTrust + influence.marketMomentum) * 0.08;
    if (balance.routingLane === "volatility-check") score -= influence.volatilityAmplification * 0.05;
    if (balance.routingLane === "trust-check") score += influence.trustAmplification * 0.06;
    if (index === 0) score += influence.marketMomentum * 0.04 + influence.marketLifecycle * 0.04;

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

export function computeMarketReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: MarketSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.pricingRealism >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
