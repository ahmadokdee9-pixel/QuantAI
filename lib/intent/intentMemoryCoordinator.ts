/**
 * P5.2 — Memory coordination with orchestration/runtime snapshots.
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentMemoryProfile } from "@/lib/intent/intentMemoryProfiles";
import type { IntentMemorySnapshot } from "@/lib/intent/intentMemoryStore";

export type MemoryCoordinationResult = {
  governanceDampen: number;
  orchestrationStable: boolean;
  continuityAvailable: boolean;
  routingLane: "hold" | "reinforce" | "stabilize" | "recover";
  coordinatedScore: number;
};

export function coordinateMemorySignals(args: {
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  previous: IntentMemorySnapshot | null;
  profile: IntentMemoryProfile;
}): MemoryCoordinationResult {
  const { governance, calibration, runtime, orchestration, previous, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const orchestrationStable =
    !orchestration.monitoring.orchestrationInstability &&
    !orchestration.rollbackTriggered &&
    orchestration.stabilizationScore >= 50;
  const continuityAvailable = previous != null && previous.topLinks.length > 0;

  let routingLane: MemoryCoordinationResult["routingLane"] = "reinforce";
  if (!profile.allowsMutation || runtime.emergencyShutdown) routingLane = "hold";
  else if (!orchestrationStable) routingLane = "stabilize";
  else if (orchestration.monitoring.suppressionImbalance) routingLane = "recover";
  else if (continuityAvailable) routingLane = "reinforce";

  const coordinatedScore = Math.min(
    100,
    Math.round(
      orchestration.orchestrationScore * 0.3 +
        calibration.calibrationScore * 0.2 +
        runtime.runtimeScore * 0.2 +
        governance.governanceScore * 0.15 +
        (continuityAvailable ? 15 : 5)
    )
  );

  return {
    governanceDampen,
    orchestrationStable,
    continuityAvailable,
    routingLane,
    coordinatedScore,
  };
}

export type MemoryMonitoring = {
  memoryInstability: boolean;
  replayReconstructionValid: boolean;
  continuityDrift: boolean;
  memoryInflation: boolean;
  suppressionRecoveryValid: boolean;
  trustPersistenceValid: boolean;
  deterministicRebuildValid: boolean;
};

export function buildMemoryMonitoring(args: {
  memoryDelta: number;
  topDrift: number;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  coordinated: MemoryCoordinationResult;
  profile: IntentMemoryProfile;
}): MemoryMonitoring {
  const { memoryDelta, topDrift, replayIntegrity, rollbackTriggered, coordinated, profile } = args;
  return {
    memoryInstability: rollbackTriggered || !coordinated.orchestrationStable,
    replayReconstructionValid: replayIntegrity >= 70,
    continuityDrift: topDrift > profile.maxDelta,
    memoryInflation: memoryDelta > profile.maxDelta,
    suppressionRecoveryValid: coordinated.routingLane !== "recover" || memoryDelta <= profile.maxSuppressionRecovery,
    trustPersistenceValid: memoryDelta <= profile.maxTrustReinforcement * 1.5,
    deterministicRebuildValid: replayIntegrity >= 60 && !rollbackTriggered,
  };
}
