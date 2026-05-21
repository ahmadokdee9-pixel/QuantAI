/**
 * P6.0 — Unified commerce cognition intelligence (deterministic bounded synthesis; no personalization).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import {
  COGNITION_ENGINE_VERSION,
  COGNITION_MAX_DRIFT,
  isCognitionEngineEnabled,
  isCognitionEngineEnvironmentAllowed,
  isCognitionEngineMutationEnabled,
  isCognitionEngineShadowMode,
  resolveCognitionEngineMode,
} from "@/lib/cognition/cognitionFlags";
import { resolveCognitionProfile } from "@/lib/cognition/cognitionProfiles";
import { runCognitionEngine } from "@/lib/cognition/cognitionEngine";
import { applyCognitionStabilizationRanking, computeCognitionReplayIntegrity } from "@/lib/cognition/cognitionRanking";
import { validateDeterministicCognitionReplay } from "@/lib/cognition/cognitionReplay";
import {
  buildCognitionAnalytics,
  buildCognitionMonitoring,
  type CognitionEngineAnalytics,
  type CognitionEngineMeta,
  type CognitionMonitoring,
} from "@/lib/cognition/cognitionTelemetry";
import type { UnifiedCognitionGraph } from "@/lib/cognition/cognitionGraph";
import type { UnifiedCommerceState } from "@/lib/cognition/cognitionFusion";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { CognitionEngineMeta, CognitionEngineAnalytics, CognitionMonitoring };

export type CognitionEngineApplyResult = {
  products: QuantProduct[];
  meta: CognitionEngineMeta;
  state: UnifiedCommerceState;
  graph: UnifiedCognitionGraph;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledCognitionEngine(args: {
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
  strategy: StrategyIntelligenceMeta;
  market: MarketIntelligenceMeta;
  behavioral: BehavioralCommerceMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): CognitionEngineApplyResult {
  const started = Date.now();
  const { products, governance, reasoning, decision, strategy, market, behavioral, preOrderLinks } = args;

  const mode = resolveCognitionEngineMode();
  const profile = resolveCognitionProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runCognitionEngine({
    reasoning,
    decision,
    strategy,
    market,
    behavioral,
    governance,
    profile,
  });

  const emptyAnalytics: CognitionEngineAnalytics = {
    reasoningFusionAnalytics: 0,
    strategyFusionAnalytics: 0,
    marketStateAnalytics: 0,
    behavioralReadinessAnalytics: 0,
    trustValueAnalytics: 0,
    conversionProbabilityAnalytics: 0,
    contradictionAnalytics: 0,
    rankingContinuityAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildCognitionMonitoring({
    influence: {
      cognitionDelta: 0,
      reasoningInfluence: 0,
      strategyInfluence: 0,
      marketInfluence: 0,
      behavioralInfluence: 0,
      trustValueInfluence: 0,
      conversionInfluence: 0,
      continuityStrength: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    contradictions: engine.contradictions,
    topDrift: 0,
    profile,
    graphIntegrity: engine.graph.graphIntegrity,
  });

  if (!isCognitionEngineEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      state: engine.state,
      graph: engine.graph,
      meta: {
        version: COGNITION_ENGINE_VERSION,
        cognitionActive: false,
        cognitionProfile: mode,
        cognitionScore: 0,
        cognitionDelta: 0,
        cognitionConfidence: engine.balance.cognitionConfidence,
        cognitionStability: engine.balance.cognitionStability,
        reasoningFusion: engine.state.reasoningFusion,
        strategyFusion: engine.state.strategyFusion,
        marketStateFusion: engine.state.marketStateFusion,
        behavioralReadinessFusion: engine.state.behavioralReadinessFusion,
        trustValueBalance: engine.state.trustValueBalance,
        conversionProbability: engine.state.conversionProbability,
        contradictionCount: engine.contradictions.contradictionCount,
        routingLane: "hold",
        rollbackTriggered: false,
        cognitionWarnings: ["cognition_disabled"],
        cognitionAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        graphExecutionHash: engine.graph.executionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyCognitionStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    state: engine.state,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeCognitionReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    state: engine.state,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > COGNITION_MAX_DRIFT) anomalies.push("drift_escalation");
  if (engine.contradictions.contradictionCount >= 3) anomalies.push("contradiction_gate");
  if (behavioral.rollbackTriggered || market.rollbackTriggered || strategy.rollbackTriggered) {
    anomalies.push("upstream_instability");
  }

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-cognition" &&
      (!engine.balance.behavioralStable || !engine.balance.marketStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isCognitionEngineMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isCognitionEngineShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "replay-protect" &&
    engine.balance.routingLane !== "behavior-check" &&
    engine.balance.routingLane !== "contradiction-check" &&
    engine.balance.routingLane !== "conversion-check" &&
    engine.balance.routingLane !== "momentum-check";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > COGNITION_MAX_DRIFT || engine.influence.cognitionDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeCognitionReplayIntegrity({ preLinks, postLinks, state: engine.state });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeCognitionReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      state: engine.state,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeCognitionReplayIntegrity({
    preLinks,
    postLinks: finalPostLinks,
    state: engine.state,
  });

  const cognitionWarnings: string[] = [];
  if (!isCognitionEngineEnvironmentAllowed()) cognitionWarnings.push("production_cognition_blocked");
  if (engine.balance.routingLane === "contradiction-check") cognitionWarnings.push("contradiction_gate");
  if (engine.balance.routingLane === "behavior-check") cognitionWarnings.push("behavior_gate");
  if (engine.balance.routingLane === "conversion-check") cognitionWarnings.push("conversion_gate");

  const analytics = buildCognitionAnalytics({
    state: engine.state,
    influence: engine.influence,
    contradictions: engine.contradictions,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildCognitionMonitoring({
    influence: engine.influence,
    replayIntegrity: finalReplayIntegrity,
    rollbackTriggered,
    balance: engine.balance,
    contradictions: engine.contradictions,
    topDrift,
    profile,
    graphIntegrity: engine.graph.graphIntegrity,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    state: engine.state,
    graph: engine.graph,
    meta: {
      version: COGNITION_ENGINE_VERSION,
      cognitionActive: isCognitionEngineEnabled() && isCognitionEngineEnvironmentAllowed(),
      cognitionProfile: mode,
      cognitionScore: engine.cognitionScore,
      cognitionDelta: engine.influence.cognitionDelta,
      cognitionConfidence: engine.balance.cognitionConfidence,
      cognitionStability: engine.balance.cognitionStability,
      reasoningFusion: engine.state.reasoningFusion,
      strategyFusion: engine.state.strategyFusion,
      marketStateFusion: engine.state.marketStateFusion,
      behavioralReadinessFusion: engine.state.behavioralReadinessFusion,
      trustValueBalance: engine.state.trustValueBalance,
      conversionProbability: engine.state.conversionProbability,
      contradictionCount: engine.contradictions.contradictionCount,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      cognitionWarnings: cognitionWarnings.slice(0, 10),
      cognitionAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      graphExecutionHash: engine.graph.executionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicCognitionReplay };

export {
  isCognitionEngineEnabled,
  isCognitionEngineMutationEnabled,
  resolveCognitionEngineMode,
  isCognitionEngineEnvironmentAllowed,
} from "@/lib/cognition/cognitionFlags";

export { COGNITION_PROFILES } from "@/lib/cognition/cognitionProfiles";
export { validateCognitionGraphReplay } from "@/lib/cognition/cognitionGraph";
