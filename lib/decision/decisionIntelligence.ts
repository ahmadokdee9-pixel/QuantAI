/**
 * P5.6 — Commerce decision intelligence (deterministic bounded purchase synthesis; no personalization).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import {
  DECISION_INTELLIGENCE_VERSION,
  DECISION_MAX_DRIFT,
  isDecisionIntelligenceEnabled,
  isDecisionIntelligenceEnvironmentAllowed,
  isDecisionIntelligenceMutationEnabled,
  isDecisionIntelligenceShadowMode,
  resolveDecisionIntelligenceMode,
  type DecisionIntelligenceMode,
} from "@/lib/decision/decisionFlags";
import { resolveDecisionProfile } from "@/lib/decision/decisionProfiles";
import { runDecisionEngine } from "@/lib/decision/decisionEngine";
import {
  applyDecisionStabilizationRanking,
  computeDecisionReplayIntegrity,
} from "@/lib/decision/decisionStabilizer";
import { validateDeterministicDecisionReplay } from "@/lib/decision/decisionReplay";
import type { CommerceDecisionGraph } from "@/lib/decision/decisionGraph";
import {
  buildDecisionAnalytics,
  buildDecisionMonitoring,
  type DecisionIntelligenceAnalytics,
  type DecisionIntelligenceMeta,
  type DecisionMonitoring,
} from "@/lib/decision/decisionTelemetry";
import type { DecisionSignalBundle } from "@/lib/decision/decisionSignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { DecisionIntelligenceMeta, DecisionIntelligenceAnalytics, DecisionMonitoring };

export type DecisionIntelligenceApplyResult = {
  products: QuantProduct[];
  meta: DecisionIntelligenceMeta;
  signals: DecisionSignalBundle;
  graph: CommerceDecisionGraph;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledDecisionIntelligence(args: {
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
  reasoning: AdaptiveReasoningMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): DecisionIntelligenceApplyResult {
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
    reasoning,
    preOrderLinks,
  } = args;

  const mode = resolveDecisionIntelligenceMode();
  const profile = resolveDecisionProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runDecisionEngine({
    products: baseline,
    canonicalQuery,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    fusion,
    reasoning,
    profile,
  });

  const emptyAnalytics: DecisionIntelligenceAnalytics = {
    purchaseQualityAnalytics: 0,
    recommendationQualityAnalytics: 0,
    trustValueAnalytics: 0,
    premiumBudgetAnalytics: 0,
    comparisonIntelligenceAnalytics: 0,
    deliveryConfidenceAnalytics: 0,
    merchantReliabilityAnalytics: 0,
    decisionDriftAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildDecisionMonitoring({
    influence: {
      decisionDelta: 0,
      trustDecision: 0,
      valueDecision: 0,
      premiumDecision: 0,
      qualityDecision: 0,
      budgetDecision: 0,
      comparisonDecision: 0,
      merchantDecision: 0,
      deliveryDecision: 0,
      continuityStrength: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    signals: engine.signals,
    topDrift: 0,
    profile,
  });

  if (!isDecisionIntelligenceEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      graph: engine.graph,
      meta: {
        version: DECISION_INTELLIGENCE_VERSION,
        decisionActive: false,
        decisionProfile: mode,
        decisionScore: 0,
        decisionDelta: 0,
        decisionConfidence: engine.balance.decisionConfidence,
        trustDecision: 0,
        valueDecision: 0,
        premiumDecision: 0,
        qualityDecision: 0,
        budgetDecision: 0,
        comparisonDecision: 0,
        merchantDecision: 0,
        deliveryDecision: 0,
        replayIntegrity: 0,
        continuityStrength: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        decisionWarnings: ["decision_disabled"],
        decisionAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        graphExecutionHash: engine.graph.executionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyDecisionStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeDecisionReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > DECISION_MAX_DRIFT) anomalies.push("drift_escalation");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-decision" &&
      (!engine.balance.reasoningStable || !engine.balance.fusionStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isDecisionIntelligenceMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isDecisionIntelligenceShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "confidence-check" &&
    engine.balance.routingLane !== "replay-protect" &&
    engine.balance.routingLane !== "risk-check";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > DECISION_MAX_DRIFT || engine.influence.decisionDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  const replayIntegrity = computeDecisionReplayIntegrity({
    preLinks,
    postLinks,
    signals: engine.signals,
  });

  const decisionWarnings: string[] = [];
  if (!isDecisionIntelligenceEnvironmentAllowed()) decisionWarnings.push("production_decision_blocked");
  if (engine.balance.routingLane === "confidence-check") decisionWarnings.push("confidence_gate");
  if (engine.balance.routingLane === "risk-check") decisionWarnings.push("merchant_risk_gate");

  const analytics = buildDecisionAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    balance: engine.balance,
    replayIntegrity,
    topDrift,
  });

  const monitoring = buildDecisionMonitoring({
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
      version: DECISION_INTELLIGENCE_VERSION,
      decisionActive: isDecisionIntelligenceEnabled() && isDecisionIntelligenceEnvironmentAllowed(),
      decisionProfile: mode,
      decisionScore: engine.decisionScore,
      decisionDelta: engine.influence.decisionDelta,
      decisionConfidence: engine.balance.decisionConfidence,
      trustDecision: engine.influence.trustDecision,
      valueDecision: engine.influence.valueDecision,
      premiumDecision: engine.influence.premiumDecision,
      qualityDecision: engine.influence.qualityDecision,
      budgetDecision: engine.influence.budgetDecision,
      comparisonDecision: engine.influence.comparisonDecision,
      merchantDecision: engine.influence.merchantDecision,
      deliveryDecision: engine.influence.deliveryDecision,
      replayIntegrity,
      continuityStrength: engine.influence.continuityStrength,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      decisionWarnings: decisionWarnings.slice(0, 10),
      decisionAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      graphExecutionHash: engine.graph.executionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicDecisionReplay };

export {
  isDecisionIntelligenceEnabled,
  isDecisionIntelligenceMutationEnabled,
  resolveDecisionIntelligenceMode,
  isDecisionIntelligenceEnvironmentAllowed,
} from "@/lib/decision/decisionFlags";

export { DECISION_PROFILES } from "@/lib/decision/decisionProfiles";
export { validateDecisionGraphReplay } from "@/lib/decision/decisionGraph";
