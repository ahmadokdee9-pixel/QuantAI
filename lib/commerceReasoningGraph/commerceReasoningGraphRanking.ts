/**
 * P6.7 — Commerce reasoning graph ranking + replay integrity.
 */

import type { CommerceReasoningGraphBalanceResult, CommerceReasoningGraphBlendInfluence } from "@/lib/commerceReasoningGraph/commerceReasoningGraphBalancer";
import type { AutonomousCommerceReasoningGraphProfile } from "@/lib/commerceReasoningGraph/commerceReasoningGraphProfiles";
import type { CommerceReasoningGraphSignalBundle } from "@/lib/commerceReasoningGraph/commerceReasoningGraphConfidence";
import type { QuantProduct } from "@/lib/shoppingScore";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyCommerceReasoningGraphStabilizationRanking(args: {
  products: QuantProduct[];
  influence: CommerceReasoningGraphBlendInfluence;
  balance: CommerceReasoningGraphBalanceResult;
  signals: CommerceReasoningGraphSignalBundle;
  profile: AutonomousCommerceReasoningGraphProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.pathInfluence * 0.25;
    score += influence.causalInfluence * (p.qiComposite ?? 50) * 0.004;
    score += influence.graphReinforcement * 0.15;
    score += influence.continuityStabilization * 0.08;
    score += influence.causalityStabilization * 0.06;
    score -= influence.circularDampening * 0.04;
    score -= influence.driftDampening * 0.03;

    if (balance.routingLane === "graph-safe" || balance.routingLane === "reinforce") {
      score += influence.pathInfluence * 0.06;
    }
    if (balance.routingLane === "circular-check" || balance.routingLane === "drift-check") {
      score -= signals.circularReasoningInfluenceScore * 0.03;
    }
    if (index === 0) score += influence.graphReinforcement * 0.03;

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

export function computeCommerceReasoningGraphReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: CommerceReasoningGraphSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.graphExecutionIntegrity >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
