/**
 * P5.5 — Adaptive commerce reasoning (deterministic bounded chains; no personalization).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import {
  ADAPTIVE_REASONING_VERSION,
  REASONING_MAX_DRIFT,
  isAdaptiveReasoningEnabled,
  isAdaptiveReasoningEnvironmentAllowed,
  isAdaptiveReasoningMutationEnabled,
  isAdaptiveReasoningShadowMode,
  resolveAdaptiveReasoningMode,
  type AdaptiveReasoningMode,
} from "@/lib/reasoning/reasoningFlags";
import { resolveReasoningProfile } from "@/lib/reasoning/reasoningProfiles";
import { runReasoningEngine } from "@/lib/reasoning/reasoningEngine";
import {
  applyReasoningStabilizationRanking,
  computeReasoningReplayIntegrity,
} from "@/lib/reasoning/reasoningStabilizer";
import { validateDeterministicReasoningReplay } from "@/lib/reasoning/reasoningReplay";
import type { CommerceReasoningGraph } from "@/lib/reasoning/reasoningGraph";
import {
  buildReasoningAnalytics,
  buildReasoningMonitoring,
  type AdaptiveReasoningAnalytics,
  type AdaptiveReasoningMeta,
  type ReasoningMonitoring,
} from "@/lib/reasoning/reasoningTelemetry";
import type { ReasoningSignalBundle } from "@/lib/reasoning/reasoningSignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { AdaptiveReasoningMeta, AdaptiveReasoningAnalytics, ReasoningMonitoring };

export type AdaptiveReasoningApplyResult = {
  products: QuantProduct[];
  meta: AdaptiveReasoningMeta;
  signals: ReasoningSignalBundle;
  graph: CommerceReasoningGraph;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledAdaptiveReasoning(args: {
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
  preOrderLinks?: string[];
  trayId?: string;
}): AdaptiveReasoningApplyResult {
  const started = Date.now();
  const {
    products,
    canonicalQuery,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    fusion,
    preOrderLinks,
  } = args;

  const mode = resolveAdaptiveReasoningMode();
  const profile = resolveReasoningProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runReasoningEngine({
    products: baseline,
    canonicalQuery,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    fusion,
    profile,
  });

  const emptyAnalytics: AdaptiveReasoningAnalytics = {
    reasoningConfidenceAnalytics: 0,
    comparisonIntelligenceAnalytics: 0,
    recommendationQualityAnalytics: 0,
    rankingContinuityAnalytics: 0,
    trustValueAnalytics: 0,
    premiumBudgetAnalytics: 0,
    reasoningDriftAnalytics: 0,
    commerceStabilityAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildReasoningMonitoring({
    influence: {
      reasoningDelta: 0,
      trustReasoning: 0,
      valueReasoning: 0,
      premiumReasoning: 0,
      qualityReasoning: 0,
      urgencyReasoning: 0,
      recommendationReasoning: 0,
      comparisonReasoning: 0,
      continuityStrength: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    signals: engine.signals,
    topDrift: 0,
    profile,
  });

  if (!isAdaptiveReasoningEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      graph: engine.graph,
      meta: {
        version: ADAPTIVE_REASONING_VERSION,
        reasoningActive: false,
        reasoningProfile: mode,
        reasoningScore: 0,
        reasoningDelta: 0,
        reasoningConfidence: engine.signals.reasoningConfidence,
        trustReasoning: 0,
        valueReasoning: 0,
        premiumReasoning: 0,
        qualityReasoning: 0,
        urgencyReasoning: 0,
        recommendationReasoning: 0,
        comparisonReasoning: 0,
        replayIntegrity: 0,
        continuityStrength: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        reasoningWarnings: ["reasoning_disabled"],
        reasoningAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        graphExecutionHash: engine.graph.executionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyReasoningStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeReasoningReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > REASONING_MAX_DRIFT) anomalies.push("drift_escalation");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-reasoning" &&
      (!engine.balance.coordinationStable ||
        !engine.balance.fusionStable ||
        projectedReplayIntegrity < 70));

  const mutationAllowed =
    isAdaptiveReasoningMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isAdaptiveReasoningShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "confidence-check" &&
    engine.balance.routingLane !== "replay-protect";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > REASONING_MAX_DRIFT || engine.influence.reasoningDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  const replayIntegrity = computeReasoningReplayIntegrity({
    preLinks,
    postLinks,
    signals: engine.signals,
  });

  const reasoningWarnings: string[] = [];
  if (!isAdaptiveReasoningEnvironmentAllowed()) reasoningWarnings.push("production_reasoning_blocked");
  if (engine.balance.routingLane === "confidence-check") reasoningWarnings.push("confidence_gate");
  if (engine.balance.routingLane === "replay-protect") reasoningWarnings.push("replay_protection");

  const analytics = buildReasoningAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    balance: engine.balance,
    replayIntegrity,
    topDrift,
  });

  const monitoring = buildReasoningMonitoring({
    influence: engine.influence,
    replayIntegrity,
    rollbackTriggered,
    balance: engine.balance,
    signals: engine.signals,
    topDrift,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    signals: engine.signals,
    graph: engine.graph,
    meta: {
      version: ADAPTIVE_REASONING_VERSION,
      reasoningActive: isAdaptiveReasoningEnabled() && isAdaptiveReasoningEnvironmentAllowed(),
      reasoningProfile: mode,
      reasoningScore: engine.reasoningScore,
      reasoningDelta: engine.influence.reasoningDelta,
      reasoningConfidence: engine.signals.reasoningConfidence,
      trustReasoning: engine.influence.trustReasoning,
      valueReasoning: engine.influence.valueReasoning,
      premiumReasoning: engine.influence.premiumReasoning,
      qualityReasoning: engine.influence.qualityReasoning,
      urgencyReasoning: engine.influence.urgencyReasoning,
      recommendationReasoning: engine.influence.recommendationReasoning,
      comparisonReasoning: engine.influence.comparisonReasoning,
      replayIntegrity,
      continuityStrength: engine.influence.continuityStrength,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      reasoningWarnings: reasoningWarnings.slice(0, 10),
      reasoningAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      graphExecutionHash: engine.graph.executionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicReasoningReplay };

export {
  isAdaptiveReasoningEnabled,
  isAdaptiveReasoningMutationEnabled,
  resolveAdaptiveReasoningMode,
  isAdaptiveReasoningEnvironmentAllowed,
} from "@/lib/reasoning/reasoningFlags";

export { REASONING_PROFILES } from "@/lib/reasoning/reasoningProfiles";
export { validateReasoningGraphReplay } from "@/lib/reasoning/reasoningGraph";
