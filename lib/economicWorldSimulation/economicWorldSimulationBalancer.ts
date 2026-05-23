/**
 * P6.9 — Economic world simulation balancer (routing + bounded influence).
 */

import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { EconomicWorldSimulationContradictionResult } from "@/lib/economicWorldSimulation/economicWorldSimulationContradictions";
import type { EconomicWorldSimulationDetection } from "@/lib/economicWorldSimulation/economicWorldSimulationDetection";
import type { EconomicWorldSimulationSignalBundle } from "@/lib/economicWorldSimulation/economicWorldSimulationConfidence";
import type { EconomicWorldSimulationGovernorsResult } from "@/lib/economicWorldSimulation/economicWorldSimulationGovernors";
import type { EconomicWorldSimulationRoutingLane } from "@/lib/economicWorldSimulation/economicWorldSimulationFlags";
import type { EconomicWorldSimulationProfile } from "@/lib/economicWorldSimulation/economicWorldSimulationProfiles";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";

export type EconomicWorldSimulationBalanceResult = {
  routingLane: EconomicWorldSimulationRoutingLane;
  governanceDampen: number;
  governanceStable: boolean;
  balanceScore: number;
  simulationConfidence: number;
};

export type EconomicWorldSimulationBlendInfluence = {
  simulationDelta: number;
  pressureInfluence: number;
  equilibriumInfluence: number;
  continuityStabilization: number;
  durabilityReinforcement: number;
  momentumSuppression: number;
  volatilitySuppression: number;
  recursiveSuppression: number;
  simulationReinforcement: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveEconomicWorldSimulationRoutingLane(args: {
  signals: EconomicWorldSimulationSignalBundle;
  detection: EconomicWorldSimulationDetection;
  governors: EconomicWorldSimulationGovernorsResult;
  contradictions: EconomicWorldSimulationContradictionResult;
  cognitiveGovernance: UnifiedCognitiveGovernanceMeta;
  governance: IntentGovernanceMeta;
}): EconomicWorldSimulationRoutingLane {
  const { signals, detection, governors, contradictions, cognitiveGovernance, governance } = args;

  if (governors.ecosystemCollapseProtection || governors.economicInstabilityRollback) return "rollback-safe";
  if (governance.anomalyDetected || cognitiveGovernance.rollbackTriggered) return "stabilize";
  if (cognitiveGovernance.routingLane === "replay-protect") return "replay-protect";
  if (detection.unstableEconomyDetected || governors.recursiveEconomicAmplificationSuppression) return "economic-check";
  if (detection.fakeMomentumDetected || governors.fakeMomentumSuppression) return "momentum-check";
  if (detection.demandSupplyInstabilityDetected || governors.priceVolatilityBlockade) return "volatility-check";
  if (detection.merchantSurvivabilityRiskDetected || governors.unstableMerchantPressureRollback) return "merchant-check";
  if (detection.economicFatigueDetected || detection.economicPressureDetected) return "ecosystem-check";
  if (governors.confidenceInflationRollback || detection.longTermValueDurabilityRiskDetected) return "confidence-check";
  if (governors.contradictionCascadeProtection || contradictions.contradictionCount >= 2) return "contradiction-check";
  if (contradictions.contradictionCount >= 2) return "stabilize";
  if (signals.systemSimulationIntegrity < 0.4) return "system-safe";
  if (cognitiveGovernance.routingLane === "reinforce") return "reinforce";
  if (signals.economicHarmony >= 0.55 && signals.commerceEcosystemEquilibrium >= 0.5) return "ranking-safe";
  if (cognitiveGovernance.routingLane === "compare") return "compare";
  return "hold";
}

export function computeEconomicWorldSimulationBalance(args: {
  signals: EconomicWorldSimulationSignalBundle;
  simulationConfidence: number;
  governance: IntentGovernanceMeta;
  cognitiveGovernance: UnifiedCognitiveGovernanceMeta;
  detection: EconomicWorldSimulationDetection;
  governors: EconomicWorldSimulationGovernorsResult;
  contradictions: EconomicWorldSimulationContradictionResult;
  profile: EconomicWorldSimulationProfile;
}): EconomicWorldSimulationBalanceResult {
  const { signals, simulationConfidence, governance, cognitiveGovernance, detection, governors, contradictions, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;
  if (detection.unstableEconomyDetected) governanceDampen *= 0.92;
  if (detection.fakeMomentumDetected) governanceDampen *= 0.94;
  if (governors.recursiveEconomicAmplificationSuppression) governanceDampen *= 0.93;

  const governanceStable =
    !cognitiveGovernance.rollbackTriggered &&
    (cognitiveGovernance.analytics?.replayIntegrityAnalytics ?? 0) >= 50 &&
    !detection.unstableEconomyDetected;

  let routingLane = resolveEconomicWorldSimulationRoutingLane({
    signals,
    detection,
    governors,
    contradictions,
    cognitiveGovernance,
    governance,
  });

  if (!profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize" && routingLane !== "rollback-safe") {
    routingLane = "hold";
  }

  const balanceScore = Math.min(
    100,
    Math.round(simulationConfidence * 40 + signals.economicHarmony * 25 + signals.simulationIntegrityScore * 15 + (cognitiveGovernance.governanceScore ?? 0) * 0.1)
  );

  return { routingLane, governanceDampen, governanceStable, balanceScore, simulationConfidence };
}

export function computeEconomicWorldSimulationBlendInfluence(args: {
  signals: EconomicWorldSimulationSignalBundle;
  detection: EconomicWorldSimulationDetection;
  governors: EconomicWorldSimulationGovernorsResult;
  balance: EconomicWorldSimulationBalanceResult;
  profile: EconomicWorldSimulationProfile;
}): EconomicWorldSimulationBlendInfluence {
  const { signals, detection, governors, balance, profile } = args;
  const damp = balance.governanceDampen;

  const pressureInfluence = clamp(signals.pricingPressureBalance * profile.maxPressureAmplification * damp, 0, profile.maxPressureAmplification);
  const equilibriumInfluence = clamp(signals.commerceEcosystemEquilibrium * profile.maxEquilibriumAmplification * damp, 0, profile.maxEquilibriumAmplification);
  const continuityStabilization = clamp(signals.simulationContinuity * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const durabilityReinforcement = clamp(signals.longTermValueDurability * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const momentumSuppression = clamp(governors.fakeMomentumScore * profile.maxDelta * 0.5 * damp, 0, profile.maxDelta);
  const volatilitySuppression = clamp(governors.priceVolatilityScore * profile.maxDelta * 0.4 * damp, 0, profile.maxDelta);
  const recursiveSuppression = clamp(governors.recursiveAmplificationScore * profile.maxDelta * 0.5 * damp, 0, profile.maxDelta);
  const simulationReinforcement = clamp(signals.economicHarmony * profile.maxEquilibriumAmplification * 0.6, 0, profile.maxEquilibriumAmplification);

  const checkLanes = new Set([
    "economic-check",
    "momentum-check",
    "ecosystem-check",
    "merchant-check",
    "volatility-check",
    "confidence-check",
    "contradiction-check",
    "system-safe",
    "rollback-safe",
  ]);

  const laneScale =
    balance.routingLane === "ranking-safe" || balance.routingLane === "reinforce"
      ? 1.04
      : checkLanes.has(balance.routingLane)
        ? 0.7
        : 0.93;

  const simulationDelta = clamp(
    (pressureInfluence + equilibriumInfluence + continuityStabilization + durabilityReinforcement + simulationReinforcement - momentumSuppression * 0.5 - volatilitySuppression * 0.4 - recursiveSuppression * 0.4) *
      0.06 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    simulationDelta: round3(Math.max(0, simulationDelta)),
    pressureInfluence: round3(pressureInfluence),
    equilibriumInfluence: round3(equilibriumInfluence),
    continuityStabilization: round3(continuityStabilization),
    durabilityReinforcement: round3(durabilityReinforcement),
    momentumSuppression: round3(momentumSuppression),
    volatilitySuppression: round3(volatilitySuppression),
    recursiveSuppression: round3(recursiveSuppression),
    simulationReinforcement: round3(simulationReinforcement),
  };
}
