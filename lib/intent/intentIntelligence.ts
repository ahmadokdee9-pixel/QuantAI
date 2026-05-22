/**
 * P6.1 — Intent cognition intelligence (deterministic query-derived cognition; no personalization memory).
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
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  INTENT_COGNITION_MAX_DRIFT,
  INTENT_COGNITION_VERSION,
  isIntentCognitionEnabled,
  isIntentCognitionEnvironmentAllowed,
  isIntentCognitionMutationEnabled,
  isIntentCognitionShadowMode,
  resolveIntentCognitionMode,
} from "@/lib/intent/intentFlags";
import { resolveIntentCognitionProfile } from "@/lib/intent/intentProfiles";
import { runIntentEngine } from "@/lib/intent/intentEngine";
import { applyIntentStabilizationRanking, computeIntentReplayIntegrity } from "@/lib/intent/intentRanking";
import { validateDeterministicIntentReplay } from "@/lib/intent/intentReplay";
import type { IntentSignalBundle } from "@/lib/intent/intentConfidence";
import {
  buildIntentAnalytics,
  buildIntentMonitoring,
  type IntentCognitionAnalytics,
  type IntentCognitionMeta,
  type IntentCognitionMonitoring,
} from "@/lib/intent/intentTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { IntentCognitionMeta, IntentCognitionAnalytics, IntentCognitionMonitoring };

export type IntentCognitionApplyResult = {
  products: QuantProduct[];
  meta: IntentCognitionMeta;
  signals: IntentSignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledIntentCognition(args: {
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
  preOrderLinks?: string[];
  trayId?: string;
}): IntentCognitionApplyResult {
  const started = Date.now();
  const { products, query, canonicalQuery, governance, decision, strategy, behavioral, cognition, preOrderLinks } = args;

  const mode = resolveIntentCognitionMode();
  const profile = resolveIntentCognitionProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runIntentEngine({
    query,
    canonicalQuery,
    decision,
    strategy,
    behavioral,
    cognition,
    governance,
    profile,
  });

  const emptyAnalytics: IntentCognitionAnalytics = {
    recommendationAnalytics: 0,
    comparisonAnalytics: 0,
    premiumAnalytics: 0,
    valueAnalytics: 0,
    trustAnalytics: 0,
    readinessAnalytics: 0,
    emotionalAnalytics: 0,
    aestheticAnalytics: 0,
    explorationAnalytics: 0,
    contradictionAnalytics: 0,
    continuityAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildIntentMonitoring({
    influence: {
      intentDelta: 0,
      recommendationInfluence: 0,
      comparisonInfluence: 0,
      premiumInfluence: 0,
      valueInfluence: 0,
      trustInfluence: 0,
      readinessInfluence: 0,
      aestheticInfluence: 0,
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

  if (!isIntentCognitionEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      meta: {
        version: INTENT_COGNITION_VERSION,
        intentActive: false,
        intentProfile: mode,
        intentScore: 0,
        intentDelta: 0,
        intentConfidence: engine.balance.intentConfidence,
        recommendationIntent: engine.signals.recommendationIntent,
        comparisonIntent: engine.signals.comparisonIntent,
        premiumIntent: engine.signals.premiumIntent,
        valueIntent: engine.signals.valueIntent,
        trustIntent: engine.signals.trustIntent,
        readinessIntent: engine.signals.readinessIntent,
        hesitationIntent: engine.signals.hesitationIntent,
        emotionalIntent: engine.signals.emotionalIntent,
        aestheticIntent: engine.signals.aestheticIntent,
        explorationIntent: engine.signals.explorationIntent,
        contradictionCount: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        intentWarnings: ["intent_cognition_disabled"],
        intentAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        graphExecutionHash: engine.signals.graphExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyIntentStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeIntentReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > INTENT_COGNITION_MAX_DRIFT) anomalies.push("drift_escalation");
  if (engine.contradictions.contradictionCount >= 3) anomalies.push("contradiction_gate");
  if (cognition.rollbackTriggered || behavioral.rollbackTriggered) anomalies.push("upstream_instability");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-intent" &&
      (!engine.balance.cognitionStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isIntentCognitionMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isIntentCognitionShadowMode(mode) &&
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
    if (postDrift > INTENT_COGNITION_MAX_DRIFT || engine.influence.intentDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeIntentReplayIntegrity({ preLinks, postLinks, signals: engine.signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeIntentReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      signals: engine.signals,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeIntentReplayIntegrity({
    preLinks,
    postLinks: finalPostLinks,
    signals: engine.signals,
  });

  const intentWarnings: string[] = [];
  if (!isIntentCognitionEnvironmentAllowed()) intentWarnings.push("production_intent_cognition_blocked");
  if (engine.balance.routingLane === "contradiction-check") intentWarnings.push("contradiction_gate");
  if (engine.balance.routingLane === "behavior-check") intentWarnings.push("behavior_gate");

  const analytics = buildIntentAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    contradictions: engine.contradictions,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildIntentMonitoring({
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
      version: INTENT_COGNITION_VERSION,
      intentActive: isIntentCognitionEnabled() && isIntentCognitionEnvironmentAllowed(),
      intentProfile: mode,
      intentScore: engine.intentScore,
      intentDelta: engine.influence.intentDelta,
      intentConfidence: engine.balance.intentConfidence,
      recommendationIntent: engine.signals.recommendationIntent,
      comparisonIntent: engine.signals.comparisonIntent,
      premiumIntent: engine.signals.premiumIntent,
      valueIntent: engine.signals.valueIntent,
      trustIntent: engine.signals.trustIntent,
      readinessIntent: engine.signals.readinessIntent,
      hesitationIntent: engine.signals.hesitationIntent,
      emotionalIntent: engine.signals.emotionalIntent,
      aestheticIntent: engine.signals.aestheticIntent,
      explorationIntent: engine.signals.explorationIntent,
      contradictionCount: engine.contradictions.contradictionCount,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      intentWarnings: intentWarnings.slice(0, 10),
      intentAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      graphExecutionHash: engine.signals.graphExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicIntentReplay };

export {
  isIntentCognitionEnabled,
  isIntentCognitionMutationEnabled,
  resolveIntentCognitionMode,
  isIntentCognitionEnvironmentAllowed,
} from "@/lib/intent/intentFlags";

export { INTENT_COGNITION_PROFILES } from "@/lib/intent/intentProfiles";
