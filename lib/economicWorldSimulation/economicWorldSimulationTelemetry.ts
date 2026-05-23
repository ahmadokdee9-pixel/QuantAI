/**
 * P6.9 — Economic world simulation telemetry (meta.economicWorldSimulation).
 */

import type { EconomicWorldSimulationBalanceResult, EconomicWorldSimulationBlendInfluence } from "@/lib/economicWorldSimulation/economicWorldSimulationBalancer";
import type { EconomicWorldSimulationContradictionResult } from "@/lib/economicWorldSimulation/economicWorldSimulationContradictions";
import type { EconomicWorldSimulationDetection } from "@/lib/economicWorldSimulation/economicWorldSimulationDetection";
import type { EconomicWorldSimulationGovernorsResult } from "@/lib/economicWorldSimulation/economicWorldSimulationGovernors";
import type { EconomicWorldSimulationMode, EconomicWorldSimulationRoutingLane } from "@/lib/economicWorldSimulation/economicWorldSimulationFlags";
import type { EconomicWorldSimulationProfile } from "@/lib/economicWorldSimulation/economicWorldSimulationProfiles";
import type { EconomicWorldSimulationSignalBundle } from "@/lib/economicWorldSimulation/economicWorldSimulationConfidence";

export type EconomicWorldSimulationAnalytics = {
  pressureAnalytics: number;
  equilibriumAnalytics: number;
  merchantAnalytics: number;
  momentumAnalytics: number;
  durabilityAnalytics: number;
  fatigueAnalytics: number;
  ecosystemAnalytics: number;
  protectionAnalytics: number;
  continuityAnalytics: number;
  harmonyAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type EconomicWorldSimulationMonitoring = {
  simulationInstability: boolean;
  contradictionRisk: boolean;
  momentumRisk: boolean;
  volatilityRisk: boolean;
  replayIntegrityValid: boolean;
  crossLayerBalanceValid: boolean;
  boundedInfluenceValid: boolean;
  upstreamStable: boolean;
};

export type EconomicWorldSimulationMeta = {
  version: "economic-world-simulation-v1";
  simulationActive: boolean;
  simulationProfile: EconomicWorldSimulationMode;
  simulationScore: number;
  simulationDelta: number;
  simulationConfidence: number;
  simulationIntegrityScore: number;
  economicPressureDetected: boolean;
  demandSupplyInstabilityDetected: boolean;
  merchantSurvivabilityRiskDetected: boolean;
  pricingMomentumDecayDetected: boolean;
  longTermValueDurabilityRiskDetected: boolean;
  economicFatigueDetected: boolean;
  fakeMomentumDetected: boolean;
  unstableEconomyDetected: boolean;
  economicInstabilityRollback: boolean;
  fakeMomentumSuppression: boolean;
  priceVolatilityBlockade: boolean;
  ecosystemCollapseProtection: boolean;
  recursiveEconomicAmplificationSuppression: boolean;
  unstableMerchantPressureRollback: boolean;
  confidenceInflationRollback: boolean;
  contradictionCascadeProtection: boolean;
  pricingPressureBalance: number;
  commerceEcosystemEquilibrium: number;
  simulationContinuity: number;
  longTermValueDurability: number;
  simulationSnapshotHash: string;
  simulationExecutionHash: string;
  contradictionCount: number;
  routingLane: EconomicWorldSimulationRoutingLane | string;
  rollbackTriggered: boolean;
  simulationWarnings: string[];
  simulationAnomalies: string[];
  analytics: EconomicWorldSimulationAnalytics;
  monitoring: EconomicWorldSimulationMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  economicExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildEconomicWorldSimulationAnalytics(args: {
  signals: EconomicWorldSimulationSignalBundle;
  influence: EconomicWorldSimulationBlendInfluence;
  detection: EconomicWorldSimulationDetection;
  governors: EconomicWorldSimulationGovernorsResult;
  contradictions: EconomicWorldSimulationContradictionResult;
  replayIntegrity: number;
  topDrift: number;
}): EconomicWorldSimulationAnalytics {
  const { signals, influence, detection, governors, contradictions, replayIntegrity, topDrift } = args;
  return {
    pressureAnalytics: clampScore((1 - detection.economicPressureScore) * 100 + influence.pressureInfluence * 15),
    equilibriumAnalytics: clampScore(signals.commerceEcosystemEquilibrium * 100 + influence.equilibriumInfluence * 15),
    merchantAnalytics: clampScore((1 - detection.merchantSurvivabilityScore) * 100),
    momentumAnalytics: clampScore((1 - detection.fakeMomentumScore) * 100 + influence.momentumSuppression * 10),
    durabilityAnalytics: clampScore(signals.longTermValueDurability * 100 + influence.durabilityReinforcement * 15),
    fatigueAnalytics: clampScore((1 - detection.economicFatigueScore) * 100),
    ecosystemAnalytics: clampScore(signals.commerceEcosystemEquilibrium * 100),
    protectionAnalytics: clampScore(governors.economicProtectionScore * 100),
    continuityAnalytics: clampScore(influence.continuityStabilization * 100),
    harmonyAnalytics: clampScore(signals.economicHarmony * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildEconomicWorldSimulationMonitoring(args: {
  influence: EconomicWorldSimulationBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: EconomicWorldSimulationBalanceResult;
  detection: EconomicWorldSimulationDetection;
  governors: EconomicWorldSimulationGovernorsResult;
  contradictions: EconomicWorldSimulationContradictionResult;
  profile: EconomicWorldSimulationProfile;
}): EconomicWorldSimulationMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, detection, governors, contradictions, profile } = args;
  return {
    simulationInstability: rollbackTriggered || !balance.governanceStable,
    contradictionRisk: contradictions.contradictionCount >= 2,
    momentumRisk: detection.fakeMomentumDetected,
    volatilityRisk: governors.priceVolatilityBlockade,
    replayIntegrityValid: replayIntegrity >= 70,
    crossLayerBalanceValid: influence.simulationDelta <= profile.maxDelta,
    boundedInfluenceValid: influence.pressureInfluence <= profile.maxPressureAmplification,
    upstreamStable: balance.governanceStable,
  };
}
