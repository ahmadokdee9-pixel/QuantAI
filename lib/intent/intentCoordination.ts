/**
 * P5.3 — Cross-intent intelligence coordination (deterministic; no personalization).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import { buildCommerceReasoningGraph, validateGraphExecutionReplay } from "@/lib/intent/intentCoordinationGraph";
import {
  INTENT_COORDINATION_MAX_DRIFT,
  INTENT_COORDINATION_VERSION,
  isIntentCoordinationEnabled,
  isIntentCoordinationEnvironmentAllowed,
  isIntentCoordinationMutationEnabled,
  isIntentCoordinationShadowMode,
  resolveIntentCoordinationMode,
  type IntentCoordinationMode,
} from "@/lib/intent/intentCoordinationFlags";
import { resolveCoordinationProfile } from "@/lib/intent/intentCoordinationProfiles";
import {
  applyCoordinationStabilizationRanking,
  computeCoordinationReplayIntegrity,
  computeCoordinationStabilizationInfluence,
} from "@/lib/intent/intentCoordinationStabilizer";
import { resolveIntentConflicts } from "@/lib/intent/intentConflictResolver";
import {
  buildCoordinationMonitoring,
  coordinateCrossIntentReasoning,
  type CoordinationMonitoring,
} from "@/lib/intent/intentReasoningCoordinator";
import {
  decomposeShoppingQuery,
  validateDeterministicDecomposition,
  type QueryDecomposition,
} from "@/lib/intent/intentQueryDecomposer";
import type { CommerceReasoningGraph } from "@/lib/intent/intentCoordinationGraph";
import type { QuantProduct } from "@/lib/shoppingScore";

export type IntentCoordinationAnalytics = {
  intentConflictAnalytics: number;
  decompositionQualityAnalytics: number;
  reasoningGraphAnalytics: number;
  coordinationStabilizationAnalytics: number;
  trustPropagationAnalytics: number;
  suppressionBalancingAnalytics: number;
  diversityPreservationAnalytics: number;
  routingEfficiencyAnalytics: number;
  commerceReasoningEffectiveness: number;
  topDriftCount: number;
};

export type IntentCoordinationMeta = {
  version: typeof INTENT_COORDINATION_VERSION;
  coordinationActive: boolean;
  coordinationProfile: IntentCoordinationMode;
  coordinationScore: number;
  coordinationDelta: number;
  decompositionScore: number;
  reasoningStability: number;
  trustPropagation: number;
  suppressionCoordination: number;
  diversityCoordination: number;
  graphIntegrity: number;
  coordinationReplayIntegrity: number;
  routingLane: string;
  coordinationWarnings: string[];
  coordinationAnomalies: string[];
  rollbackTriggered: boolean;
  analytics: IntentCoordinationAnalytics;
  monitoring: CoordinationMonitoring;
  mutationApplied: boolean;
  decompositionReplayHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function buildCoordinationAnalytics(args: {
  decomposition: QueryDecomposition;
  graph: CommerceReasoningGraph;
  influence: ReturnType<typeof computeCoordinationStabilizationInfluence>;
  coordinated: ReturnType<typeof coordinateCrossIntentReasoning>;
  conflict: ReturnType<typeof resolveIntentConflicts>;
  topDrift: number;
}): IntentCoordinationAnalytics {
  const { decomposition, graph, influence, coordinated, conflict, topDrift } = args;
  return {
    intentConflictAnalytics: clampScore(100 - conflict.conflictScore),
    decompositionQualityAnalytics: decomposition.decompositionScore,
    reasoningGraphAnalytics: graph.graphIntegrity,
    coordinationStabilizationAnalytics: coordinated.reasoningStability,
    trustPropagationAnalytics: clampScore(influence.trustPropagation * 100),
    suppressionBalancingAnalytics: clampScore(influence.suppressionCoordination * 100),
    diversityPreservationAnalytics: clampScore(influence.diversityCoordination * 100),
    routingEfficiencyAnalytics: clampScore(100 - topDrift * 20),
    commerceReasoningEffectiveness: clampScore(
      (coordinated.coordinatedScore + graph.graphIntegrity + decomposition.decompositionScore) / 3
    ),
    topDriftCount: topDrift,
  };
}

export type IntentCoordinationApplyResult = {
  products: QuantProduct[];
  meta: IntentCoordinationMeta;
  decomposition: QueryDecomposition;
  graph: CommerceReasoningGraph;
};

export function applyControlledIntentCoordination(args: {
  products: QuantProduct[];
  query: string;
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): IntentCoordinationApplyResult {
  const started = Date.now();
  const {
    products,
    query,
    canonicalQuery,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    preOrderLinks,
  } = args;

  const mode = resolveIntentCoordinationMode();
  const profile = resolveCoordinationProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const decomposition = decomposeShoppingQuery({ query, canonicalQuery });
  const graph = buildCommerceReasoningGraph({ decomposition, orchestration, memory, profile });
  const conflict = resolveIntentConflicts({ decomposition, graph });

  const emptyMonitoring = buildCoordinationMonitoring({
    coordinationDelta: 0,
    topDrift: 0,
    replayIntegrity: 0,
    rollbackTriggered: false,
    coordinated: {
      governanceDampen: 1,
      orchestrationStable: false,
      memoryStable: false,
      routingLane: "hold",
      reasoningStability: 0,
      coordinatedScore: 0,
    },
    graph,
    conflict,
    profile,
  });

  const emptyAnalytics: IntentCoordinationAnalytics = {
    intentConflictAnalytics: 0,
    decompositionQualityAnalytics: 0,
    reasoningGraphAnalytics: 0,
    coordinationStabilizationAnalytics: 0,
    trustPropagationAnalytics: 0,
    suppressionBalancingAnalytics: 0,
    diversityPreservationAnalytics: 0,
    routingEfficiencyAnalytics: 0,
    commerceReasoningEffectiveness: 0,
    topDriftCount: 0,
  };

  if (!isIntentCoordinationEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      decomposition,
      graph,
      meta: {
        version: INTENT_COORDINATION_VERSION,
        coordinationActive: false,
        coordinationProfile: mode,
        coordinationScore: 0,
        coordinationDelta: 0,
        decompositionScore: decomposition.decompositionScore,
        reasoningStability: 0,
        trustPropagation: 0,
        suppressionCoordination: 0,
        diversityCoordination: 0,
        graphIntegrity: graph.graphIntegrity,
        coordinationReplayIntegrity: 0,
        routingLane: "hold",
        coordinationWarnings: ["coordination_disabled"],
        coordinationAnomalies: [],
        rollbackTriggered: false,
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        decompositionReplayHash: decomposition.replayHash,
        graphExecutionHash: graph.executionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const coordinated = coordinateCrossIntentReasoning({
    decomposition,
    graph,
    conflict,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    profile,
  });

  const influence = computeCoordinationStabilizationInfluence({ graph, conflict, coordinated, profile });
  const projected = applyCoordinationStabilizationRanking({
    products: baseline,
    influence,
    coordinated,
    graph,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);

  const replayIntegrity = computeCoordinationReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    graph,
  });

  const anomalies: string[] = [];
  if (profile.requiresGovernancePass && governance.anomalyDetected) anomalies.push("governance_gate");
  if (profile.requiresOrchestrationStable && !coordinated.orchestrationStable) anomalies.push("orchestration_unstable");
  if (profile.requiresMemoryStable && !coordinated.memoryStable) anomalies.push("memory_unstable");
  if (influence.coordinationDelta > profile.maxDelta) anomalies.push("delta_exceeded");
  if (projectedDrift > INTENT_COORDINATION_MAX_DRIFT) anomalies.push("drift_escalation");
  if (conflict.escalationDetected) anomalies.push("conflict_escalation");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-coordination" &&
      (!coordinated.orchestrationStable || !coordinated.memoryStable || replayIntegrity < 70));

  const mutationAllowed =
    isIntentCoordinationMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isIntentCoordinationShadowMode(mode) &&
    coordinated.routingLane !== "hold" &&
    coordinated.routingLane !== "stabilize";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > INTENT_COORDINATION_MAX_DRIFT || influence.coordinationDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);

  const coordinationWarnings: string[] = [];
  if (!isIntentCoordinationEnvironmentAllowed()) coordinationWarnings.push("production_coordination_blocked");
  if (coordinated.routingLane === "conflict") coordinationWarnings.push("conflict_dampening");
  if (decomposition.expansionCount === 0) coordinationWarnings.push("no_intent_partitions");

  const coordinationScore = clampScore(
    coordinated.coordinatedScore * 0.35 +
      influence.coordinationDelta * 20 +
      replayIntegrity * 0.15 +
      graph.graphIntegrity * 0.15 +
      (100 - topDrift * 15) * 0.1
  );

  const analytics = buildCoordinationAnalytics({
    decomposition,
    graph,
    influence,
    coordinated,
    conflict,
    topDrift,
  });

  const monitoring = buildCoordinationMonitoring({
    coordinationDelta: influence.coordinationDelta,
    topDrift,
    replayIntegrity,
    rollbackTriggered,
    coordinated,
    graph,
    conflict,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    decomposition,
    graph,
    meta: {
      version: INTENT_COORDINATION_VERSION,
      coordinationActive: isIntentCoordinationEnabled() && isIntentCoordinationEnvironmentAllowed(),
      coordinationProfile: mode,
      coordinationScore,
      coordinationDelta: influence.coordinationDelta,
      decompositionScore: decomposition.decompositionScore,
      reasoningStability: coordinated.reasoningStability,
      trustPropagation: influence.trustPropagation,
      suppressionCoordination: influence.suppressionCoordination,
      diversityCoordination: influence.diversityCoordination,
      graphIntegrity: graph.graphIntegrity,
      coordinationReplayIntegrity: replayIntegrity,
      routingLane: coordinated.routingLane,
      coordinationWarnings: coordinationWarnings.slice(0, 10),
      coordinationAnomalies: [...anomalies].slice(0, 8),
      rollbackTriggered,
      analytics,
      monitoring,
      mutationApplied,
      decompositionReplayHash: decomposition.replayHash,
      graphExecutionHash: graph.executionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export function validateDeterministicCoordinationReplay(
  runA: IntentCoordinationApplyResult,
  runB: IntentCoordinationApplyResult
): boolean {
  const linksA = runA.products.map((p) => p.link || p.title).join("|");
  const linksB = runB.products.map((p) => p.link || p.title).join("|");
  if (linksA !== linksB) return false;
  if (!validateDeterministicDecomposition(runA.decomposition, runB.decomposition)) return false;
  if (!validateGraphExecutionReplay(runA.graph, runB.graph)) return false;
  const metaA = { ...runA.meta, latencyMs: 0 };
  const metaB = { ...runB.meta, latencyMs: 0 };
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}

export {
  isIntentCoordinationEnabled,
  isIntentCoordinationMutationEnabled,
  resolveIntentCoordinationMode,
  isIntentCoordinationEnvironmentAllowed,
} from "@/lib/intent/intentCoordinationFlags";

export { decomposeShoppingQuery, validateDeterministicDecomposition } from "@/lib/intent/intentQueryDecomposer";
export { buildCommerceReasoningGraph, validateGraphExecutionReplay } from "@/lib/intent/intentCoordinationGraph";
