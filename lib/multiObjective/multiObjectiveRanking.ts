/**
 * P6.2 — Multi-objective ranking + continuity preservation.
 */

import type { MultiObjectiveBalanceResult, MultiObjectiveBlendInfluence } from "@/lib/multiObjective/multiObjectiveBalancer";
import type { MultiObjectiveCommerceProfile } from "@/lib/multiObjective/multiObjectiveProfiles";
import type { MultiObjectiveSignalBundle } from "@/lib/multiObjective/multiObjectiveConfidence";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyMultiObjectiveStabilizationRanking(args: {
  products: QuantProduct[];
  influence: MultiObjectiveBlendInfluence;
  balance: MultiObjectiveBalanceResult;
  signals: MultiObjectiveSignalBundle;
  profile: MultiObjectiveCommerceProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.qualityInfluence * ((p.qiComposite ?? 50) / 100);
    score += influence.trustInfluence * (getStoreTrustScore(p.store) / 100);
    score += influence.priceInfluence * 0.08;
    score += influence.valueInfluence * 0.06;
    score += influence.conversionInfluence * 0.1;
    score += influence.stabilityInfluence * 0.2;
    score += influence.continuityStrength * 0.25;
    score += influence.aestheticInfluence * 0.04;

    if (balance.routingLane === "compare") score += influence.intentInfluence * 0.08;
    if (balance.routingLane === "reinforce" || balance.routingLane === "objective-safe") {
      score += influence.qualityInfluence * 0.06 + influence.conversionInfluence * 0.05;
    }
    if (balance.routingLane === "strategic-balance") {
      score += (influence.priceInfluence + influence.valueInfluence) * 0.07;
    }
    if (index === 0) score += influence.conversionInfluence * 0.04;

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

export function computeMultiObjectiveReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: MultiObjectiveSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.objectiveContinuity >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
