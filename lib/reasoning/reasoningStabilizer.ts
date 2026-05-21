/**
 * P5.5 — Reasoning stabilizer (bounded ranking synthesis).
 */

import type { ReasoningBalanceResult, ReasoningBlendInfluence } from "@/lib/reasoning/reasoningBalancer";
import type { ReasoningProfile } from "@/lib/reasoning/reasoningProfiles";
import type { ReasoningSignalBundle } from "@/lib/reasoning/reasoningSignals";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyReasoningStabilizationRanking(args: {
  products: QuantProduct[];
  influence: ReasoningBlendInfluence;
  balance: ReasoningBalanceResult;
  signals: ReasoningSignalBundle;
  profile: ReasoningProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.trustReasoning * (getStoreTrustScore(p.store) / 100);
    score += influence.valueReasoning * 0.35;
    score += influence.qualityReasoning * ((typeof p.rating === "number" ? p.rating : 4) / 5);
    score += influence.continuityStrength * 0.25;
    score -= influence.comparisonReasoning * 0.05;

    if (balance.routingLane === "compare") score += influence.comparisonReasoning * 0.15;
    if (balance.routingLane === "reinforce") score += influence.recommendationReasoning * 0.12;
    if (balance.routingLane === "reasoning-balance") {
      score += (influence.trustReasoning + influence.valueReasoning) * 0.08;
    }
    if (balance.routingLane === "recover") score += signals.suppressionRecovery * 0.06;
    if (index === 0) score += influence.qualityReasoning * 0.05;

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

export function computeReasoningReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: ReasoningSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const confidenceOk = signals.reasoningConfidence >= 0.35 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + confidenceOk));
}
