/**
 * P6.9 — Economic world simulation confidence + signal bundle.
 */

import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { EconomicWorldSimulationContradictionResult } from "@/lib/economicWorldSimulation/economicWorldSimulationContradictions";
import type { EconomicWorldSimulationDetection } from "@/lib/economicWorldSimulation/economicWorldSimulationDetection";
import type { UnifiedEconomicWorldSimulationState } from "@/lib/economicWorldSimulation/economicWorldSimulationFusion";

export type EconomicWorldSimulationSignalBundle = {
  economicPressureScore: number;
  demandSupplyInstabilityScore: number;
  merchantSurvivabilityScore: number;
  pricingMomentumDecayScore: number;
  longTermValueDurabilityScore: number;
  economicFatigueScore: number;
  fakeMomentumScore: number;
  unstableEconomyScore: number;
  simulationIntegrityScore: number;
  pricingPressureBalance: number;
  commerceEcosystemEquilibrium: number;
  simulationContinuity: number;
  longTermValueDurability: number;
  boundedEconomicInfluence: number;
  systemSimulationIntegrity: number;
  economicHarmony: number;
  simulationSnapshotHash: string;
  simulationExecutionHash: string;
  signalHash: string;
  economicExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildEconomicWorldSimulationSignalBundle(state: UnifiedEconomicWorldSimulationState): EconomicWorldSimulationSignalBundle {
  const core = {
    economicPressureScore: state.economicPressureScore,
    demandSupplyInstabilityScore: state.demandSupplyInstabilityScore,
    merchantSurvivabilityScore: state.merchantSurvivabilityScore,
    pricingMomentumDecayScore: state.pricingMomentumDecayScore,
    longTermValueDurabilityScore: state.longTermValueDurabilityScore,
    economicFatigueScore: state.economicFatigueScore,
    fakeMomentumScore: state.fakeMomentumScore,
    unstableEconomyScore: state.unstableEconomyScore,
    simulationIntegrityScore: state.simulationIntegrityScore,
    pricingPressureBalance: state.pricingPressureBalance,
    commerceEcosystemEquilibrium: state.commerceEcosystemEquilibrium,
    simulationContinuity: state.simulationContinuity,
    longTermValueDurability: state.longTermValueDurability,
    boundedEconomicInfluence: state.boundedEconomicInfluence,
    systemSimulationIntegrity: state.systemSimulationIntegrity,
    economicHarmony: state.economicHarmony,
    simulationSnapshotHash: state.simulationSnapshotHash,
    simulationExecutionHash: state.simulationExecutionHash,
  };

  const signalHash = Object.entries(core)
    .filter(([k]) => !k.endsWith("Hash"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");

  const economicExecutionHash = [
    `int:${core.simulationIntegrityScore}`,
    `cont:${core.simulationContinuity}`,
    `eq:${core.commerceEcosystemEquilibrium}`,
    `harm:${core.economicHarmony}`,
  ].join(",");

  return { ...core, signalHash, economicExecutionHash };
}

export function computeEconomicWorldSimulationConfidence(args: {
  signals: EconomicWorldSimulationSignalBundle;
  cognitiveGovernance: UnifiedCognitiveGovernanceMeta;
  detection: EconomicWorldSimulationDetection;
  contradictions: EconomicWorldSimulationContradictionResult;
  governanceDampen: number;
}): number {
  const { signals, cognitiveGovernance, detection, contradictions, governanceDampen } = args;

  const signalConfidence = clamp(
    signals.economicHarmony * 0.22 +
      signals.systemSimulationIntegrity * 0.18 +
      signals.longTermValueDurability * 0.15 +
      signals.simulationContinuity * 0.12 +
      (cognitiveGovernance.governanceConfidence ?? 0) * 0.1 +
      signals.simulationIntegrityScore * 0.08 -
      signals.fakeMomentumScore * 0.08 -
      (detection.unstableEconomyDetected ? 0.05 : 0),
    0,
    1
  );

  return round3(clamp((signalConfidence - contradictions.uncertaintyScore * 0.1) * governanceDampen, 0, 1));
}
