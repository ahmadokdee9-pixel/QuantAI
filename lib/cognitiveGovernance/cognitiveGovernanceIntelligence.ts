/**
 * P6.8 — Unified cognitive governance (deterministic only; no autonomous agents).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  isUnifiedCognitiveGovernanceEnabled,
  isUnifiedCognitiveGovernanceEnvironmentAllowed,
  isUnifiedCognitiveGovernanceMutationEnabled,
  isUnifiedCognitiveGovernanceShadowMode,
  UNIFIED_COGNITIVE_GOVERNANCE_VERSION,
  COGNITIVE_GOVERNANCE_MAX_DRIFT,
  resolveUnifiedCognitiveGovernanceMode,
} from "@/lib/cognitiveGovernance/cognitiveGovernanceFlags";
import { resolveUnifiedCognitiveGovernanceProfile } from "@/lib/cognitiveGovernance/cognitiveGovernanceProfiles";
import { runCognitiveGovernanceEngine } from "@/lib/cognitiveGovernance/cognitiveGovernanceEngine";
import {
  applyCognitiveGovernanceStabilizationRanking,
  computeCognitiveGovernanceReplayIntegrity,
} from "@/lib/cognitiveGovernance/cognitiveGovernanceRanking";
import { validateDeterministicCognitiveGovernanceReplay } from "@/lib/cognitiveGovernance/cognitiveGovernanceReplay";
import type { CognitiveGovernanceSignalBundle } from "@/lib/cognitiveGovernance/cognitiveGovernanceConfidence";
import {
  buildCognitiveGovernanceAnalytics,
  buildCognitiveGovernanceMonitoring,
  type UnifiedCognitiveGovernanceAnalytics,
  type UnifiedCognitiveGovernanceMeta,
  type UnifiedCognitiveGovernanceMonitoring,
} from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { UnifiedCognitiveGovernanceMeta, UnifiedCognitiveGovernanceAnalytics, UnifiedCognitiveGovernanceMonitoring };

export type UnifiedCognitiveGovernanceApplyResult = {
  products: QuantProduct[];
  meta: UnifiedCognitiveGovernanceMeta;
  signals: CognitiveGovernanceSignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

const CHECK_LANES = new Set([
  "governance-check",
  "equilibrium-check",
  "confidence-check",
  "causality-check",
  "contradiction-check",
  "system-safe",
  "rollback-safe",
]);

export function applyControlledUnifiedCognitiveGovernance(args: {
  products: QuantProduct[];
  query: string;
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
  fusion: IntentFusionMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  intent: IntentCognitionMeta;
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  marketReality: MarketRealityIntelligenceMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): UnifiedCognitiveGovernanceApplyResult {
  const started = Date.now();
  const { products, governance, reasoningGraph, commerceDecision, marketReality, memoryless, strategic, preOrderLinks } = args;

  const mode = resolveUnifiedCognitiveGovernanceMode();
  const profile = resolveUnifiedCognitiveGovernanceProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runCognitiveGovernanceEngine({
    reasoningGraph,
    commerceDecision,
    marketReality,
    memoryless,
    strategic,
    governance,
    profile,
  });

  const emptyAnalytics: UnifiedCognitiveGovernanceAnalytics = {
    equilibriumAnalytics: 0,
    contradictionAnalytics: 0,
    influenceAnalytics: 0,
    confidenceAnalytics: 0,
    rankingAnalytics: 0,
    continuityAnalytics: 0,
    causalityAnalytics: 0,
    protectionAnalytics: 0,
    arbitrationAnalytics: 0,
    harmonyAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildCognitiveGovernanceMonitoring({
    influence: {
      governanceDelta: 0,
      equilibriumInfluence: 0,
      influenceStabilization: 0,
      confidenceNormalization: 0,
      continuityReinforcement: 0,
      causalityReinforcement: 0,
      recursiveSuppression: 0,
      driftSuppression: 0,
      governanceReinforcement: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    detection: engine.detection,
    governors: engine.governors,
    contradictions: engine.contradictions,
    profile,
  });

  if (!isUnifiedCognitiveGovernanceEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      meta: {
        version: UNIFIED_COGNITIVE_GOVERNANCE_VERSION,
        governanceActive: false,
        governanceProfile: mode,
        governanceScore: 0,
        governanceDelta: 0,
        governanceConfidence: engine.balance.governanceConfidence,
        governanceIntegrityScore: engine.detection.governanceIntegrityScore,
        globalEquilibriumDriftDetected: engine.detection.globalEquilibriumDriftDetected,
        crossLayerContradictionDetected: engine.detection.crossLayerContradictionDetected,
        influenceInstabilityDetected: engine.detection.influenceInstabilityDetected,
        confidenceNormalizationRequired: engine.detection.confidenceNormalizationRequired,
        rankingEquilibriumRiskDetected: engine.detection.rankingEquilibriumRiskDetected,
        governanceContinuityRiskDetected: engine.detection.governanceContinuityRiskDetected,
        causalConsistencyFailureDetected: engine.detection.causalConsistencyFailureDetected,
        equilibriumDriftRollback: engine.governors.equilibriumDriftRollback,
        crossLayerInstabilityShutdown: engine.governors.crossLayerInstabilityShutdown,
        confidenceInflationSuppression: engine.governors.confidenceInflationSuppression,
        recursiveInfluenceSuppression: engine.governors.recursiveInfluenceSuppression,
        unstableGovernanceBlockade: engine.governors.unstableGovernanceBlockade,
        causalInconsistencyRollback: engine.governors.causalInconsistencyRollback,
        contradictionCascadeProtection: engine.governors.contradictionCascadeProtection,
        governanceContinuity: engine.signals.governanceContinuity,
        rankingEquilibriumProtection: engine.signals.rankingEquilibriumProtection,
        causalConsistencyValidation: engine.signals.causalConsistencyValidation,
        governanceSnapshotHash: engine.signals.governanceSnapshotHash,
        arbitrationExecutionHash: engine.signals.arbitrationExecutionHash,
        contradictionCount: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        governanceWarnings: ["cognitive_governance_disabled"],
        governanceAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        governanceExecutionHash: engine.signals.governanceExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyCognitiveGovernanceStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeCognitiveGovernanceReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > COGNITIVE_GOVERNANCE_MAX_DRIFT) anomalies.push("drift_escalation");
  if (engine.contradictions.contradictionCount >= 3) anomalies.push("contradiction_gate");
  if (reasoningGraph.rollbackTriggered || commerceDecision.rollbackTriggered || marketReality.rollbackTriggered || memoryless.rollbackTriggered) {
    anomalies.push("upstream_instability");
  }
  if (engine.governors.crossLayerInstabilityShutdown) anomalies.push("cross_layer_shutdown");
  if (engine.governors.recursiveInfluenceSuppression) anomalies.push("recursive_influence");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-governance" && (!engine.balance.graphStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isUnifiedCognitiveGovernanceMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isUnifiedCognitiveGovernanceShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "replay-protect" &&
    engine.balance.routingLane !== "rollback-safe" &&
    !CHECK_LANES.has(engine.balance.routingLane);

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > COGNITIVE_GOVERNANCE_MAX_DRIFT || engine.influence.governanceDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeCognitiveGovernanceReplayIntegrity({ preLinks, postLinks, signals: engine.signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeCognitiveGovernanceReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      signals: engine.signals,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeCognitiveGovernanceReplayIntegrity({
    preLinks,
    postLinks: finalPostLinks,
    signals: engine.signals,
  });

  const governanceWarnings: string[] = [];
  if (!isUnifiedCognitiveGovernanceEnvironmentAllowed()) governanceWarnings.push("production_governance_blocked");
  if (engine.governors.recursiveInfluenceSuppression) governanceWarnings.push("recursive_influence");
  if (engine.governors.equilibriumDriftRollback) governanceWarnings.push("equilibrium_drift");
  if (engine.balance.routingLane === "contradiction-check") governanceWarnings.push("contradiction_gate");

  const analytics = buildCognitiveGovernanceAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    detection: engine.detection,
    governors: engine.governors,
    contradictions: engine.contradictions,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildCognitiveGovernanceMonitoring({
    influence: engine.influence,
    replayIntegrity: finalReplayIntegrity,
    rollbackTriggered,
    balance: engine.balance,
    detection: engine.detection,
    governors: engine.governors,
    contradictions: engine.contradictions,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    signals: engine.signals,
    meta: {
      version: UNIFIED_COGNITIVE_GOVERNANCE_VERSION,
      governanceActive: isUnifiedCognitiveGovernanceEnabled() && isUnifiedCognitiveGovernanceEnvironmentAllowed(),
      governanceProfile: mode,
      governanceScore: engine.governanceScore,
      governanceDelta: engine.influence.governanceDelta,
      governanceConfidence: engine.balance.governanceConfidence,
      governanceIntegrityScore: engine.detection.governanceIntegrityScore,
      globalEquilibriumDriftDetected: engine.detection.globalEquilibriumDriftDetected,
      crossLayerContradictionDetected: engine.detection.crossLayerContradictionDetected,
      influenceInstabilityDetected: engine.detection.influenceInstabilityDetected,
      confidenceNormalizationRequired: engine.detection.confidenceNormalizationRequired,
      rankingEquilibriumRiskDetected: engine.detection.rankingEquilibriumRiskDetected,
      governanceContinuityRiskDetected: engine.detection.governanceContinuityRiskDetected,
      causalConsistencyFailureDetected: engine.detection.causalConsistencyFailureDetected,
      equilibriumDriftRollback: engine.governors.equilibriumDriftRollback,
      crossLayerInstabilityShutdown: engine.governors.crossLayerInstabilityShutdown,
      confidenceInflationSuppression: engine.governors.confidenceInflationSuppression,
      recursiveInfluenceSuppression: engine.governors.recursiveInfluenceSuppression,
      unstableGovernanceBlockade: engine.governors.unstableGovernanceBlockade,
      causalInconsistencyRollback: engine.governors.causalInconsistencyRollback,
      contradictionCascadeProtection: engine.governors.contradictionCascadeProtection,
      governanceContinuity: engine.signals.governanceContinuity,
      rankingEquilibriumProtection: engine.signals.rankingEquilibriumProtection,
      causalConsistencyValidation: engine.signals.causalConsistencyValidation,
      governanceSnapshotHash: engine.signals.governanceSnapshotHash,
      arbitrationExecutionHash: engine.signals.arbitrationExecutionHash,
      contradictionCount: engine.contradictions.contradictionCount,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      governanceWarnings: governanceWarnings.slice(0, 10),
      governanceAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      governanceExecutionHash: engine.signals.governanceExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicCognitiveGovernanceReplay };

export {
  isUnifiedCognitiveGovernanceEnabled,
  isUnifiedCognitiveGovernanceMutationEnabled,
  resolveUnifiedCognitiveGovernanceMode,
  isUnifiedCognitiveGovernanceEnvironmentAllowed,
} from "@/lib/cognitiveGovernance/cognitiveGovernanceFlags";

export { UNIFIED_COGNITIVE_GOVERNANCE_PROFILES } from "@/lib/cognitiveGovernance/cognitiveGovernanceProfiles";
