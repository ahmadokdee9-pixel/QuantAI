/**
 * P5.1 — Runtime signal coordination for orchestration pipeline.
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentEvaluationMeta } from "@/lib/intent/intentEvaluationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentOptimizationMeta } from "@/lib/intent/intentOptimizationEngine";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentOrchestrationProfile } from "@/lib/intent/intentOrchestrationProfiles";
import type { AdaptiveBalanceResult } from "@/lib/intent/intentAdaptiveBalancer";

export type CoordinatedRuntimeSignals = {
  runtimeStable: boolean;
  governanceClear: boolean;
  calibrationStable: boolean;
  optimizationRiskLow: boolean;
  evaluationQualityOk: boolean;
  coordinatedScore: number;
  dampeningFactor: number;
  routingLane: "hold" | "balance" | "stabilize" | "correct";
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function coordinateRuntimeSignals(args: {
  evaluation: IntentEvaluationMeta;
  optimization: IntentOptimizationMeta;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  balance: AdaptiveBalanceResult;
  profile: IntentOrchestrationProfile;
}): CoordinatedRuntimeSignals {
  const { evaluation, optimization, governance, calibration, runtime, balance, profile } = args;

  const runtimeStable =
    !runtime.monitoring.runtimeInstability &&
    !runtime.monitoring.driftOverflow &&
    runtime.analytics.stabilityScoring >= 50;
  const governanceClear = !governance.anomalyDetected && governance.governanceScore >= 55;
  const calibrationStable = !calibration.monitoring.unstableCalibration && calibration.calibrationScore >= 50;
  const optimizationRiskLow = optimization.riskLevel !== "high";
  const evaluationQualityOk = evaluation.qualityScore >= 55;

  let dampeningFactor = 1;
  if (!runtimeStable) dampeningFactor *= 0.85;
  if (!governanceClear) dampeningFactor *= 0.88;
  if (!calibrationStable) dampeningFactor *= 0.9;
  if (balance.signalConflicts.length > 0) dampeningFactor *= 0.92;
  if (runtime.rollbackTriggered) dampeningFactor *= 0.8;

  let routingLane: CoordinatedRuntimeSignals["routingLane"] = "balance";
  if (runtime.emergencyShutdown || !profile.allowsMutation) routingLane = "hold";
  else if (!runtimeStable || balance.signalConflicts.length >= 2) routingLane = "stabilize";
  else if (runtime.monitoring.suppressionAnomaly || runtime.monitoring.trustRisk) routingLane = "correct";
  else if (optimizationRiskLow && governanceClear) routingLane = "balance";

  const coordinatedScore = clampScore(
    evaluation.qualityScore * 0.2 +
      governance.governanceScore * 0.2 +
      calibration.calibrationScore * 0.2 +
      runtime.runtimeScore * 0.2 +
      balance.adaptiveBalanceScore * 0.2
  );

  return {
    runtimeStable,
    governanceClear,
    calibrationStable,
    optimizationRiskLow,
    evaluationQualityOk,
    coordinatedScore,
    dampeningFactor: Math.round(dampeningFactor * 1000) / 1000,
    routingLane,
  };
}

export type OrchestrationMonitoring = {
  orchestrationInstability: boolean;
  adaptiveConflict: boolean;
  replayConsistencyReady: boolean;
  driftEscalation: boolean;
  trustInflation: boolean;
  suppressionImbalance: boolean;
  merchantFairness: boolean;
};

export function buildOrchestrationMonitoring(args: {
  balance: AdaptiveBalanceResult;
  runtime: IntentRuntimeMeta;
  coordinated: CoordinatedRuntimeSignals;
  orchestrationDrift: number;
  rollbackTriggered: boolean;
}): OrchestrationMonitoring {
  const { balance, runtime, coordinated, orchestrationDrift, rollbackTriggered } = args;
  return {
    orchestrationInstability: !coordinated.runtimeStable || rollbackTriggered,
    adaptiveConflict: balance.signalConflicts.length > 0,
    replayConsistencyReady: coordinated.runtimeStable && !rollbackTriggered,
    driftEscalation: orchestrationDrift >= 2 || runtime.monitoring.driftOverflow,
    trustInflation: runtime.monitoring.trustRisk || balance.trustBalance > 1.2,
    suppressionImbalance: runtime.monitoring.suppressionAnomaly,
    merchantFairness: balance.warnings.includes("merchant_fairness_balancing"),
  };
}
