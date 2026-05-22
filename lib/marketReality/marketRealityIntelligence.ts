/**
 * P6.5 — Market reality intelligence (aggregate commerce telemetry only; no personalization).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  isMarketRealityIntelligenceEnabled,
  isMarketRealityIntelligenceEnvironmentAllowed,
  isMarketRealityIntelligenceMutationEnabled,
  isMarketRealityIntelligenceShadowMode,
  MARKET_REALITY_INTELLIGENCE_VERSION,
  MARKET_REALITY_MAX_DRIFT,
  resolveMarketRealityIntelligenceMode,
} from "@/lib/marketReality/marketRealityFlags";
import { resolveMarketRealityIntelligenceProfile } from "@/lib/marketReality/marketRealityProfiles";
import { runMarketRealityEngine } from "@/lib/marketReality/marketRealityEngine";
import {
  applyMarketRealityStabilizationRanking,
  computeMarketRealityReplayIntegrity,
} from "@/lib/marketReality/marketRealityRanking";
import { validateDeterministicMarketRealityReplay } from "@/lib/marketReality/marketRealityReplay";
import type { MarketRealitySignalBundle } from "@/lib/marketReality/marketRealityConfidence";
import {
  buildMarketRealityAnalytics,
  buildMarketRealityMonitoring,
  type MarketRealityIntelligenceAnalytics,
  type MarketRealityIntelligenceMeta,
  type MarketRealityIntelligenceMonitoring,
} from "@/lib/marketReality/marketRealityTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { MarketRealityIntelligenceMeta, MarketRealityIntelligenceAnalytics, MarketRealityIntelligenceMonitoring };

export type MarketRealityIntelligenceApplyResult = {
  products: QuantProduct[];
  meta: MarketRealityIntelligenceMeta;
  signals: MarketRealitySignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledMarketRealityIntelligence(args: {
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
  memoryless: MemorylessCommerceLearningMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): MarketRealityIntelligenceApplyResult {
  const started = Date.now();
  const { products, governance, multiObjective, intent, strategic, memoryless, preOrderLinks } = args;

  const mode = resolveMarketRealityIntelligenceMode();
  const profile = resolveMarketRealityIntelligenceProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runMarketRealityEngine({
    products: baseline,
    intent,
    multiObjective,
    strategic,
    memoryless,
    governance,
    profile,
  });

  const emptyAnalytics: MarketRealityIntelligenceAnalytics = {
    discountAnalytics: 0,
    retailerAnalytics: 0,
    volatilityAnalytics: 0,
    listingAnalytics: 0,
    marketplaceAnalytics: 0,
    trustAnalytics: 0,
    inventoryAnalytics: 0,
    offerAnalytics: 0,
    signalAnalytics: 0,
    pricingAnalytics: 0,
    merchantAnalytics: 0,
    harmonyAnalytics: 0,
    contradictionAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildMarketRealityMonitoring({
    influence: {
      realityDelta: 0,
      pricingInfluence: 0,
      merchantInfluence: 0,
      discountDampening: 0,
      volatilityDampening: 0,
      trustStabilization: 0,
      offerStabilization: 0,
      ecosystemReinforcement: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    detection: engine.detection,
    contradictions: engine.contradictions,
    topDrift: 0,
    profile,
  });

  if (!isMarketRealityIntelligenceEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      meta: {
        version: MARKET_REALITY_INTELLIGENCE_VERSION,
        realityActive: false,
        realityProfile: mode,
        realityScore: 0,
        realityDelta: 0,
        realityConfidence: engine.balance.realityConfidence,
        fakeDiscountDetected: engine.detection.fakeDiscountDetected,
        retailerInstabilityDetected: engine.detection.retailerInstabilityDetected,
        priceVolatilityDetected: engine.detection.priceVolatilityDetected,
        listingQualityDegradationDetected: engine.detection.listingQualityDegradationDetected,
        marketplaceInconsistencyDetected: engine.detection.marketplaceInconsistencyDetected,
        trustDecayDetected: engine.detection.trustDecayDetected,
        inventoryInstabilityDetected: engine.detection.inventoryInstabilityDetected,
        unreliableOfferDetected: engine.detection.unreliableOfferDetected,
        lowSignalMarketplaceDetected: engine.detection.lowSignalMarketplaceDetected,
        fakeDiscountScore: engine.detection.fakeDiscountScore,
        verifiedPricingContinuity: engine.signals.verifiedPricingContinuity,
        trustedMerchantStability: engine.signals.trustedMerchantStability,
        contradictionCount: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        realityWarnings: ["market_reality_intelligence_disabled"],
        realityAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        graphExecutionHash: engine.signals.graphExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyMarketRealityStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeMarketRealityReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > MARKET_REALITY_MAX_DRIFT) anomalies.push("drift_escalation");
  if (engine.contradictions.contradictionCount >= 3) anomalies.push("contradiction_gate");
  if (strategic.rollbackTriggered || multiObjective.rollbackTriggered || intent.rollbackTriggered || memoryless.rollbackTriggered) {
    anomalies.push("upstream_instability");
  }

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-reality" && (!engine.balance.learningStable || projectedReplayIntegrity < 70));

  const checkLanes = new Set([
    "discount-check",
    "retailer-check",
    "volatility-check",
    "listing-check",
    "marketplace-check",
    "trust-check",
    "inventory-check",
    "offer-check",
    "signal-check",
  ]);

  const mutationAllowed =
    isMarketRealityIntelligenceMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isMarketRealityIntelligenceShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "replay-protect" &&
    !checkLanes.has(engine.balance.routingLane);

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > MARKET_REALITY_MAX_DRIFT || engine.influence.realityDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeMarketRealityReplayIntegrity({ preLinks, postLinks, signals: engine.signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeMarketRealityReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      signals: engine.signals,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeMarketRealityReplayIntegrity({
    preLinks,
    postLinks: finalPostLinks,
    signals: engine.signals,
  });

  const realityWarnings: string[] = [];
  if (!isMarketRealityIntelligenceEnvironmentAllowed()) realityWarnings.push("production_market_reality_blocked");
  if (engine.detection.fakeDiscountDetected) realityWarnings.push("fake_discount");
  if (engine.detection.retailerInstabilityDetected) realityWarnings.push("retailer_instability");
  if (engine.balance.routingLane === "marketplace-check") realityWarnings.push("marketplace_gate");

  const analytics = buildMarketRealityAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    detection: engine.detection,
    contradictions: engine.contradictions,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildMarketRealityMonitoring({
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
      version: MARKET_REALITY_INTELLIGENCE_VERSION,
      realityActive: isMarketRealityIntelligenceEnabled() && isMarketRealityIntelligenceEnvironmentAllowed(),
      realityProfile: mode,
      realityScore: engine.realityScore,
      realityDelta: engine.influence.realityDelta,
      realityConfidence: engine.balance.realityConfidence,
      fakeDiscountDetected: engine.detection.fakeDiscountDetected,
      retailerInstabilityDetected: engine.detection.retailerInstabilityDetected,
      priceVolatilityDetected: engine.detection.priceVolatilityDetected,
      listingQualityDegradationDetected: engine.detection.listingQualityDegradationDetected,
      marketplaceInconsistencyDetected: engine.detection.marketplaceInconsistencyDetected,
      trustDecayDetected: engine.detection.trustDecayDetected,
      inventoryInstabilityDetected: engine.detection.inventoryInstabilityDetected,
      unreliableOfferDetected: engine.detection.unreliableOfferDetected,
      lowSignalMarketplaceDetected: engine.detection.lowSignalMarketplaceDetected,
      fakeDiscountScore: engine.detection.fakeDiscountScore,
      verifiedPricingContinuity: engine.signals.verifiedPricingContinuity,
      trustedMerchantStability: engine.signals.trustedMerchantStability,
      contradictionCount: engine.contradictions.contradictionCount,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      realityWarnings: realityWarnings.slice(0, 10),
      realityAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      graphExecutionHash: engine.signals.graphExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicMarketRealityReplay };

export {
  isMarketRealityIntelligenceEnabled,
  isMarketRealityIntelligenceMutationEnabled,
  resolveMarketRealityIntelligenceMode,
  isMarketRealityIntelligenceEnvironmentAllowed,
} from "@/lib/marketReality/marketRealityFlags";

export { MARKET_REALITY_INTELLIGENCE_PROFILES } from "@/lib/marketReality/marketRealityProfiles";
