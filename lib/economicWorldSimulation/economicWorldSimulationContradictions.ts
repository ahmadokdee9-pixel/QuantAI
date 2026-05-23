/**
 * P6.9 — Economic world simulation contradiction detection.
 */

import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { EconomicWorldSimulationDetection } from "@/lib/economicWorldSimulation/economicWorldSimulationDetection";
import type { EconomicWorldSimulationGovernorsResult } from "@/lib/economicWorldSimulation/economicWorldSimulationGovernors";
import type { UnifiedEconomicWorldSimulationState } from "@/lib/economicWorldSimulation/economicWorldSimulationFusion";

export type EconomicWorldSimulationContradictionResult = {
  contradictionCount: number;
  contradictions: string[];
  uncertaintyScore: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectEconomicWorldSimulationContradictions(args: {
  state: UnifiedEconomicWorldSimulationState;
  detection: EconomicWorldSimulationDetection;
  governors: EconomicWorldSimulationGovernorsResult;
  cognitiveGovernance: UnifiedCognitiveGovernanceMeta;
}): EconomicWorldSimulationContradictionResult {
  const { state, detection, governors, cognitiveGovernance } = args;
  const contradictions: string[] = [];

  if (detection.fakeMomentumDetected && state.pricingPressureBalance >= 0.55) contradictions.push("momentum_balance_conflict");
  if (detection.unstableEconomyDetected && state.commerceEcosystemEquilibrium >= 0.55) contradictions.push("economy_equilibrium_conflict");
  if (detection.merchantSurvivabilityRiskDetected && state.longTermValueDurability >= 0.55) contradictions.push("merchant_durability_conflict");
  if (governors.ecosystemCollapseProtection) contradictions.push("ecosystem_collapse");
  if (cognitiveGovernance.rollbackTriggered) contradictions.push("governance_rollback");
  if (state.economicHarmony < 0.35) contradictions.push("economic_imbalance");

  const uncertaintyScore = round3(
    Math.min(1, contradictions.length * 0.1 + (1 - state.economicHarmony) * 0.2 + (cognitiveGovernance.contradictionCount ?? 0) * 0.05)
  );

  return {
    contradictionCount: contradictions.length,
    contradictions: contradictions.slice(0, 8),
    uncertaintyScore,
  };
}
