/**
 * P6.3 — Adaptive strategic ranking + continuity preservation.
 */

import type { StrategicRankingBalanceResult, StrategicRankingBlendInfluence } from "@/lib/strategicRanking/strategicRankingBalancer";
import type { AdaptiveStrategicRankingProfile } from "@/lib/strategicRanking/strategicRankingProfiles";
import type { StrategicRankingSignalBundle } from "@/lib/strategicRanking/strategicRankingConfidence";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyStrategicRankingStabilization(args: {
  products: QuantProduct[];
  influence: StrategicRankingBlendInfluence;
  balance: StrategicRankingBalanceResult;
  signals: StrategicRankingSignalBundle;
  profile: AdaptiveStrategicRankingProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.trustInfluence * (getStoreTrustScore(p.store) / 100);
    score += influence.valueInfluence * ((p.qiComposite ?? 50) / 100) * 0.08;
    score += influence.conversionInfluence * 0.09;
    score += influence.stabilityInfluence * 0.18;
    score += influence.continuityStrength * 0.28;
    score += influence.affordabilityInfluence * 0.05;
    score += influence.practicalityInfluence * 0.04;

    if (balance.routingLane === "compare") score += influence.premiumInfluence * 0.06;
    if (balance.routingLane === "reinforce" || balance.routingLane === "ranking-safe") {
      score += influence.trustInfluence * 0.05 + influence.conversionInfluence * 0.04;
    }
    if (balance.routingLane === "strategic-balance") {
      score += (influence.trustInfluence + influence.valueInfluence) * 0.06;
    }
    if (balance.routingLane === "trust-check") score -= signals.trustDominanceGuardActive * 0.06;
    if (index === 0) score += influence.continuityStrength * 0.03;

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

export function computeStrategicRankingReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: StrategicRankingSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.rankingContinuity >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
