/**
 * P6.9 — Economic world simulation ranking + replay integrity.
 */

import type { EconomicWorldSimulationBalanceResult, EconomicWorldSimulationBlendInfluence } from "@/lib/economicWorldSimulation/economicWorldSimulationBalancer";
import type { EconomicWorldSimulationSignalBundle } from "@/lib/economicWorldSimulation/economicWorldSimulationConfidence";
import type { EconomicWorldSimulationProfile } from "@/lib/economicWorldSimulation/economicWorldSimulationProfiles";
import type { QuantProduct } from "@/lib/shoppingScore";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyEconomicWorldSimulationStabilizationRanking(args: {
  products: QuantProduct[];
  influence: EconomicWorldSimulationBlendInfluence;
  balance: EconomicWorldSimulationBalanceResult;
  signals: EconomicWorldSimulationSignalBundle;
  profile: EconomicWorldSimulationProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.pressureInfluence * 0.25;
    score += influence.equilibriumInfluence * (p.qiComposite ?? 50) * 0.004;
    score += influence.simulationReinforcement * 0.15;
    score += influence.continuityStabilization * 0.08;
    score += influence.durabilityReinforcement * 0.06;
    score -= influence.momentumSuppression * 0.04;
    score -= influence.volatilitySuppression * 0.03;
    score -= influence.recursiveSuppression * 0.03;

    if (balance.routingLane === "ranking-safe" || balance.routingLane === "reinforce") {
      score += influence.equilibriumInfluence * 0.06;
    }
    if (balance.routingLane === "momentum-check" || balance.routingLane === "volatility-check") {
      score -= signals.fakeMomentumScore * 0.03;
    }
    if (index === 0) score += influence.simulationReinforcement * 0.03;

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

export function computeEconomicWorldSimulationReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: EconomicWorldSimulationSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.systemSimulationIntegrity >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
