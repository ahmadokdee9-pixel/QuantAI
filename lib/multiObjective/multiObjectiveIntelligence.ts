/**
 * P6.2 — Multi-objective commerce intelligence (deterministic bounded synthesis; no personalization).
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  MULTI_OBJECTIVE_COMMERCE_VERSION,
  MULTI_OBJECTIVE_MAX_DRIFT,
  isMultiObjectiveCommerceEnabled,
  isMultiObjectiveCommerceEnvironmentAllowed,
  isMultiObjectiveCommerceMutationEnabled,
  isMultiObjectiveCommerceShadowMode,
  resolveMultiObjectiveCommerceMode,
} from "@/lib/multiObjective/multiObjectiveFlags";
import { resolveMultiObjectiveCommerceProfile } from "@/lib/multiObjective/multiObjectiveProfiles";
import { runMultiObjectiveEngine } from "@/lib/multiObjective/multiObjectiveEngine";
import {
  applyMultiObjectiveStabilizationRanking,
  computeMultiObjectiveReplayIntegrity,
} from "@/lib/multiObjective/multiObjectiveRanking";
import { validateDeterministicMultiObjectiveReplay } from "@/lib/multiObjective/multiObjectiveReplay";
import type { MultiObjectiveSignalBundle } from "@/lib/multiObjective/multiObjectiveConfidence";
import {
  buildMultiObjectiveAnalytics,
  buildMultiObjectiveMonitoring,
  type MultiObjectiveCommerceAnalytics,
  type MultiObjectiveCommerceMeta,
  type MultiObjectiveCommerceMonitoring,
} from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { MultiObjectiveCommerceMeta, MultiObjectiveCommerceAnalytics, MultiObjectiveCommerceMonitoring };

export type MultiObjectiveCommerceApplyResult = {
  products: QuantProduct[];
  meta: MultiObjectiveCommerceMeta;
  signals: MultiObjectiveSignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledMultiObjectiveCommerce(args: {
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
  cognition: CognitionEngineMeta;
  intent: IntentCognitionMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): MultiObjectiveCommerceApplyResult {
  const started = Date.now();
  const { products, query, canonicalQuery, governance, decision, strategy, market, behavioral, cognition, intent, preOrderLinks } =
    args;

  const mode = resolveMultiObjectiveCommerceMode();
  const profile = resolveMultiObjectiveCommerceProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runMultiObjectiveEngine({
    query,
    canonicalQuery,
    decision,
    strategy,
    market,
    behavioral,
    cognition,
    intent,
    governance,
    profile,
  });

  const emptyAnalytics: MultiObjectiveCommerceAnalytics = {
    qualityAnalytics: 0,
    priceAnalytics: 0,
    trustAnalytics: 0,
    valueAnalytics: 0,
    intentAnalytics: 0,
    aestheticAnalytics: 0,
    stabilityAnalytics: 0,
    conversionAnalytics: 0,
    objectiveBalanceAnalytics: 0,
    contradictionAnalytics: 0,
    continuityAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildMultiObjectiveMonitoring({
    influence: {
      multiObjectiveDelta: 0,
      qualityInfluence: 0,
      priceInfluence: 0,
      trustInfluence: 0,
      valueInfluence: 0,
      intentInfluence: 0,
      aestheticInfluence: 0,
      stabilityInfluence: 0,
      conversionInfluence: 0,
      continuityStrength: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    contradictions: engine.contradictions,
    signals: engine.signals,
    topDrift: 0,
    profile,
  });

  if (!isMultiObjectiveCommerceEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      meta: {
        version: MULTI_OBJECTIVE_COMMERCE_VERSION,
        multiObjectiveActive: false,
        multiObjectiveProfile: mode,
        multiObjectiveScore: 0,
        multiObjectiveDelta: 0,
        multiObjectiveConfidence: engine.balance.multiObjectiveConfidence,
        qualityObjective: engine.signals.qualityObjective,
        priceObjective: engine.signals.priceObjective,
        trustObjective: engine.signals.trustObjective,
        valueObjective: engine.signals.valueObjective,
        intentObjective: engine.signals.intentObjective,
        aestheticObjective: engine.signals.aestheticObjective,
        stabilityObjective: engine.signals.stabilityObjective,
        conversionObjective: engine.signals.conversionObjective,
        contradictionCount: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        objectiveWarnings: ["multi_objective_commerce_disabled"],
        objectiveAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        graphExecutionHash: engine.signals.graphExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyMultiObjectiveStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeMultiObjectiveReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > MULTI_OBJECTIVE_MAX_DRIFT) anomalies.push("drift_escalation");
  if (engine.contradictions.contradictionCount >= 3) anomalies.push("contradiction_gate");
  if (cognition.rollbackTriggered || behavioral.rollbackTriggered || intent.rollbackTriggered) {
    anomalies.push("upstream_instability");
  }

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-multi-objective" && (!engine.balance.intentStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isMultiObjectiveCommerceMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isMultiObjectiveCommerceShadowMode(mode) &&
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
    if (postDrift > MULTI_OBJECTIVE_MAX_DRIFT || engine.influence.multiObjectiveDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeMultiObjectiveReplayIntegrity({ preLinks, postLinks, signals: engine.signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeMultiObjectiveReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      signals: engine.signals,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeMultiObjectiveReplayIntegrity({
    preLinks,
    postLinks: finalPostLinks,
    signals: engine.signals,
  });

  const objectiveWarnings: string[] = [];
  if (!isMultiObjectiveCommerceEnvironmentAllowed()) objectiveWarnings.push("production_multi_objective_blocked");
  if (engine.balance.routingLane === "contradiction-check") objectiveWarnings.push("contradiction_gate");
  if (engine.balance.routingLane === "behavior-check") objectiveWarnings.push("behavior_gate");

  const analytics = buildMultiObjectiveAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    contradictions: engine.contradictions,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildMultiObjectiveMonitoring({
    influence: engine.influence,
    replayIntegrity: finalReplayIntegrity,
    rollbackTriggered,
    balance: engine.balance,
    contradictions: engine.contradictions,
    signals: engine.signals,
    topDrift,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    signals: engine.signals,
    meta: {
      version: MULTI_OBJECTIVE_COMMERCE_VERSION,
      multiObjectiveActive: isMultiObjectiveCommerceEnabled() && isMultiObjectiveCommerceEnvironmentAllowed(),
      multiObjectiveProfile: mode,
      multiObjectiveScore: engine.multiObjectiveScore,
      multiObjectiveDelta: engine.influence.multiObjectiveDelta,
      multiObjectiveConfidence: engine.balance.multiObjectiveConfidence,
      qualityObjective: engine.signals.qualityObjective,
      priceObjective: engine.signals.priceObjective,
      trustObjective: engine.signals.trustObjective,
      valueObjective: engine.signals.valueObjective,
      intentObjective: engine.signals.intentObjective,
      aestheticObjective: engine.signals.aestheticObjective,
      stabilityObjective: engine.signals.stabilityObjective,
      conversionObjective: engine.signals.conversionObjective,
      contradictionCount: engine.contradictions.contradictionCount,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      objectiveWarnings: objectiveWarnings.slice(0, 10),
      objectiveAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      graphExecutionHash: engine.signals.graphExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicMultiObjectiveReplay };

export {
  isMultiObjectiveCommerceEnabled,
  isMultiObjectiveCommerceMutationEnabled,
  resolveMultiObjectiveCommerceMode,
  isMultiObjectiveCommerceEnvironmentAllowed,
} from "@/lib/multiObjective/multiObjectiveFlags";

export { MULTI_OBJECTIVE_COMMERCE_PROFILES } from "@/lib/multiObjective/multiObjectiveProfiles";
