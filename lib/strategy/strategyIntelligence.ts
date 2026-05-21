/**
 * P5.7 — Strategic commerce intelligence (deterministic bounded ranking synthesis; no personalization).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import {
  STRATEGY_INTELLIGENCE_VERSION,
  STRATEGY_MAX_DRIFT,
  isStrategyIntelligenceEnabled,
  isStrategyIntelligenceEnvironmentAllowed,
  isStrategyIntelligenceMutationEnabled,
  isStrategyIntelligenceShadowMode,
  resolveStrategyIntelligenceMode,
  type StrategyIntelligenceMode,
} from "@/lib/strategy/strategyFlags";
import { resolveStrategyProfile } from "@/lib/strategy/strategyProfiles";
import { runStrategyEngine } from "@/lib/strategy/strategyEngine";
import {
  applyStrategyStabilizationRanking,
  computeStrategyReplayIntegrity,
} from "@/lib/strategy/strategyRanking";
import { validateDeterministicStrategyReplay } from "@/lib/strategy/strategyReplay";
import type { StrategicCommerceGraph } from "@/lib/strategy/strategyGraph";
import {
  buildStrategyAnalytics,
  buildStrategyMonitoring,
  type StrategyIntelligenceAnalytics,
  type StrategyIntelligenceMeta,
  type StrategyMonitoring,
} from "@/lib/strategy/strategyTelemetry";
import type { StrategySignalBundle } from "@/lib/strategy/strategySignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { StrategyIntelligenceMeta, StrategyIntelligenceAnalytics, StrategyMonitoring };

export type StrategyIntelligenceApplyResult = {
  products: QuantProduct[];
  meta: StrategyIntelligenceMeta;
  signals: StrategySignalBundle;
  graph: StrategicCommerceGraph;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledStrategyIntelligence(args: {
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
  decision: DecisionIntelligenceMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): StrategyIntelligenceApplyResult {
  const started = Date.now();
  const {
    products,
    canonicalQuery,
    governance,
    calibration,
    orchestration,
    memory,
    fusion,
    reasoning,
    decision,
    preOrderLinks,
  } = args;

  const mode = resolveStrategyIntelligenceMode();
  const profile = resolveStrategyProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runStrategyEngine({
    products: baseline,
    canonicalQuery,
    governance,
    calibration,
    orchestration,
    memory,
    fusion,
    reasoning,
    decision,
    profile,
  });

  const emptyAnalytics: StrategyIntelligenceAnalytics = {
    conversionAnalytics: 0,
    recommendationAnalytics: 0,
    strategicTrustValueAnalytics: 0,
    categoryDominanceAnalytics: 0,
    comparisonIntelligenceAnalytics: 0,
    merchantPositioningAnalytics: 0,
    momentumAnalytics: 0,
    rankingContinuityAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildStrategyMonitoring({
    influence: {
      strategyDelta: 0,
      strategicTrust: 0,
      strategicValue: 0,
      premiumPositioning: 0,
      categoryDominance: 0,
      recommendationHierarchy: 0,
      comparisonIntelligence: 0,
      merchantStrength: 0,
      momentumConfidence: 0,
      continuityStrength: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    signals: engine.signals,
    topDrift: 0,
    profile,
  });

  if (!isStrategyIntelligenceEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      graph: engine.graph,
      meta: {
        version: STRATEGY_INTELLIGENCE_VERSION,
        strategyActive: false,
        strategyProfile: mode,
        strategyScore: 0,
        strategyDelta: 0,
        strategyConfidence: engine.balance.strategyConfidence,
        conversionConfidence: 0,
        strategicTrust: 0,
        strategicValue: 0,
        premiumPositioning: 0,
        categoryDominance: 0,
        recommendationHierarchy: 0,
        comparisonIntelligence: 0,
        merchantStrength: 0,
        momentumConfidence: 0,
        replayIntegrity: 0,
        continuityStrength: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        strategyWarnings: ["strategy_disabled"],
        strategyAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        graphExecutionHash: engine.graph.executionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyStrategyStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeStrategyReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > STRATEGY_MAX_DRIFT) anomalies.push("drift_escalation");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-strategy" &&
      (!engine.balance.reasoningStable || !engine.balance.decisionStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isStrategyIntelligenceMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isStrategyIntelligenceShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "replay-protect" &&
    engine.balance.routingLane !== "conversion-check" &&
    engine.balance.routingLane !== "momentum-check";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > STRATEGY_MAX_DRIFT || engine.influence.strategyDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  const replayIntegrity = computeStrategyReplayIntegrity({
    preLinks,
    postLinks,
    signals: engine.signals,
  });

  const strategyWarnings: string[] = [];
  if (!isStrategyIntelligenceEnvironmentAllowed()) strategyWarnings.push("production_strategy_blocked");
  if (engine.balance.routingLane === "conversion-check") strategyWarnings.push("conversion_gate");
  if (engine.balance.routingLane === "momentum-check") strategyWarnings.push("momentum_gate");

  const analytics = buildStrategyAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    balance: engine.balance,
    replayIntegrity,
    topDrift,
  });

  const monitoring = buildStrategyMonitoring({
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
      version: STRATEGY_INTELLIGENCE_VERSION,
      strategyActive: isStrategyIntelligenceEnabled() && isStrategyIntelligenceEnvironmentAllowed(),
      strategyProfile: mode,
      strategyScore: engine.strategyScore,
      strategyDelta: engine.influence.strategyDelta,
      strategyConfidence: engine.balance.strategyConfidence,
      conversionConfidence: engine.signals.conversionConfidence,
      strategicTrust: engine.influence.strategicTrust,
      strategicValue: engine.influence.strategicValue,
      premiumPositioning: engine.influence.premiumPositioning,
      categoryDominance: engine.influence.categoryDominance,
      recommendationHierarchy: engine.influence.recommendationHierarchy,
      comparisonIntelligence: engine.influence.comparisonIntelligence,
      merchantStrength: engine.influence.merchantStrength,
      momentumConfidence: engine.influence.momentumConfidence,
      replayIntegrity,
      continuityStrength: engine.influence.continuityStrength,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      strategyWarnings: strategyWarnings.slice(0, 10),
      strategyAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      graphExecutionHash: engine.graph.executionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicStrategyReplay };

export {
  isStrategyIntelligenceEnabled,
  isStrategyIntelligenceMutationEnabled,
  resolveStrategyIntelligenceMode,
  isStrategyIntelligenceEnvironmentAllowed,
} from "@/lib/strategy/strategyFlags";

export { STRATEGY_PROFILES } from "@/lib/strategy/strategyProfiles";
export { validateStrategyGraphReplay } from "@/lib/strategy/strategyGraph";
