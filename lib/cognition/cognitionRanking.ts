/**
 * P6.0 — Unified cognition ranking (continuity-preserving).
 */

import type { CognitionBalanceResult, CognitionBlendInfluence } from "@/lib/cognition/cognitionBalancer";
import type { CognitionProfile } from "@/lib/cognition/cognitionProfiles";
import type { UnifiedCommerceState } from "@/lib/cognition/cognitionFusion";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyCognitionStabilizationRanking(args: {
  products: QuantProduct[];
  influence: CognitionBlendInfluence;
  balance: CognitionBalanceResult;
  state: UnifiedCommerceState;
  profile: CognitionProfile;
}): QuantProduct[] {
  const { products, influence, balance, state, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.conversionInfluence * (getStoreTrustScore(p.store) / 100);
    score += influence.trustValueInfluence * 0.12;
    score += influence.continuityStrength * 0.25;
    score += influence.behavioralInfluence * 0.08;

    if (balance.routingLane === "compare") score += influence.strategyInfluence * 0.1;
    if (balance.routingLane === "reinforce" || balance.routingLane === "cognition-safe") {
      score += influence.reasoningInfluence * 0.08 + influence.strategyInfluence * 0.06;
    }
    if (balance.routingLane === "strategic-balance") {
      score += (influence.trustValueInfluence + influence.strategyInfluence) * 0.07;
    }
    if (balance.routingLane === "behavior-check") score -= influence.behavioralInfluence * 0.04;
    if (index === 0) score += state.conversionProbability * 0.04;

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

export function computeCognitionReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  state: UnifiedCommerceState;
}): number {
  const { preLinks, postLinks, state } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = state.conversionProbability >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
