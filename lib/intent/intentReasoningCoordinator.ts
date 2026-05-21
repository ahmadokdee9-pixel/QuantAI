/**
 * P5.3 — Cross-intent reasoning coordinator (orchestration-memory bridge).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { CommerceReasoningGraph } from "@/lib/intent/intentCoordinationGraph";
import type { IntentCoordinationProfile } from "@/lib/intent/intentCoordinationProfiles";
import type { ConflictResolution } from "@/lib/intent/intentConflictResolver";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { QueryDecomposition } from "@/lib/intent/intentQueryDecomposer";

export type ReasoningCoordinationResult = {
  governanceDampen: number;
  orchestrationStable: boolean;
  memoryStable: boolean;
  routingLane: "hold" | "primary" | "secondary" | "conflict" | "reinforce" | "stabilize";
  reasoningStability: number;
  coordinatedScore: number;
};

export type CoordinationMonitoring = {
  coordinationInstability: boolean;
  reasoningGraphValid: boolean;
  decompositionValid: boolean;
  conflictEscalation: boolean;
  replayValid: boolean;
  coordinationInflation: boolean;
  routingDrift: boolean;
  graphIntegrityValid: boolean;
};

export function coordinateCrossIntentReasoning(args: {
  decomposition: QueryDecomposition;
  graph: CommerceReasoningGraph;
  conflict: ConflictResolution;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  profile: IntentCoordinationProfile;
}): ReasoningCoordinationResult {
  const { decomposition, graph, conflict, governance, calibration, runtime, orchestration, memory, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const orchestrationStable =
    !orchestration.monitoring.orchestrationInstability &&
    !orchestration.rollbackTriggered &&
    orchestration.stabilizationScore >= 50;
  const memoryStable = !memory.rollbackTriggered && memory.replayMemoryIntegrity >= 50;

  let routingLane: ReasoningCoordinationResult["routingLane"] = decomposition.routingLane;
  if (!profile.allowsMutation || runtime.emergencyShutdown) routingLane = "hold";
  else if (!orchestrationStable) routingLane = "stabilize";
  else if (conflict.escalationDetected) routingLane = "conflict";

  const reasoningStability = Math.min(
    100,
    Math.round(
      graph.graphIntegrity * 0.35 +
        decomposition.decompositionScore * 0.25 +
        (100 - conflict.conflictScore) * 0.2 +
        memory.continuityScore * 0.1 +
        orchestration.stabilizationScore * 0.1
    )
  );

  const coordinatedScore = Math.min(
    100,
    Math.round(
      orchestration.orchestrationScore * 0.25 +
        memory.memoryScore * 0.2 +
        calibration.calibrationScore * 0.15 +
        governance.governanceScore * 0.1 +
        graph.graphIntegrity * 0.15 +
        reasoningStability * 0.15
    )
  );

  return {
    governanceDampen,
    orchestrationStable,
    memoryStable,
    routingLane,
    reasoningStability,
    coordinatedScore,
  };
}

export function buildCoordinationMonitoring(args: {
  coordinationDelta: number;
  topDrift: number;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  coordinated: ReasoningCoordinationResult;
  graph: CommerceReasoningGraph;
  conflict: ConflictResolution;
  profile: IntentCoordinationProfile;
}): CoordinationMonitoring {
  const { coordinationDelta, topDrift, replayIntegrity, rollbackTriggered, coordinated, graph, conflict, profile } =
    args;
  return {
    coordinationInstability: rollbackTriggered || !coordinated.orchestrationStable,
    reasoningGraphValid: graph.graphIntegrity >= 50,
    decompositionValid: coordinated.reasoningStability >= 40,
    conflictEscalation: conflict.escalationDetected,
    replayValid: replayIntegrity >= 70,
    coordinationInflation: coordinationDelta > profile.maxDelta,
    routingDrift: topDrift > profile.maxDelta,
    graphIntegrityValid: graph.graphIntegrity >= 60 && graph.nodes.length > 0,
  };
}
