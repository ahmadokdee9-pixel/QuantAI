/**
 * P5.2 — Deterministic intelligence memory (contextual continuity; no personalization).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import {
  buildMemoryMonitoring,
  coordinateMemorySignals,
  type MemoryMonitoring,
} from "@/lib/intent/intentMemoryCoordinator";
import {
  INTENT_MEMORY_MAX_DRIFT,
  INTENT_MEMORY_VERSION,
  isIntentMemoryEnabled,
  isIntentMemoryEnvironmentAllowed,
  isIntentMemoryMutationEnabled,
  isIntentMemoryShadowMode,
  resolveIntentMemoryMode,
  type IntentMemoryMode,
} from "@/lib/intent/intentMemoryFlags";
import { resolveMemoryProfile } from "@/lib/intent/intentMemoryProfiles";
import {
  applyMemoryStabilizationRanking,
  computeMemoryStabilizationInfluence,
} from "@/lib/intent/intentMemoryStabilizer";
import {
  buildMemorySessionKey,
  buildMemorySnapshot,
  computeReplayMemoryIntegrity,
  getMemorySnapshot,
  reconstructRankingFromSnapshot,
  saveMemorySnapshot,
} from "./intentMemoryStore";
import type { QuantProduct } from "@/lib/shoppingScore";

export type IntentMemoryAnalytics = {
  continuityEffectiveness: number;
  replayReconstructionQuality: number;
  stabilityReinforcementMetrics: number;
  suppressionRecoveryAnalytics: number;
  trustStabilizationAnalytics: number;
  rankingContinuityAnalytics: number;
  driftPersistenceAnalytics: number;
  orchestrationMemoryInteraction: number;
  topDriftCount: number;
};

export type IntentMemoryMeta = {
  version: typeof INTENT_MEMORY_VERSION;
  memoryActive: boolean;
  memoryProfile: IntentMemoryMode;
  memoryScore: number;
  memoryDelta: number;
  continuityScore: number;
  stabilizationMemoryScore: number;
  trustMemory: number;
  suppressionMemory: number;
  diversityMemory: number;
  replayMemoryIntegrity: number;
  driftMemoryScore: number;
  memoryWarnings: string[];
  memoryAnomalies: string[];
  rollbackTriggered: boolean;
  analytics: IntentMemoryAnalytics;
  monitoring: MemoryMonitoring;
  mutationApplied: boolean;
  sessionKey: string;
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

function buildMemoryAnalytics(args: {
  influence: ReturnType<typeof computeMemoryStabilizationInfluence>;
  orchestration: IntentOrchestrationMeta;
  replayIntegrity: number;
  topDrift: number;
  rollbackTriggered: boolean;
}): IntentMemoryAnalytics {
  const { influence, orchestration, replayIntegrity, topDrift, rollbackTriggered } = args;
  return {
    continuityEffectiveness: influence.continuityScore,
    replayReconstructionQuality: replayIntegrity,
    stabilityReinforcementMetrics: influence.stabilizationMemoryScore,
    suppressionRecoveryAnalytics: clampScore(orchestration.analytics.suppressionRecoveryMetrics),
    trustStabilizationAnalytics: clampScore(orchestration.analytics.trustRiskReductionMetrics),
    rankingContinuityAnalytics: clampScore(100 - topDrift * 20),
    driftPersistenceAnalytics: influence.driftMemoryScore,
    orchestrationMemoryInteraction: clampScore(
      (orchestration.orchestrationScore + influence.stabilizationMemoryScore) / 2
    ),
    topDriftCount: topDrift,
  };
}

export type IntentMemoryApplyResult = {
  products: QuantProduct[];
  meta: IntentMemoryMeta;
};

export function applyControlledIntentMemory(args: {
  products: QuantProduct[];
  query: string;
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): IntentMemoryApplyResult {
  const started = Date.now();
  const {
    products,
    query,
    canonicalQuery,
    governance,
    calibration,
    runtime,
    orchestration,
    preOrderLinks,
    trayId,
  } = args;

  const mode = resolveIntentMemoryMode();
  const profile = resolveMemoryProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);
  const sessionKey = buildMemorySessionKey({
    query,
    trayId,
    category: canonicalQuery.category,
  });

  const emptyMonitoring = buildMemoryMonitoring({
    memoryDelta: 0,
    topDrift: 0,
    replayIntegrity: 0,
    rollbackTriggered: false,
    coordinated: {
      governanceDampen: 1,
      orchestrationStable: false,
      continuityAvailable: false,
      routingLane: "hold",
      coordinatedScore: 0,
    },
    profile,
  });

  const emptyAnalytics: IntentMemoryAnalytics = {
    continuityEffectiveness: 0,
    replayReconstructionQuality: 0,
    stabilityReinforcementMetrics: 0,
    suppressionRecoveryAnalytics: 0,
    trustStabilizationAnalytics: 0,
    rankingContinuityAnalytics: 0,
    driftPersistenceAnalytics: 0,
    orchestrationMemoryInteraction: 0,
    topDriftCount: 0,
  };

  if (!isIntentMemoryEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      meta: {
        version: INTENT_MEMORY_VERSION,
        memoryActive: false,
        memoryProfile: mode,
        memoryScore: 0,
        memoryDelta: 0,
        continuityScore: 0,
        stabilizationMemoryScore: 0,
        trustMemory: 0,
        suppressionMemory: 0,
        diversityMemory: 0,
        replayMemoryIntegrity: 0,
        driftMemoryScore: 0,
        memoryWarnings: ["memory_disabled"],
        memoryAnomalies: [],
        rollbackTriggered: false,
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        sessionKey,
        latencyMs: Date.now() - started,
      },
    };
  }

  const previous = getMemorySnapshot(sessionKey);
  const snapshot = buildMemorySnapshot({ sessionKey, products: baseline, orchestration, runtime });
  const coordinated = coordinateMemorySignals({
    governance,
    calibration,
    runtime,
    orchestration,
    previous,
    profile,
  });

  const reconstructed = reconstructRankingFromSnapshot({ products: baseline, snapshot, previous });
  const influence = computeMemoryStabilizationInfluence({
    products: baseline,
    snapshot,
    previous,
    coordinated,
    profile,
  });

  const projected = applyMemoryStabilizationRanking({
    products: baseline,
    influence,
    coordinated,
    profile,
    reconstructed,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);

  const replayIntegrity = computeReplayMemoryIntegrity({
    snapshot,
    previous,
    reconstructedLinks: projectedLinks,
  });

  const anomalies: string[] = [];
  if (profile.requiresGovernancePass && governance.anomalyDetected) anomalies.push("governance_gate");
  if (profile.requiresOrchestrationStable && !coordinated.orchestrationStable) anomalies.push("orchestration_unstable");
  if (influence.memoryDelta > profile.maxDelta) anomalies.push("delta_exceeded");
  if (projectedDrift > INTENT_MEMORY_MAX_DRIFT) anomalies.push("drift_escalation");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-memory" && (!coordinated.orchestrationStable || replayIntegrity < 70));

  const mutationAllowed =
    isIntentMemoryMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isIntentMemoryShadowMode(mode) &&
    coordinated.routingLane !== "hold";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > INTENT_MEMORY_MAX_DRIFT || influence.memoryDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  saveMemorySnapshot({ ...snapshot, savedAt: new Date(0).toISOString() });

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);

  const memoryWarnings: string[] = [];
  if (!isIntentMemoryEnvironmentAllowed()) memoryWarnings.push("production_memory_blocked");
  if (coordinated.routingLane === "stabilize") memoryWarnings.push("instability_dampening");
  if (!previous) memoryWarnings.push("cold_start_no_previous_snapshot");

  const memoryScore = clampScore(
    coordinated.coordinatedScore * 0.35 +
      influence.stabilizationMemoryScore * 0.35 +
      replayIntegrity * 0.15 +
      (100 - topDrift * 15) * 0.15
  );

  const analytics = buildMemoryAnalytics({
    influence,
    orchestration,
    replayIntegrity,
    topDrift,
    rollbackTriggered,
  });

  const monitoring = buildMemoryMonitoring({
    memoryDelta: influence.memoryDelta,
    topDrift,
    replayIntegrity,
    rollbackTriggered,
    coordinated,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    meta: {
      version: INTENT_MEMORY_VERSION,
      memoryActive: isIntentMemoryEnabled() && isIntentMemoryEnvironmentAllowed(),
      memoryProfile: mode,
      memoryScore,
      memoryDelta: influence.memoryDelta,
      continuityScore: influence.continuityScore,
      stabilizationMemoryScore: influence.stabilizationMemoryScore,
      trustMemory: influence.trustMemory,
      suppressionMemory: influence.suppressionMemory,
      diversityMemory: influence.diversityMemory,
      replayMemoryIntegrity: replayIntegrity,
      driftMemoryScore: influence.driftMemoryScore,
      memoryWarnings: memoryWarnings.slice(0, 10),
      memoryAnomalies: [...anomalies].slice(0, 8),
      rollbackTriggered,
      analytics,
      monitoring,
      mutationApplied,
      sessionKey,
      latencyMs: Date.now() - started,
    },
  };
}

export function validateDeterministicMemoryReplay(
  runA: IntentMemoryApplyResult,
  runB: IntentMemoryApplyResult
): boolean {
  const linksA = runA.products.map((p) => p.link || p.title).join("|");
  const linksB = runB.products.map((p) => p.link || p.title).join("|");
  if (linksA !== linksB) return false;
  const metaA = { ...runA.meta, latencyMs: 0 };
  const metaB = { ...runB.meta, latencyMs: 0 };
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}

export {
  isIntentMemoryEnabled,
  isIntentMemoryMutationEnabled,
  resolveIntentMemoryMode,
  isIntentMemoryEnvironmentAllowed,
} from "@/lib/intent/intentMemoryFlags";

export {
  buildMemorySessionKey,
  buildMemorySnapshot,
  clearIntentMemoryStore,
  computeReplayMemoryIntegrity,
  getMemorySnapshot,
  reconstructRankingFromSnapshot,
  saveMemorySnapshot,
} from "./intentMemoryStore";
