/**
 * P5.6 — Decision stabilizer + ranking synthesis.
 */

import type { DecisionBalanceResult, DecisionBlendInfluence } from "@/lib/decision/decisionBalancer";
import type { DecisionProfile } from "@/lib/decision/decisionProfiles";
import type { DecisionSignalBundle } from "@/lib/decision/decisionSignals";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyDecisionStabilizationRanking(args: {
  products: QuantProduct[];
  influence: DecisionBlendInfluence;
  balance: DecisionBalanceResult;
  signals: DecisionSignalBundle;
  profile: DecisionProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.trustDecision * (getStoreTrustScore(p.store) / 100);
    score += influence.valueDecision * 0.35;
    score += influence.qualityDecision * ((typeof p.rating === "number" ? p.rating : 4) / 5);
    score += influence.continuityStrength * 0.25;
    score -= signals.returnRiskScore * 0.08;

    if (balance.routingLane === "compare") score += influence.comparisonDecision * 0.15;
    if (balance.routingLane === "reinforce") score += influence.merchantDecision * 0.1;
    if (balance.routingLane === "decision-balance") {
      score += (influence.trustDecision + influence.valueDecision) * 0.08;
    }
    if (balance.routingLane === "commerce-safe") score += influence.deliveryDecision * 0.06;
    if (index === 0) score += influence.qualityDecision * 0.06;

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

export function computeDecisionReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: DecisionSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.stabilityScore >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
