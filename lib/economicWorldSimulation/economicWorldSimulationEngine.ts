/**
 * P6.9 — Economic world simulation engine orchestration.
 */

import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import {
  computeEconomicWorldSimulationBalance,
  computeEconomicWorldSimulationBlendInfluence,
  type EconomicWorldSimulationBalanceResult,
  type EconomicWorldSimulationBlendInfluence,
} from "@/lib/economicWorldSimulation/economicWorldSimulationBalancer";
import {
  buildEconomicWorldSimulationSignalBundle,
  computeEconomicWorldSimulationConfidence,
  type EconomicWorldSimulationSignalBundle,
} from "@/lib/economicWorldSimulation/economicWorldSimulationConfidence";
import { detectEconomicWorldSimulationContradictions, type EconomicWorldSimulationContradictionResult } from "@/lib/economicWorldSimulation/economicWorldSimulationContradictions";
import { detectEconomicWorldSimulationSignals, type EconomicWorldSimulationDetection } from "@/lib/economicWorldSimulation/economicWorldSimulationDetection";
import { synthesizeUnifiedEconomicWorldSimulationState } from "@/lib/economicWorldSimulation/economicWorldSimulationFusion";
import { computeEconomicWorldSimulationGovernors, type EconomicWorldSimulationGovernorsResult } from "@/lib/economicWorldSimulation/economicWorldSimulationGovernors";
import type { EconomicWorldSimulationProfile } from "@/lib/economicWorldSimulation/economicWorldSimulationProfiles";
import { computeEconomicWorldSimulationStabilization } from "@/lib/economicWorldSimulation/economicWorldSimulationStabilization";

export type EconomicWorldSimulationEngineResult = {
  signals: EconomicWorldSimulationSignalBundle;
  detection: EconomicWorldSimulationDetection;
  governors: EconomicWorldSimulationGovernorsResult;
  contradictions: EconomicWorldSimulationContradictionResult;
  balance: EconomicWorldSimulationBalanceResult;
  influence: EconomicWorldSimulationBlendInfluence;
  simulationScore: number;
  anomalies: string[];
};

export function runEconomicWorldSimulationEngine(args: {
  cognitiveGovernance: UnifiedCognitiveGovernanceMeta;
  marketReality: MarketRealityIntelligenceMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  governance: IntentGovernanceMeta;
  profile: EconomicWorldSimulationProfile;
}): EconomicWorldSimulationEngineResult {
  const governors = computeEconomicWorldSimulationGovernors({
    cognitiveGovernance: args.cognitiveGovernance,
    marketReality: args.marketReality,
    commerceDecision: args.commerceDecision,
    governance: args.governance,
  });

  const detection = detectEconomicWorldSimulationSignals({
    cognitiveGovernance: args.cognitiveGovernance,
    marketReality: args.marketReality,
    governors,
  });

  const stabilization = computeEconomicWorldSimulationStabilization({
    cognitiveGovernance: args.cognitiveGovernance,
    marketReality: args.marketReality,
    governors,
    detection,
  });

  const state = synthesizeUnifiedEconomicWorldSimulationState({
    cognitiveGovernance: args.cognitiveGovernance,
    governors,
    detection,
    stabilization,
  });

  const signals = buildEconomicWorldSimulationSignalBundle(state);

  const contradictions = detectEconomicWorldSimulationContradictions({
    state,
    detection,
    governors,
    cognitiveGovernance: args.cognitiveGovernance,
  });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const simulationConfidence = computeEconomicWorldSimulationConfidence({
    signals,
    cognitiveGovernance: args.cognitiveGovernance,
    detection,
    contradictions,
    governanceDampen,
  });

  const balance = computeEconomicWorldSimulationBalance({
    signals,
    simulationConfidence,
    governance: args.governance,
    cognitiveGovernance: args.cognitiveGovernance,
    detection,
    governors,
    contradictions,
    profile: args.profile,
  });

  const influence = computeEconomicWorldSimulationBlendInfluence({
    signals,
    detection,
    governors,
    balance,
    profile: args.profile,
  });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresGovernanceStable && !balance.governanceStable) anomalies.push("governance_unstable");
  if (governors.ecosystemCollapseProtection) anomalies.push("ecosystem_collapse");
  if (governors.recursiveEconomicAmplificationSuppression) anomalies.push("recursive_amplification");
  if (contradictions.contradictionCount >= 3) anomalies.push("contradiction_escalation");
  if (influence.simulationDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (simulationConfidence < 0.3) anomalies.push("low_confidence");

  const simulationScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + simulationConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { signals, detection, governors, contradictions, balance, influence, simulationScore, anomalies };
}
