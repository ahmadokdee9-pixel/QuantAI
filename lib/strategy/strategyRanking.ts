/**
 * P5.7 — Strategic ranking synthesis.
 */

import type { StrategyBalanceResult, StrategyBlendInfluence } from "@/lib/strategy/strategyBalancer";
import type { StrategyProfile } from "@/lib/strategy/strategyProfiles";
import type { StrategySignalBundle } from "@/lib/strategy/strategySignals";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyStrategyStabilizationRanking(args: {
  products: QuantProduct[];
  influence: StrategyBlendInfluence;
  balance: StrategyBalanceResult;
  signals: StrategySignalBundle;
  profile: StrategyProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.strategicTrust * (getStoreTrustScore(p.store) / 100);
    score += influence.strategicValue * 0.35;
    score += influence.continuityStrength * 0.25;
    score += influence.merchantStrength * 0.1;

    if (balance.routingLane === "compare") score += influence.comparisonIntelligence * 0.15;
    if (balance.routingLane === "reinforce" || balance.routingLane === "category-priority") {
      score += influence.recommendationHierarchy * 0.12;
    }
    if (balance.routingLane === "strategic-balance") {
      score += (influence.strategicTrust + influence.strategicValue) * 0.08;
    }
    if (balance.routingLane === "commerce-safe") score += signals.commerceStability * 0.06;
    if (index === 0) score += influence.premiumPositioning * 0.04 + influence.categoryDominance * 0.04;

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

export function computeStrategyReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: StrategySignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.commerceStability >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
