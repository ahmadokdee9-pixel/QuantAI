/**
 * P6.6 — Commerce decision intelligence (aggregate telemetry only; no personalization).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  isCommerceDecisionIntelligenceEnabled,
  isCommerceDecisionIntelligenceEnvironmentAllowed,
  isCommerceDecisionIntelligenceMutationEnabled,
  isCommerceDecisionIntelligenceShadowMode,
  COMMERCE_DECISION_INTELLIGENCE_VERSION,
  COMMERCE_DECISION_MAX_DRIFT,
  resolveCommerceDecisionIntelligenceMode,
} from "@/lib/commerceDecision/commerceDecisionFlags";
import { resolveCommerceDecisionIntelligenceProfile } from "@/lib/commerceDecision/commerceDecisionProfiles";
import { runCommerceDecisionEngine } from "@/lib/commerceDecision/commerceDecisionEngine";
import {
  applyCommerceDecisionStabilizationRanking,
  computeCommerceDecisionReplayIntegrity,
} from "@/lib/commerceDecision/commerceDecisionRanking";
import { validateDeterministicCommerceDecisionReplay } from "@/lib/commerceDecision/commerceDecisionReplay";
import type { CommerceDecisionSignalBundle } from "@/lib/commerceDecision/commerceDecisionConfidence";
import {
  buildCommerceDecisionAnalytics,
  buildCommerceDecisionMonitoring,
  type CommerceDecisionIntelligenceAnalytics,
  type CommerceDecisionIntelligenceMeta,
  type CommerceDecisionIntelligenceMonitoring,
} from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { CommerceDecisionIntelligenceMeta, CommerceDecisionIntelligenceAnalytics, CommerceDecisionIntelligenceMonitoring };

export type CommerceDecisionIntelligenceApplyResult = {
  products: QuantProduct[];
  meta: CommerceDecisionIntelligenceMeta;
  signals: CommerceDecisionSignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

const CHECK_LANES = new Set([
  "recommendation-check",
  "outcome-check",
  "promotion-check",
  "purchase-check",
  "trust-value-check",
  "conversion-check",
  "consistency-check",
  "tradeoff-check",
]);

export function applyControlledCommerceDecisionIntelligence(args: {
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
  marketReality: MarketRealityIntelligenceMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): CommerceDecisionIntelligenceApplyResult {
  const started = Date.now();
  const { products, governance, multiObjective, intent, strategic, memoryless, marketReality, preOrderLinks } = args;

  const mode = resolveCommerceDecisionIntelligenceMode();
  const profile = resolveCommerceDecisionIntelligenceProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runCommerceDecisionEngine({
    products: baseline,
    intent,
    multiObjective,
    strategic,
    memoryless,
    marketReality,
    governance,
    profile,
  });

  const emptyAnalytics: CommerceDecisionIntelligenceAnalytics = {
    qualityAnalytics: 0,
    recommendationAnalytics: 0,
    outcomeAnalytics: 0,
    promotionAnalytics: 0,
    purchaseAnalytics: 0,
    trustValueAnalytics: 0,
    conversionAnalytics: 0,
    consistencyAnalytics: 0,
    tradeoffAnalytics: 0,
    continuityAnalytics: 0,
    integrityAnalytics: 0,
    formationAnalytics: 0,
    harmonyAnalytics: 0,
    contradictionAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildCommerceDecisionMonitoring({
    influence: {
      decisionDelta: 0,
      continuityInfluence: 0,
      integrityInfluence: 0,
      promotionDampening: 0,
      outcomeDampening: 0,
      trustValueStabilization: 0,
      conversionStabilization: 0,
      formationReinforcement: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    detection: engine.detection,
    contradictions: engine.contradictions,
    topDrift: 0,
    profile,
  });

  if (!isCommerceDecisionIntelligenceEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      meta: {
        version: COMMERCE_DECISION_INTELLIGENCE_VERSION,
        decisionActive: false,
        decisionProfile: mode,
        decisionScore: 0,
        decisionDelta: 0,
        decisionConfidence: engine.balance.decisionConfidence,
        decisionQualityScore: engine.detection.decisionQualityScore,
        weakRecommendationStructureDetected: engine.detection.weakRecommendationStructureDetected,
        unstableRecommendationOutcomeDetected: engine.detection.unstableRecommendationOutcomeDetected,
        unsafePromotionDominanceDetected: engine.detection.unsafePromotionDominanceDetected,
        lowConfidencePurchaseDecisionDetected: engine.detection.lowConfidencePurchaseDecisionDetected,
        trustValueImbalanceEscalationDetected: engine.detection.trustValueImbalanceEscalationDetected,
        conversionManipulationPressureDetected: engine.detection.conversionManipulationPressureDetected,
        decisionInconsistencyDetected: engine.detection.decisionInconsistencyDetected,
        unstableStrategicTradeoffDetected: engine.detection.unstableStrategicTradeoffDetected,
        trustworthyDecisionContinuity: engine.signals.trustworthyDecisionContinuity,
        recommendationIntegrityStability: engine.signals.recommendationIntegrityStability,
        balancedDecisionFormation: engine.signals.balancedDecisionFormation,
        contradictionCount: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        decisionWarnings: ["commerce_decision_intelligence_disabled"],
        decisionAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        graphExecutionHash: engine.signals.graphExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyCommerceDecisionStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeCommerceDecisionReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > COMMERCE_DECISION_MAX_DRIFT) anomalies.push("drift_escalation");
  if (engine.contradictions.contradictionCount >= 3) anomalies.push("contradiction_gate");
  if (strategic.rollbackTriggered || multiObjective.rollbackTriggered || intent.rollbackTriggered || memoryless.rollbackTriggered || marketReality.rollbackTriggered) {
    anomalies.push("upstream_instability");
  }

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-decision" && (!engine.balance.realityStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isCommerceDecisionIntelligenceMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isCommerceDecisionIntelligenceShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "replay-protect" &&
    !CHECK_LANES.has(engine.balance.routingLane);

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > COMMERCE_DECISION_MAX_DRIFT || engine.influence.decisionDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeCommerceDecisionReplayIntegrity({ preLinks, postLinks, signals: engine.signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeCommerceDecisionReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      signals: engine.signals,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeCommerceDecisionReplayIntegrity({
    preLinks,
    postLinks: finalPostLinks,
    signals: engine.signals,
  });

  const decisionWarnings: string[] = [];
  if (!isCommerceDecisionIntelligenceEnvironmentAllowed()) decisionWarnings.push("production_commerce_decision_blocked");
  if (engine.detection.unsafePromotionDominanceDetected) decisionWarnings.push("promotion_dominance");
  if (engine.detection.lowConfidencePurchaseDecisionDetected) decisionWarnings.push("low_purchase_confidence");
  if (engine.balance.routingLane === "consistency-check") decisionWarnings.push("consistency_gate");

  const analytics = buildCommerceDecisionAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    detection: engine.detection,
    contradictions: engine.contradictions,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildCommerceDecisionMonitoring({
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
      version: COMMERCE_DECISION_INTELLIGENCE_VERSION,
      decisionActive: isCommerceDecisionIntelligenceEnabled() && isCommerceDecisionIntelligenceEnvironmentAllowed(),
      decisionProfile: mode,
      decisionScore: engine.decisionScore,
      decisionDelta: engine.influence.decisionDelta,
      decisionConfidence: engine.balance.decisionConfidence,
      decisionQualityScore: engine.detection.decisionQualityScore,
      weakRecommendationStructureDetected: engine.detection.weakRecommendationStructureDetected,
      unstableRecommendationOutcomeDetected: engine.detection.unstableRecommendationOutcomeDetected,
      unsafePromotionDominanceDetected: engine.detection.unsafePromotionDominanceDetected,
      lowConfidencePurchaseDecisionDetected: engine.detection.lowConfidencePurchaseDecisionDetected,
      trustValueImbalanceEscalationDetected: engine.detection.trustValueImbalanceEscalationDetected,
      conversionManipulationPressureDetected: engine.detection.conversionManipulationPressureDetected,
      decisionInconsistencyDetected: engine.detection.decisionInconsistencyDetected,
      unstableStrategicTradeoffDetected: engine.detection.unstableStrategicTradeoffDetected,
      trustworthyDecisionContinuity: engine.signals.trustworthyDecisionContinuity,
      recommendationIntegrityStability: engine.signals.recommendationIntegrityStability,
      balancedDecisionFormation: engine.signals.balancedDecisionFormation,
      contradictionCount: engine.contradictions.contradictionCount,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      decisionWarnings: decisionWarnings.slice(0, 10),
      decisionAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      graphExecutionHash: engine.signals.graphExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicCommerceDecisionReplay };

export {
  isCommerceDecisionIntelligenceEnabled,
  isCommerceDecisionIntelligenceMutationEnabled,
  resolveCommerceDecisionIntelligenceMode,
  isCommerceDecisionIntelligenceEnvironmentAllowed,
} from "@/lib/commerceDecision/commerceDecisionFlags";

export { COMMERCE_DECISION_INTELLIGENCE_PROFILES } from "@/lib/commerceDecision/commerceDecisionProfiles";
