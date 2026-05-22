/**
 * P6.7 — Autonomous commerce reasoning graph (deterministic graph execution; no autonomous agents).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  isAutonomousCommerceReasoningGraphEnabled,
  isAutonomousCommerceReasoningGraphEnvironmentAllowed,
  isAutonomousCommerceReasoningGraphMutationEnabled,
  isAutonomousCommerceReasoningGraphShadowMode,
  AUTONOMOUS_COMMERCE_REASONING_GRAPH_VERSION,
  COMMERCE_REASONING_GRAPH_MAX_DRIFT,
  resolveAutonomousCommerceReasoningGraphMode,
} from "@/lib/commerceReasoningGraph/commerceReasoningGraphFlags";
import { resolveAutonomousCommerceReasoningGraphProfile } from "@/lib/commerceReasoningGraph/commerceReasoningGraphProfiles";
import { runCommerceReasoningGraphEngine } from "@/lib/commerceReasoningGraph/commerceReasoningGraphEngine";
import {
  applyCommerceReasoningGraphStabilizationRanking,
  computeCommerceReasoningGraphReplayIntegrity,
} from "@/lib/commerceReasoningGraph/commerceReasoningGraphRanking";
import { validateDeterministicCommerceReasoningGraphReplay } from "@/lib/commerceReasoningGraph/commerceReasoningGraphReplay";
import type { CommerceReasoningGraphSignalBundle } from "@/lib/commerceReasoningGraph/commerceReasoningGraphConfidence";
import {
  buildCommerceReasoningGraphAnalytics,
  buildCommerceReasoningGraphMonitoring,
  type AutonomousCommerceReasoningGraphAnalytics,
  type AutonomousCommerceReasoningGraphMeta,
  type AutonomousCommerceReasoningGraphMonitoring,
} from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { AutonomousCommerceReasoningGraphMeta, AutonomousCommerceReasoningGraphAnalytics, AutonomousCommerceReasoningGraphMonitoring };

export type AutonomousCommerceReasoningGraphApplyResult = {
  products: QuantProduct[];
  meta: AutonomousCommerceReasoningGraphMeta;
  signals: CommerceReasoningGraphSignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

const CHECK_LANES = new Set([
  "structure-check",
  "circular-check",
  "branch-check",
  "causal-check",
  "drift-check",
  "causality-check",
  "path-check",
]);

export function applyControlledAutonomousCommerceReasoningGraph(args: {
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
  preOrderLinks?: string[];
  trayId?: string;
}): AutonomousCommerceReasoningGraphApplyResult {
  const started = Date.now();
  const { products, governance, multiObjective, intent, strategic, memoryless, marketReality, commerceDecision, preOrderLinks } = args;

  const mode = resolveAutonomousCommerceReasoningGraphMode();
  const profile = resolveAutonomousCommerceReasoningGraphProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runCommerceReasoningGraphEngine({
    intent,
    multiObjective,
    strategic,
    memoryless,
    marketReality,
    commerceDecision,
    governance,
    profile,
  });

  const emptyAnalytics: AutonomousCommerceReasoningGraphAnalytics = {
    structureAnalytics: 0,
    circularAnalytics: 0,
    branchAnalytics: 0,
    causalAnalytics: 0,
    driftAnalytics: 0,
    causalityAnalytics: 0,
    pathAnalytics: 0,
    continuityAnalytics: 0,
    integrityAnalytics: 0,
    causalityFormationAnalytics: 0,
    harmonyAnalytics: 0,
    contradictionAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildCommerceReasoningGraphMonitoring({
    influence: {
      graphDelta: 0,
      pathInfluence: 0,
      causalInfluence: 0,
      circularDampening: 0,
      driftDampening: 0,
      continuityStabilization: 0,
      causalityStabilization: 0,
      graphReinforcement: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    detection: engine.detection,
    contradictions: engine.contradictions,
    profile,
  });

  if (!isAutonomousCommerceReasoningGraphEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      meta: {
        version: AUTONOMOUS_COMMERCE_REASONING_GRAPH_VERSION,
        graphActive: false,
        graphProfile: mode,
        graphScore: 0,
        graphDelta: 0,
        graphConfidence: engine.balance.graphConfidence,
        graphIntegrityScore: engine.detection.graphIntegrityScore,
        unstableReasoningStructureDetected: engine.detection.unstableReasoningStructureDetected,
        circularReasoningInfluenceDetected: engine.detection.circularReasoningInfluenceDetected,
        conflictingReasoningBranchDetected: engine.detection.conflictingReasoningBranchDetected,
        weakCausalRelationshipDetected: engine.detection.weakCausalRelationshipDetected,
        reasoningDriftEscalationDetected: engine.detection.reasoningDriftEscalationDetected,
        unstableRankingCausalityDetected: engine.detection.unstableRankingCausalityDetected,
        trustworthyReasoningContinuity: engine.signals.trustworthyReasoningContinuity,
        deterministicDecisionCausality: engine.signals.deterministicDecisionCausality,
        reasoningSnapshotHash: engine.signals.reasoningSnapshotHash,
        chainExecutionHash: engine.signals.chainExecutionHash,
        contradictionCount: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        graphWarnings: ["autonomous_commerce_reasoning_graph_disabled"],
        graphAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        graphExecutionHash: engine.signals.graphExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyCommerceReasoningGraphStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeCommerceReasoningGraphReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > COMMERCE_REASONING_GRAPH_MAX_DRIFT) anomalies.push("drift_escalation");
  if (engine.contradictions.contradictionCount >= 3) anomalies.push("contradiction_gate");
  if (strategic.rollbackTriggered || memoryless.rollbackTriggered || marketReality.rollbackTriggered || commerceDecision.rollbackTriggered) {
    anomalies.push("upstream_instability");
  }

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-graph" && (!engine.balance.decisionStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isAutonomousCommerceReasoningGraphMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isAutonomousCommerceReasoningGraphShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "replay-protect" &&
    !CHECK_LANES.has(engine.balance.routingLane);

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > COMMERCE_REASONING_GRAPH_MAX_DRIFT || engine.influence.graphDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeCommerceReasoningGraphReplayIntegrity({ preLinks, postLinks, signals: engine.signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeCommerceReasoningGraphReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      signals: engine.signals,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeCommerceReasoningGraphReplayIntegrity({
    preLinks,
    postLinks: finalPostLinks,
    signals: engine.signals,
  });

  const graphWarnings: string[] = [];
  if (!isAutonomousCommerceReasoningGraphEnvironmentAllowed()) graphWarnings.push("production_reasoning_graph_blocked");
  if (engine.detection.circularReasoningInfluenceDetected) graphWarnings.push("circular_reasoning");
  if (engine.detection.conflictingReasoningBranchDetected) graphWarnings.push("branch_conflict");
  if (engine.balance.routingLane === "drift-check") graphWarnings.push("drift_gate");

  const analytics = buildCommerceReasoningGraphAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    detection: engine.detection,
    contradictions: engine.contradictions,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildCommerceReasoningGraphMonitoring({
    influence: engine.influence,
    replayIntegrity: finalReplayIntegrity,
    rollbackTriggered,
    balance: engine.balance,
    detection: engine.detection,
    contradictions: engine.contradictions,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    signals: engine.signals,
    meta: {
      version: AUTONOMOUS_COMMERCE_REASONING_GRAPH_VERSION,
      graphActive: isAutonomousCommerceReasoningGraphEnabled() && isAutonomousCommerceReasoningGraphEnvironmentAllowed(),
      graphProfile: mode,
      graphScore: engine.graphScore,
      graphDelta: engine.influence.graphDelta,
      graphConfidence: engine.balance.graphConfidence,
      graphIntegrityScore: engine.detection.graphIntegrityScore,
      unstableReasoningStructureDetected: engine.detection.unstableReasoningStructureDetected,
      circularReasoningInfluenceDetected: engine.detection.circularReasoningInfluenceDetected,
      conflictingReasoningBranchDetected: engine.detection.conflictingReasoningBranchDetected,
      weakCausalRelationshipDetected: engine.detection.weakCausalRelationshipDetected,
      reasoningDriftEscalationDetected: engine.detection.reasoningDriftEscalationDetected,
      unstableRankingCausalityDetected: engine.detection.unstableRankingCausalityDetected,
      trustworthyReasoningContinuity: engine.signals.trustworthyReasoningContinuity,
      deterministicDecisionCausality: engine.signals.deterministicDecisionCausality,
      reasoningSnapshotHash: engine.signals.reasoningSnapshotHash,
      chainExecutionHash: engine.signals.chainExecutionHash,
      contradictionCount: engine.contradictions.contradictionCount,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      graphWarnings: graphWarnings.slice(0, 10),
      graphAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      graphExecutionHash: engine.signals.graphExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicCommerceReasoningGraphReplay };

export {
  isAutonomousCommerceReasoningGraphEnabled,
  isAutonomousCommerceReasoningGraphMutationEnabled,
  resolveAutonomousCommerceReasoningGraphMode,
  isAutonomousCommerceReasoningGraphEnvironmentAllowed,
} from "@/lib/commerceReasoningGraph/commerceReasoningGraphFlags";

export { AUTONOMOUS_COMMERCE_REASONING_GRAPH_PROFILES } from "@/lib/commerceReasoningGraph/commerceReasoningGraphProfiles";
