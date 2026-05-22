/**
 * P6.7 — Autonomous commerce reasoning graph telemetry (meta.autonomousCommerceReasoningGraph).
 */

import type { CommerceReasoningGraphBalanceResult, CommerceReasoningGraphBlendInfluence } from "@/lib/commerceReasoningGraph/commerceReasoningGraphBalancer";
import type { CommerceReasoningGraphContradictionResult } from "@/lib/commerceReasoningGraph/commerceReasoningGraphContradictions";
import type { CommerceReasoningGraphDetection } from "@/lib/commerceReasoningGraph/commerceReasoningGraphDetection";
import type { AutonomousCommerceReasoningGraphMode, CommerceReasoningGraphRoutingLane } from "@/lib/commerceReasoningGraph/commerceReasoningGraphFlags";
import type { AutonomousCommerceReasoningGraphProfile } from "@/lib/commerceReasoningGraph/commerceReasoningGraphProfiles";
import type { CommerceReasoningGraphSignalBundle } from "@/lib/commerceReasoningGraph/commerceReasoningGraphConfidence";

export type AutonomousCommerceReasoningGraphAnalytics = {
  structureAnalytics: number;
  circularAnalytics: number;
  branchAnalytics: number;
  causalAnalytics: number;
  driftAnalytics: number;
  causalityAnalytics: number;
  pathAnalytics: number;
  continuityAnalytics: number;
  integrityAnalytics: number;
  causalityFormationAnalytics: number;
  harmonyAnalytics: number;
  contradictionAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type AutonomousCommerceReasoningGraphMonitoring = {
  graphInstability: boolean;
  contradictionRisk: boolean;
  circularRisk: boolean;
  branchConflictRisk: boolean;
  replayIntegrityValid: boolean;
  pathContinuityValid: boolean;
  crossGraphBalanceValid: boolean;
  upstreamStable: boolean;
};

export type AutonomousCommerceReasoningGraphMeta = {
  version: "autonomous-commerce-reasoning-graph-v1";
  graphActive: boolean;
  graphProfile: AutonomousCommerceReasoningGraphMode;
  graphScore: number;
  graphDelta: number;
  graphConfidence: number;
  graphIntegrityScore: number;
  unstableReasoningStructureDetected: boolean;
  circularReasoningInfluenceDetected: boolean;
  conflictingReasoningBranchDetected: boolean;
  weakCausalRelationshipDetected: boolean;
  reasoningDriftEscalationDetected: boolean;
  unstableRankingCausalityDetected: boolean;
  trustworthyReasoningContinuity: number;
  deterministicDecisionCausality: number;
  reasoningSnapshotHash: string;
  chainExecutionHash: string;
  contradictionCount: number;
  routingLane: CommerceReasoningGraphRoutingLane | string;
  rollbackTriggered: boolean;
  graphWarnings: string[];
  graphAnomalies: string[];
  analytics: AutonomousCommerceReasoningGraphAnalytics;
  monitoring: AutonomousCommerceReasoningGraphMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildCommerceReasoningGraphAnalytics(args: {
  signals: CommerceReasoningGraphSignalBundle;
  influence: CommerceReasoningGraphBlendInfluence;
  detection: CommerceReasoningGraphDetection;
  contradictions: CommerceReasoningGraphContradictionResult;
  replayIntegrity: number;
  topDrift: number;
}): AutonomousCommerceReasoningGraphAnalytics {
  const { signals, influence, detection, contradictions, replayIntegrity, topDrift } = args;
  return {
    structureAnalytics: clampScore((1 - signals.unstableReasoningStructureScore) * 100),
    circularAnalytics: clampScore((1 - signals.circularReasoningInfluenceScore) * 100 + influence.circularDampening * 10),
    branchAnalytics: clampScore((1 - signals.conflictingReasoningBranchScore) * 100),
    causalAnalytics: clampScore((1 - signals.weakCausalRelationshipScore) * 100 + influence.causalInfluence * 15),
    driftAnalytics: clampScore((1 - signals.reasoningDriftEscalationScore) * 100 + influence.driftDampening * 10),
    causalityAnalytics: clampScore((1 - signals.unstableRankingCausalityScore) * 100 + influence.causalityStabilization * 15),
    pathAnalytics: clampScore(influence.pathInfluence * 100),
    continuityAnalytics: clampScore(influence.continuityStabilization * 100),
    integrityAnalytics: clampScore(signals.graphExecutionIntegrity * 100),
    causalityFormationAnalytics: clampScore(signals.deterministicDecisionCausality * 100),
    harmonyAnalytics: clampScore(signals.reasoningHarmony * 100),
    contradictionAnalytics: clampScore(contradictions.uncertaintyScore * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildCommerceReasoningGraphMonitoring(args: {
  influence: CommerceReasoningGraphBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: CommerceReasoningGraphBalanceResult;
  detection: CommerceReasoningGraphDetection;
  contradictions: CommerceReasoningGraphContradictionResult;
  profile: AutonomousCommerceReasoningGraphProfile;
}): AutonomousCommerceReasoningGraphMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, detection, contradictions, profile } = args;
  return {
    graphInstability: rollbackTriggered || !balance.decisionStable,
    contradictionRisk: contradictions.contradictionCount >= 2,
    circularRisk: detection.circularReasoningInfluenceDetected,
    branchConflictRisk: detection.conflictingReasoningBranchDetected,
    replayIntegrityValid: replayIntegrity >= 70,
    pathContinuityValid: influence.pathInfluence <= profile.maxPathAmplification,
    crossGraphBalanceValid: influence.graphDelta <= profile.maxDelta,
    upstreamStable: balance.decisionStable,
  };
}
