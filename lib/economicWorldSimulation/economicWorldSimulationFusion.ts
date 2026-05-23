/**
 * P6.9 — Unified economic world simulation state synthesis.
 */

import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { EconomicWorldSimulationDetection } from "@/lib/economicWorldSimulation/economicWorldSimulationDetection";
import type { EconomicWorldSimulationGovernorsResult } from "@/lib/economicWorldSimulation/economicWorldSimulationGovernors";
import type { EconomicWorldSimulationStabilization } from "@/lib/economicWorldSimulation/economicWorldSimulationStabilization";

export type UnifiedEconomicWorldSimulationState = {
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
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function synthesizeUnifiedEconomicWorldSimulationState(args: {
  cognitiveGovernance: UnifiedCognitiveGovernanceMeta;
  governors: EconomicWorldSimulationGovernorsResult;
  detection: EconomicWorldSimulationDetection;
  stabilization: EconomicWorldSimulationStabilization;
}): UnifiedEconomicWorldSimulationState {
  const riskScores = [
    args.detection.economicPressureScore,
    args.detection.demandSupplyInstabilityScore,
    args.detection.merchantSurvivabilityScore,
    args.detection.pricingMomentumDecayScore,
    args.detection.longTermValueDurabilityScore,
    args.detection.economicFatigueScore,
    args.detection.fakeMomentumScore,
    args.detection.unstableEconomyScore,
  ];
  const meanRisk = riskScores.reduce((s, v) => s + v, 0) / riskScores.length;
  const economicHarmony = round3(clamp(args.stabilization.systemSimulationIntegrity * 0.55 + (1 - meanRisk) * 0.45, 0, 1));

  const simulationSnapshotHash = [
    `gov:${Math.round((args.cognitiveGovernance.governanceScore ?? 0))}`,
    `prot:${Math.round(args.governors.economicProtectionScore * 1000)}`,
    `int:${Math.round(args.detection.simulationIntegrityScore * 1000)}`,
    `snap:${args.cognitiveGovernance.governanceSnapshotHash ?? "none"}`,
  ].join(";");

  const simulationExecutionHash = [
    `eq:${Math.round(args.stabilization.commerceEcosystemEquilibrium * 1000)}`,
    `cont:${Math.round(args.stabilization.simulationContinuity * 1000)}`,
    `dur:${Math.round(args.stabilization.longTermValueDurability * 1000)}`,
    `harm:${Math.round(economicHarmony * 1000)}`,
  ].join(",");

  return {
    economicPressureScore: args.detection.economicPressureScore,
    demandSupplyInstabilityScore: args.detection.demandSupplyInstabilityScore,
    merchantSurvivabilityScore: args.detection.merchantSurvivabilityScore,
    pricingMomentumDecayScore: args.detection.pricingMomentumDecayScore,
    longTermValueDurabilityScore: args.detection.longTermValueDurabilityScore,
    economicFatigueScore: args.detection.economicFatigueScore,
    fakeMomentumScore: args.detection.fakeMomentumScore,
    unstableEconomyScore: args.detection.unstableEconomyScore,
    simulationIntegrityScore: args.detection.simulationIntegrityScore,
    pricingPressureBalance: args.stabilization.pricingPressureBalance,
    commerceEcosystemEquilibrium: args.stabilization.commerceEcosystemEquilibrium,
    simulationContinuity: args.stabilization.simulationContinuity,
    longTermValueDurability: args.stabilization.longTermValueDurability,
    boundedEconomicInfluence: args.stabilization.boundedEconomicInfluence,
    systemSimulationIntegrity: args.stabilization.systemSimulationIntegrity,
    economicHarmony,
    simulationSnapshotHash,
    simulationExecutionHash,
  };
}
