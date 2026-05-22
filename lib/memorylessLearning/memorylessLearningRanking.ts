/**
 * P6.4 — Memoryless learning ranking + replay integrity.
 */

import type { MemorylessLearningBalanceResult, MemorylessLearningBlendInfluence } from "@/lib/memorylessLearning/memorylessLearningBalancer";
import type { MemorylessCommerceLearningProfile } from "@/lib/memorylessLearning/memorylessLearningProfiles";
import type { MemorylessLearningSignalBundle } from "@/lib/memorylessLearning/memorylessLearningConfidence";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyMemorylessLearningStabilizationRanking(args: {
  products: QuantProduct[];
  influence: MemorylessLearningBlendInfluence;
  balance: MemorylessLearningBalanceResult;
  signals: MemorylessLearningSignalBundle;
  profile: MemorylessCommerceLearningProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.continuityInfluence * 0.25;
    score += influence.stabilizationInfluence * 0.2;
    score += influence.integrityReinforcement * 0.15;
    score += influence.trustStabilization * (getStoreTrustScore(p.store) / 100) * 0.08;
    score += influence.conversionStabilization * 0.06;
    score -= influence.driftDampening * 0.04;
    score -= influence.fatigueDampening * 0.03;

    if (balance.routingLane === "continuity-safe" || balance.routingLane === "reinforce") {
      score += influence.continuityInfluence * 0.06;
    }
    if (balance.routingLane === "drift-check" || balance.routingLane === "fatigue-check") {
      score -= signals.rankingDriftScore * 0.03;
    }
    if (index === 0) score += influence.continuityInfluence * 0.03;

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

export function computeMemorylessLearningReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: MemorylessLearningSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.rankingStabilityScore >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
