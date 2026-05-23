/**
 * P6.8 — Cognitive governance ranking + replay integrity.
 */

import type { CognitiveGovernanceBalanceResult, CognitiveGovernanceBlendInfluence } from "@/lib/cognitiveGovernance/cognitiveGovernanceBalancer";
import type { CognitiveGovernanceSignalBundle } from "@/lib/cognitiveGovernance/cognitiveGovernanceConfidence";
import type { UnifiedCognitiveGovernanceProfile } from "@/lib/cognitiveGovernance/cognitiveGovernanceProfiles";
import type { QuantProduct } from "@/lib/shoppingScore";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyCognitiveGovernanceStabilizationRanking(args: {
  products: QuantProduct[];
  influence: CognitiveGovernanceBlendInfluence;
  balance: CognitiveGovernanceBalanceResult;
  signals: CognitiveGovernanceSignalBundle;
  profile: UnifiedCognitiveGovernanceProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.equilibriumInfluence * 0.25;
    score += influence.influenceStabilization * (p.qiComposite ?? 50) * 0.004;
    score += influence.governanceReinforcement * 0.15;
    score += influence.continuityReinforcement * 0.08;
    score += influence.causalityReinforcement * 0.06;
    score -= influence.recursiveSuppression * 0.04;
    score -= influence.driftSuppression * 0.03;

    if (balance.routingLane === "ranking-safe" || balance.routingLane === "reinforce") {
      score += influence.equilibriumInfluence * 0.06;
    }
    if (balance.routingLane === "governance-check" || balance.routingLane === "equilibrium-check") {
      score -= signals.influenceInstabilityScore * 0.03;
    }
    if (index === 0) score += influence.governanceReinforcement * 0.03;

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

export function computeCognitiveGovernanceReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: CognitiveGovernanceSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.systemReplayIntegrity >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
