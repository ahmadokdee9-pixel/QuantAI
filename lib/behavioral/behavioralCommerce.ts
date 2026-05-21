/**
 * P5.9 — Behavioral commerce intelligence (deterministic advisory cognition; no personalization).
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
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import {
  BEHAVIORAL_COMMERCE_VERSION,
  BEHAVIORAL_MAX_DRIFT,
  isBehavioralCommerceEnabled,
  isBehavioralCommerceEnvironmentAllowed,
  isBehavioralCommerceMutationEnabled,
  isBehavioralCommerceShadowMode,
  resolveBehavioralCommerceMode,
} from "@/lib/behavioral/behavioralFlags";
import { resolveBehavioralProfile } from "@/lib/behavioral/behavioralProfiles";
import {
  computeBehavioralBalance,
  computeBehavioralBlendInfluence,
  computeBehavioralConfidence,
  runBehavioralEngine,
} from "@/lib/behavioral/behavioralBalancer";
import { evaluateComparisonFatigue } from "@/lib/behavioral/behavioralComparisonFatigue";
import { evaluateConversionReadiness } from "@/lib/behavioral/behavioralConversionReadiness";
import { evaluateBuyingFriction } from "@/lib/behavioral/behavioralFriction";
import { evaluateDecisionHesitation } from "@/lib/behavioral/behavioralHesitation";
import { applyBehavioralStabilizationRanking, computeBehavioralReplayIntegrity } from "@/lib/behavioral/behavioralRanking";
import { validateDeterministicBehavioralReplay } from "@/lib/behavioral/behavioralReplay";
import { buildBehavioralSignals, type BehavioralSignalBundle } from "@/lib/behavioral/behavioralSignals";
import { evaluateTrustMomentumBehavior } from "@/lib/behavioral/behavioralTrustMomentum";
import {
  buildBehavioralAnalytics,
  buildBehavioralMonitoring,
  type BehavioralCommerceAnalytics,
  type BehavioralCommerceMeta,
  type BehavioralMonitoring,
} from "@/lib/behavioral/behavioralTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { BehavioralCommerceMeta, BehavioralCommerceAnalytics, BehavioralMonitoring };

export type BehavioralCommerceApplyResult = {
  products: QuantProduct[];
  meta: BehavioralCommerceMeta;
  signals: BehavioralSignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledBehavioralCommerce(args: {
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
  preOrderLinks?: string[];
  trayId?: string;
}): BehavioralCommerceApplyResult {
  const started = Date.now();
  const { products, canonicalQuery, governance, decision, strategy, market, preOrderLinks } = args;

  const mode = resolveBehavioralCommerceMode();
  const profile = resolveBehavioralProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const friction = evaluateBuyingFriction({ products: baseline, market, strategy });
  const hesitation = evaluateDecisionHesitation({ canonicalQuery, decision, strategy });
  const fatigue = evaluateComparisonFatigue({ products: baseline, canonicalQuery, strategy });
  const trustMomentum = evaluateTrustMomentumBehavior({ market, strategy });
  const readiness = evaluateConversionReadiness({ friction, hesitation, fatigue, trustMomentum, market, strategy });

  const signals = buildBehavioralSignals({
    friction,
    hesitation,
    fatigue,
    trustMomentum,
    readiness,
    market,
    strategy,
    governance,
  });

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;

  const behavioralConfidence = computeBehavioralConfidence({ signals, market, strategy, governanceDampen });
  const balance = computeBehavioralBalance({
    signals,
    behavioralConfidence,
    governance,
    market,
    strategy,
    profile,
  });
  const influence = computeBehavioralBlendInfluence({ signals, balance, profile });
  const engine = runBehavioralEngine({ signals, balance, influence, behavioralConfidence, profile, governance });

  const emptyAnalytics: BehavioralCommerceAnalytics = {
    frictionAnalytics: 0,
    hesitationAnalytics: 0,
    fatigueAnalytics: 0,
    trustMomentumAnalytics: 0,
    readinessAnalytics: 0,
    aggregateAnalytics: 0,
    rankingContinuityAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildBehavioralMonitoring({
    influence: {
      behavioralDelta: 0,
      buyingFriction: 0,
      decisionHesitation: 0,
      comparisonFatigue: 0,
      trustMomentum: 0,
      conversionReadiness: 0,
      frictionAmplification: 0,
      hesitationAmplification: 0,
      readinessAmplification: 0,
      continuityStrength: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance,
    signals,
    topDrift: 0,
    profile,
  });

  if (!isBehavioralCommerceEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals,
      meta: {
        version: BEHAVIORAL_COMMERCE_VERSION,
        behavioralActive: false,
        behavioralProfile: mode,
        behavioralScore: 0,
        behavioralDelta: 0,
        behavioralConfidence: balance.behavioralConfidence,
        buyingFriction: 0,
        decisionHesitation: 0,
        comparisonFatigue: 0,
        trustMomentum: 0,
        conversionReadiness: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        behavioralWarnings: ["behavioral_disabled"],
        behavioralAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: signals.signalHash,
        graphExecutionHash: signals.graphExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyBehavioralStabilizationRanking({
    products: baseline,
    influence,
    balance,
    signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeBehavioralReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > BEHAVIORAL_MAX_DRIFT) anomalies.push("drift_escalation");
  if (market.rollbackTriggered || strategy.rollbackTriggered) anomalies.push("upstream_instability");
  if (influence.frictionAmplification > profile.maxFrictionAmplification) anomalies.push("friction_gate");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-behavioral" &&
      (!balance.strategyStable || !balance.marketStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isBehavioralCommerceMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isBehavioralCommerceShadowMode(mode) &&
    balance.routingLane !== "hold" &&
    balance.routingLane !== "stabilize" &&
    balance.routingLane !== "replay-protect" &&
    balance.routingLane !== "advisory-only" &&
    balance.routingLane !== "friction-check" &&
    balance.routingLane !== "hesitation-check" &&
    balance.routingLane !== "comparison-fatigue";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (
      postDrift > BEHAVIORAL_MAX_DRIFT ||
      influence.behavioralDelta > profile.maxDelta ||
      influence.frictionAmplification > profile.maxFrictionAmplification
    ) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeBehavioralReplayIntegrity({ preLinks, postLinks, signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeBehavioralReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      signals,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeBehavioralReplayIntegrity({ preLinks, postLinks: finalPostLinks, signals });

  const behavioralWarnings: string[] = [];
  if (!isBehavioralCommerceEnvironmentAllowed()) behavioralWarnings.push("production_behavioral_blocked");
  if (balance.routingLane === "friction-check") behavioralWarnings.push("friction_gate");
  if (balance.routingLane === "hesitation-check") behavioralWarnings.push("hesitation_gate");
  if (balance.routingLane === "comparison-fatigue") behavioralWarnings.push("fatigue_gate");
  if (balance.routingLane === "advisory-only") behavioralWarnings.push("advisory_only");

  const analytics = buildBehavioralAnalytics({
    signals,
    influence,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildBehavioralMonitoring({
    influence,
    replayIntegrity: finalReplayIntegrity,
    rollbackTriggered,
    balance,
    signals,
    topDrift,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    signals,
    meta: {
      version: BEHAVIORAL_COMMERCE_VERSION,
      behavioralActive: isBehavioralCommerceEnabled() && isBehavioralCommerceEnvironmentAllowed(),
      behavioralProfile: mode,
      behavioralScore: engine.behavioralScore,
      behavioralDelta: influence.behavioralDelta,
      behavioralConfidence: balance.behavioralConfidence,
      buyingFriction: influence.buyingFriction,
      decisionHesitation: influence.decisionHesitation,
      comparisonFatigue: influence.comparisonFatigue,
      trustMomentum: influence.trustMomentum,
      conversionReadiness: influence.conversionReadiness,
      routingLane: balance.routingLane,
      rollbackTriggered,
      behavioralWarnings: behavioralWarnings.slice(0, 10),
      behavioralAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: signals.signalHash,
      graphExecutionHash: signals.graphExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicBehavioralReplay };

export {
  isBehavioralCommerceEnabled,
  isBehavioralCommerceMutationEnabled,
  resolveBehavioralCommerceMode,
  isBehavioralCommerceEnvironmentAllowed,
} from "@/lib/behavioral/behavioralFlags";

export { BEHAVIORAL_PROFILES } from "@/lib/behavioral/behavioralProfiles";
