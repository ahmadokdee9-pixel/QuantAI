/**
 * P6.4 — Memoryless commerce learning intelligence (aggregate telemetry only; no user memory).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  isMemorylessCommerceLearningEnabled,
  isMemorylessCommerceLearningEnvironmentAllowed,
  isMemorylessCommerceLearningMutationEnabled,
  isMemorylessCommerceLearningShadowMode,
  MEMORYLESS_COMMERCE_LEARNING_VERSION,
  MEMORYLESS_LEARNING_MAX_DRIFT,
  resolveMemorylessCommerceLearningMode,
} from "@/lib/memorylessLearning/memorylessLearningFlags";
import { resolveMemorylessCommerceLearningProfile } from "@/lib/memorylessLearning/memorylessLearningProfiles";
import { runMemorylessLearningEngine } from "@/lib/memorylessLearning/memorylessLearningEngine";
import {
  applyMemorylessLearningStabilizationRanking,
  computeMemorylessLearningReplayIntegrity,
} from "@/lib/memorylessLearning/memorylessLearningRanking";
import { validateDeterministicMemorylessLearningReplay } from "@/lib/memorylessLearning/memorylessLearningReplay";
import type { MemorylessLearningSignalBundle } from "@/lib/memorylessLearning/memorylessLearningConfidence";
import {
  buildMemorylessLearningAnalytics,
  buildMemorylessLearningMonitoring,
  type MemorylessCommerceLearningAnalytics,
  type MemorylessCommerceLearningMeta,
  type MemorylessCommerceLearningMonitoring,
} from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { MemorylessCommerceLearningMeta, MemorylessCommerceLearningAnalytics, MemorylessCommerceLearningMonitoring };

export type MemorylessCommerceLearningApplyResult = {
  products: QuantProduct[];
  meta: MemorylessCommerceLearningMeta;
  signals: MemorylessLearningSignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledMemorylessCommerceLearning(args: {
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
  preOrderLinks?: string[];
  trayId?: string;
}): MemorylessCommerceLearningApplyResult {
  const started = Date.now();
  const { products, governance, multiObjective, intent, strategic, preOrderLinks } = args;

  const mode = resolveMemorylessCommerceLearningMode();
  const profile = resolveMemorylessCommerceLearningProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runMemorylessLearningEngine({ intent, multiObjective, strategic, governance, profile });

  const emptyAnalytics: MemorylessCommerceLearningAnalytics = {
    driftAnalytics: 0,
    fatigueAnalytics: 0,
    confidenceAnalytics: 0,
    oscillationAnalytics: 0,
    trustAnalytics: 0,
    conversionAnalytics: 0,
    continuityAnalytics: 0,
    stabilityAnalytics: 0,
    harmonyAnalytics: 0,
    contradictionAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildMemorylessLearningMonitoring({
    influence: {
      learningDelta: 0,
      continuityInfluence: 0,
      stabilizationInfluence: 0,
      driftDampening: 0,
      fatigueDampening: 0,
      trustStabilization: 0,
      conversionStabilization: 0,
      integrityReinforcement: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    detection: engine.detection,
    contradictions: engine.contradictions,
    topDrift: 0,
    profile,
  });

  if (!isMemorylessCommerceLearningEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      meta: {
        version: MEMORYLESS_COMMERCE_LEARNING_VERSION,
        learningActive: false,
        learningProfile: mode,
        learningScore: 0,
        learningDelta: 0,
        learningConfidence: engine.balance.learningConfidence,
        rankingDriftDetected: engine.detection.rankingDriftDetected,
        signalFatigueDetected: engine.detection.signalFatigueDetected,
        lowConfidencePatternDetected: engine.detection.lowConfidencePatternDetected,
        strategicOscillationDetected: engine.detection.strategicOscillationDetected,
        trustDegradationDetected: engine.detection.trustDegradationDetected,
        conversionInstabilityDetected: engine.detection.conversionInstabilityDetected,
        rankingDriftScore: engine.detection.rankingDriftScore,
        signalFatigueScore: engine.detection.signalFatigueScore,
        continuityReinforcement: engine.signals.continuityReinforcement,
        contradictionCount: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        learningWarnings: ["memoryless_commerce_learning_disabled"],
        learningAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        graphExecutionHash: engine.signals.graphExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyMemorylessLearningStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeMemorylessLearningReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > MEMORYLESS_LEARNING_MAX_DRIFT) anomalies.push("drift_escalation");
  if (engine.contradictions.contradictionCount >= 3) anomalies.push("contradiction_gate");
  if (strategic.rollbackTriggered || multiObjective.rollbackTriggered || intent.rollbackTriggered) {
    anomalies.push("upstream_instability");
  }

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-learning" && (!engine.balance.strategicStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isMemorylessCommerceLearningMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isMemorylessCommerceLearningShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "replay-protect" &&
    engine.balance.routingLane !== "drift-check" &&
    engine.balance.routingLane !== "fatigue-check" &&
    engine.balance.routingLane !== "confidence-check" &&
    engine.balance.routingLane !== "oscillation-check" &&
    engine.balance.routingLane !== "trust-check" &&
    engine.balance.routingLane !== "conversion-check";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > MEMORYLESS_LEARNING_MAX_DRIFT || engine.influence.learningDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeMemorylessLearningReplayIntegrity({ preLinks, postLinks, signals: engine.signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeMemorylessLearningReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      signals: engine.signals,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeMemorylessLearningReplayIntegrity({
    preLinks,
    postLinks: finalPostLinks,
    signals: engine.signals,
  });

  const learningWarnings: string[] = [];
  if (!isMemorylessCommerceLearningEnvironmentAllowed()) learningWarnings.push("production_memoryless_learning_blocked");
  if (engine.detection.rankingDriftDetected) learningWarnings.push("ranking_drift");
  if (engine.detection.signalFatigueDetected) learningWarnings.push("signal_fatigue");
  if (engine.balance.routingLane === "oscillation-check") learningWarnings.push("oscillation_gate");

  const analytics = buildMemorylessLearningAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    detection: engine.detection,
    contradictions: engine.contradictions,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildMemorylessLearningMonitoring({
    influence: engine.influence,
    replayIntegrity: finalReplayIntegrity,
    rollbackTriggered,
    balance: engine.balance,
    detection: engine.detection,
    contradictions: engine.contradictions,
    topDrift,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    signals: engine.signals,
    meta: {
      version: MEMORYLESS_COMMERCE_LEARNING_VERSION,
      learningActive: isMemorylessCommerceLearningEnabled() && isMemorylessCommerceLearningEnvironmentAllowed(),
      learningProfile: mode,
      learningScore: engine.learningScore,
      learningDelta: engine.influence.learningDelta,
      learningConfidence: engine.balance.learningConfidence,
      rankingDriftDetected: engine.detection.rankingDriftDetected,
      signalFatigueDetected: engine.detection.signalFatigueDetected,
      lowConfidencePatternDetected: engine.detection.lowConfidencePatternDetected,
      strategicOscillationDetected: engine.detection.strategicOscillationDetected,
      trustDegradationDetected: engine.detection.trustDegradationDetected,
      conversionInstabilityDetected: engine.detection.conversionInstabilityDetected,
      rankingDriftScore: engine.detection.rankingDriftScore,
      signalFatigueScore: engine.detection.signalFatigueScore,
      continuityReinforcement: engine.signals.continuityReinforcement,
      contradictionCount: engine.contradictions.contradictionCount,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      learningWarnings: learningWarnings.slice(0, 10),
      learningAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      graphExecutionHash: engine.signals.graphExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicMemorylessLearningReplay };

export {
  isMemorylessCommerceLearningEnabled,
  isMemorylessCommerceLearningMutationEnabled,
  resolveMemorylessCommerceLearningMode,
  isMemorylessCommerceLearningEnvironmentAllowed,
} from "@/lib/memorylessLearning/memorylessLearningFlags";

export { MEMORYLESS_COMMERCE_LEARNING_PROFILES } from "@/lib/memorylessLearning/memorylessLearningProfiles";
