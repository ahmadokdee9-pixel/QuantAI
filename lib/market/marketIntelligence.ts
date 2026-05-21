/**
 * P5.8 — Adaptive market intelligence (deterministic bounded market cognition; no personalization).
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
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import {
  MARKET_INTELLIGENCE_VERSION,
  MARKET_MAX_DRIFT,
  isMarketIntelligenceEnabled,
  isMarketIntelligenceEnvironmentAllowed,
  isMarketIntelligenceMutationEnabled,
  isMarketIntelligenceShadowMode,
  resolveMarketIntelligenceMode,
  type MarketIntelligenceMode,
} from "@/lib/market/marketFlags";
import { resolveMarketProfile } from "@/lib/market/marketProfiles";
import {
  computeMarketBalance,
  computeMarketBlendInfluence,
  computeMarketConfidence,
  runMarketEngine,
} from "@/lib/market/marketBalancer";
import { evaluateMarketLifecycle } from "@/lib/market/marketLifecycle";
import { evaluateMarketMomentum } from "@/lib/market/marketMomentum";
import { evaluateMarketPressure } from "@/lib/market/marketPressure";
import { evaluateMarketPricing } from "@/lib/market/marketPricing";
import { applyMarketStabilizationRanking, computeMarketReplayIntegrity } from "@/lib/market/marketRanking";
import { validateDeterministicMarketReplay } from "@/lib/market/marketReplay";
import { buildMarketSignals, type MarketSignalBundle } from "@/lib/market/marketSignals";
import { evaluateMarketTrust } from "@/lib/market/marketTrust";
import { evaluateMarketVolatility } from "@/lib/market/marketVolatility";
import {
  buildMarketAnalytics,
  buildMarketMonitoring,
  type MarketIntelligenceAnalytics,
  type MarketIntelligenceMeta,
  type MarketMonitoring,
} from "@/lib/market/marketTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { MarketIntelligenceMeta, MarketIntelligenceAnalytics, MarketMonitoring };

export type MarketIntelligenceApplyResult = {
  products: QuantProduct[];
  meta: MarketIntelligenceMeta;
  signals: MarketSignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledMarketIntelligence(args: {
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
  preOrderLinks?: string[];
  trayId?: string;
}): MarketIntelligenceApplyResult {
  const started = Date.now();
  const {
    products,
    canonicalQuery,
    governance,
    fusion,
    reasoning,
    strategy,
    preOrderLinks,
  } = args;

  const mode = resolveMarketIntelligenceMode();
  const profile = resolveMarketProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const pricing = evaluateMarketPricing({ products: baseline, canonicalQuery });
  const momentum = evaluateMarketMomentum({ products: baseline, canonicalQuery, strategy });
  const trust = evaluateMarketTrust({ products: baseline, strategy });
  const lifecycle = evaluateMarketLifecycle({ canonicalQuery, strategy });
  const volatility = evaluateMarketVolatility({ pricing, strategy });
  const pressure = evaluateMarketPressure({ products: baseline, canonicalQuery, pricing, momentum });

  const signals = buildMarketSignals({
    pricing,
    momentum,
    trust,
    lifecycle,
    volatility,
    pressure,
    strategy,
    governance,
    fusion,
    reasoning,
    canonicalQuery,
  });

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;

  const marketConfidence = computeMarketConfidence({ signals, strategy, reasoning, governanceDampen });
  const balance = computeMarketBalance({
    signals,
    marketConfidence,
    governance,
    fusion,
    reasoning,
    strategy,
    volatility,
    trust,
    profile,
  });
  const influence = computeMarketBlendInfluence({ signals, balance, profile });
  const engine = runMarketEngine({ signals, balance, influence, marketConfidence, profile, governance });

  const emptyAnalytics: MarketIntelligenceAnalytics = {
    momentumAnalytics: 0,
    pressureAnalytics: 0,
    volatilityAnalytics: 0,
    trustAnalytics: 0,
    lifecycleAnalytics: 0,
    pricingAnalytics: 0,
    conversionMarketAnalytics: 0,
    rankingContinuityAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildMarketMonitoring({
    influence: {
      marketDelta: 0,
      marketMomentum: 0,
      marketPressure: 0,
      marketVolatility: 0,
      marketTrust: 0,
      marketLifecycle: 0,
      volatilityAmplification: 0,
      momentumAmplification: 0,
      trustAmplification: 0,
      continuityStrength: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance,
    signals,
    topDrift: 0,
    profile,
  });

  if (!isMarketIntelligenceEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals,
      meta: {
        version: MARKET_INTELLIGENCE_VERSION,
        marketActive: false,
        marketProfile: mode,
        marketScore: 0,
        marketDelta: 0,
        marketConfidence: balance.marketConfidence,
        marketMomentum: 0,
        marketPressure: 0,
        marketVolatility: 0,
        marketTrust: 0,
        marketLifecycle: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        marketWarnings: ["market_disabled"],
        marketAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: signals.signalHash,
        graphExecutionHash: signals.graphExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyMarketStabilizationRanking({
    products: baseline,
    influence,
    balance,
    signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeMarketReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > MARKET_MAX_DRIFT) anomalies.push("drift_escalation");
  if (fusion.rollbackTriggered || reasoning.rollbackTriggered) anomalies.push("upstream_instability");
  if (influence.volatilityAmplification > profile.maxVolatilityAmplification) anomalies.push("volatility_gate");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-market" &&
      (!balance.strategyStable || !balance.fusionStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isMarketIntelligenceMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isMarketIntelligenceShadowMode(mode) &&
    balance.routingLane !== "hold" &&
    balance.routingLane !== "stabilize" &&
    balance.routingLane !== "replay-protect" &&
    balance.routingLane !== "conversion-check" &&
    balance.routingLane !== "momentum-check" &&
    balance.routingLane !== "volatility-check" &&
    balance.routingLane !== "trust-check";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (
      postDrift > MARKET_MAX_DRIFT ||
      influence.marketDelta > profile.maxDelta ||
      influence.volatilityAmplification > profile.maxVolatilityAmplification
    ) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  const replayIntegrity = computeMarketReplayIntegrity({ preLinks, postLinks, signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeMarketReplayIntegrity({ preLinks, postLinks: finalPostLinks, signals });

  const marketWarnings: string[] = [];
  if (!isMarketIntelligenceEnvironmentAllowed()) marketWarnings.push("production_market_blocked");
  if (balance.routingLane === "volatility-check") marketWarnings.push("volatility_gate");
  if (balance.routingLane === "trust-check") marketWarnings.push("trust_gate");
  if (balance.routingLane === "conversion-check") marketWarnings.push("conversion_gate");

  const analytics = buildMarketAnalytics({
    signals,
    influence,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildMarketMonitoring({
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
      version: MARKET_INTELLIGENCE_VERSION,
      marketActive: isMarketIntelligenceEnabled() && isMarketIntelligenceEnvironmentAllowed(),
      marketProfile: mode,
      marketScore: engine.marketScore,
      marketDelta: influence.marketDelta,
      marketConfidence: balance.marketConfidence,
      marketMomentum: influence.marketMomentum,
      marketPressure: influence.marketPressure,
      marketVolatility: influence.marketVolatility,
      marketTrust: influence.marketTrust,
      marketLifecycle: influence.marketLifecycle,
      routingLane: balance.routingLane,
      rollbackTriggered,
      marketWarnings: marketWarnings.slice(0, 10),
      marketAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: signals.signalHash,
      graphExecutionHash: signals.graphExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicMarketReplay };

export {
  isMarketIntelligenceEnabled,
  isMarketIntelligenceMutationEnabled,
  resolveMarketIntelligenceMode,
  isMarketIntelligenceEnvironmentAllowed,
} from "@/lib/market/marketFlags";

export { MARKET_PROFILES } from "@/lib/market/marketProfiles";
