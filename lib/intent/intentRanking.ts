/**
 * P6.1 — Intent cognition ranking + continuity preservation.
 */

import type { IntentBalanceResult, IntentBlendInfluence } from "@/lib/intent/intentBalancer";
import type { IntentCognitionProfile } from "@/lib/intent/intentProfiles";
import type { IntentSignalBundle } from "@/lib/intent/intentConfidence";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyIntentStabilizationRanking(args: {
  products: QuantProduct[];
  influence: IntentBlendInfluence;
  balance: IntentBalanceResult;
  signals: IntentSignalBundle;
  profile: IntentCognitionProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.readinessInfluence * (getStoreTrustScore(p.store) / 100);
    score += influence.trustInfluence * 0.1;
    score += influence.continuityStrength * 0.25;
    score += influence.valueInfluence * 0.06;
    score -= signals.hesitationIntent * 0.04;

    if (balance.routingLane === "compare") score += influence.comparisonInfluence * 0.1;
    if (balance.routingLane === "reinforce" || balance.routingLane === "intent-safe") {
      score += influence.recommendationInfluence * 0.1;
    }
    if (balance.routingLane === "strategic-balance") {
      score += (influence.premiumInfluence + influence.valueInfluence) * 0.07;
    }
    if (index === 0) score += influence.readinessInfluence * 0.04 + influence.aestheticInfluence * 0.03;

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

export function computeIntentReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: IntentSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.intentContinuity >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
