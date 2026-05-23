/**
 * P6.8 — Unified cognitive governance telemetry (meta.unifiedCognitiveGovernance).
 */

import type { CognitiveGovernanceBalanceResult, CognitiveGovernanceBlendInfluence } from "@/lib/cognitiveGovernance/cognitiveGovernanceBalancer";
import type { CognitiveGovernanceContradictionResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceContradictions";
import type { CognitiveGovernanceDetection } from "@/lib/cognitiveGovernance/cognitiveGovernanceDetection";
import type { CognitiveGovernanceGovernorsResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceGovernors";
import type { CognitiveGovernanceRoutingLane, UnifiedCognitiveGovernanceMode } from "@/lib/cognitiveGovernance/cognitiveGovernanceFlags";
import type { UnifiedCognitiveGovernanceProfile } from "@/lib/cognitiveGovernance/cognitiveGovernanceProfiles";
import type { CognitiveGovernanceSignalBundle } from "@/lib/cognitiveGovernance/cognitiveGovernanceConfidence";

export type UnifiedCognitiveGovernanceAnalytics = {
  equilibriumAnalytics: number;
  contradictionAnalytics: number;
  influenceAnalytics: number;
  confidenceAnalytics: number;
  rankingAnalytics: number;
  continuityAnalytics: number;
  causalityAnalytics: number;
  protectionAnalytics: number;
  arbitrationAnalytics: number;
  harmonyAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type UnifiedCognitiveGovernanceMonitoring = {
  governanceInstability: boolean;
  contradictionRisk: boolean;
  equilibriumRisk: boolean;
  recursiveInfluenceRisk: boolean;
  replayIntegrityValid: boolean;
  crossLayerBalanceValid: boolean;
  boundedInfluenceValid: boolean;
  upstreamStable: boolean;
};

export type UnifiedCognitiveGovernanceMeta = {
  version: "unified-cognitive-governance-v1";
  governanceActive: boolean;
  governanceProfile: UnifiedCognitiveGovernanceMode;
  governanceScore: number;
  governanceDelta: number;
  governanceConfidence: number;
  governanceIntegrityScore: number;
  globalEquilibriumDriftDetected: boolean;
  crossLayerContradictionDetected: boolean;
  influenceInstabilityDetected: boolean;
  confidenceNormalizationRequired: boolean;
  rankingEquilibriumRiskDetected: boolean;
  governanceContinuityRiskDetected: boolean;
  causalConsistencyFailureDetected: boolean;
  equilibriumDriftRollback: boolean;
  crossLayerInstabilityShutdown: boolean;
  confidenceInflationSuppression: boolean;
  recursiveInfluenceSuppression: boolean;
  unstableGovernanceBlockade: boolean;
  causalInconsistencyRollback: boolean;
  contradictionCascadeProtection: boolean;
  governanceContinuity: number;
  rankingEquilibriumProtection: number;
  causalConsistencyValidation: number;
  governanceSnapshotHash: string;
  arbitrationExecutionHash: string;
  contradictionCount: number;
  routingLane: CognitiveGovernanceRoutingLane | string;
  rollbackTriggered: boolean;
  governanceWarnings: string[];
  governanceAnomalies: string[];
  analytics: UnifiedCognitiveGovernanceAnalytics;
  monitoring: UnifiedCognitiveGovernanceMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  governanceExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildCognitiveGovernanceAnalytics(args: {
  signals: CognitiveGovernanceSignalBundle;
  influence: CognitiveGovernanceBlendInfluence;
  detection: CognitiveGovernanceDetection;
  governors: CognitiveGovernanceGovernorsResult;
  contradictions: CognitiveGovernanceContradictionResult;
  replayIntegrity: number;
  topDrift: number;
}): UnifiedCognitiveGovernanceAnalytics {
  const { signals, influence, detection, governors, contradictions, replayIntegrity, topDrift } = args;
  return {
    equilibriumAnalytics: clampScore((1 - detection.globalEquilibriumDriftScore) * 100 + influence.driftSuppression * 10),
    contradictionAnalytics: clampScore((1 - detection.crossLayerContradictionScore) * 100),
    influenceAnalytics: clampScore(signals.influenceStabilization * 100 + influence.influenceStabilization * 15),
    confidenceAnalytics: clampScore(signals.confidenceNormalization * 100 + influence.confidenceNormalization * 10),
    rankingAnalytics: clampScore(signals.rankingEquilibriumProtection * 100 + influence.equilibriumInfluence * 15),
    continuityAnalytics: clampScore(influence.continuityReinforcement * 100),
    causalityAnalytics: clampScore(signals.causalConsistencyValidation * 100 + influence.causalityReinforcement * 15),
    protectionAnalytics: clampScore(governors.governanceProtectionScore * 100),
    arbitrationAnalytics: clampScore(signals.systemReplayIntegrity * 100),
    harmonyAnalytics: clampScore(signals.governanceHarmony * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildCognitiveGovernanceMonitoring(args: {
  influence: CognitiveGovernanceBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: CognitiveGovernanceBalanceResult;
  detection: CognitiveGovernanceDetection;
  governors: CognitiveGovernanceGovernorsResult;
  contradictions: CognitiveGovernanceContradictionResult;
  profile: UnifiedCognitiveGovernanceProfile;
}): UnifiedCognitiveGovernanceMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, detection, governors, contradictions, profile } = args;
  return {
    governanceInstability: rollbackTriggered || !balance.graphStable,
    contradictionRisk: contradictions.contradictionCount >= 2,
    equilibriumRisk: detection.globalEquilibriumDriftDetected,
    recursiveInfluenceRisk: governors.recursiveInfluenceSuppression,
    replayIntegrityValid: replayIntegrity >= 70,
    crossLayerBalanceValid: influence.governanceDelta <= profile.maxDelta,
    boundedInfluenceValid: influence.equilibriumInfluence <= profile.maxEquilibriumAmplification,
    upstreamStable: balance.graphStable,
  };
}
