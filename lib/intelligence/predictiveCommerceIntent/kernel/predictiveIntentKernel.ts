/**
 * Phase 14 — Predictive intent kernel.
 */

import type { PredictiveCommerceIntentInput, PredictionAxisId } from "../types";
import {
  EMPTY_COMMERCE_SESSION_MEMORY,
  type CommerceSessionMemoryV1,
} from "@/lib/intelligence/commerceSessionMemory";
import { scoreIntentReadiness } from "../scoring/intentReadinessScoring";
import { estimateFuturePurchaseProbability } from "../scoring/futurePurchaseProbability";
import { computePredictiveConfidence } from "../scoring/predictiveConfidenceEngine";
import { predictReplacementCycle } from "../forecast/replacementCyclePrediction";
import { predictUpgradeTiming } from "../forecast/upgradeTimingPrediction";
import { forecastLifecycle } from "../forecast/lifecycleForecastingEngine";
import { predictTemporalBuying } from "../forecast/temporalBuyingPrediction";
import { forecastSeasonalPurchase } from "../forecast/seasonalPurchaseForecast";
import { predictTrendAlignment } from "../forecast/trendAlignmentPrediction";
import { modelCommerceUrgency } from "../urgency/commerceUrgencyModel";
import { trackIntentMomentum } from "../momentum/intentMomentumTracking";
import { detectDemandAcceleration } from "../demand/demandAccelerationSignals";
import { weightRegionalPrediction } from "../regional/regionalPredictiveWeighting";
import { modelDeterministicFutureState } from "../model/deterministicFutureStateModel";
import {
  fuseDeterministicPredictions,
  computeFusedPredictionScore,
} from "../fusion/deterministicPredictionFusionEngine";
import { applyTrustAwarePredictionFusion } from "../trust/trustAwarePredictionFusion";
import { buildPredictiveIntentGraph } from "../graph/predictiveIntentGraph";
import { buildFutureCommerceGraph } from "../graph/futureCommerceGraph";
import { buildReplaySafePredictiveMemory } from "../memory/replaySafePredictiveMemory";
import { trackBoundedPredictiveEvolution } from "../evolution/boundedPredictiveEvolutionTracker";
import { orchestrateCommerceTiming } from "../timing/commerceTimingOrchestrator";
import { arbitratePredictionGovernance } from "../governance/predictionArbitration";
import { buildShadowPredictiveCandidates } from "../candidates/shadowPredictiveCandidates";
import { computeBoundedPredictiveInfluence } from "../influence/boundedPredictiveInfluence";
import { buildPredictionExplainability } from "../explain/predictionExplainability";

export type PredictiveIntentKernelResult = Omit<
  import("../types").PredictiveCommerceIntentResult,
  "products" | "meta" | "replayFingerprint"
> & {
  predictionConfidence01: number;
  governanceAllowed: boolean;
};

export function runPredictiveIntentKernel(
  input: PredictiveCommerceIntentInput,
  sessionMemory: CommerceSessionMemoryV1,
  maxInfluence01: number
): PredictiveIntentKernelResult {
  const intentPersistence01 = input.commerceIdentity?.intentPersistence.persistence01 ?? 0.25;
  const maturity01 = input.commerceIdentity?.maturity.maturity01 ?? 0.2;
  const macroScore01 = input.liveSignals?.macroTiming.macroScore01 ?? 0.3;

  const readiness = scoreIntentReadiness({
    query: input.query,
    interactionCount: sessionMemory.interactionCount,
    intentPersistence01,
  });
  const momentum = trackIntentMomentum(input.liveSignals);
  const urgency = modelCommerceUrgency(input.query);
  const replacementCycle = predictReplacementCycle({
    query: input.query,
    evolution: input.evolution,
  });
  const upgradeTiming = predictUpgradeTiming(input.query);
  const lifecycleForecast = forecastLifecycle({
    evolution: input.evolution,
    commerceIdentity: input.commerceIdentity,
  });
  const seasonalForecast = forecastSeasonalPurchase({
    query: input.query,
    evolution: input.evolution,
  });
  const regionalWeight = weightRegionalPrediction(input.commerceIdentity);
  const trendAlignment = predictTrendAlignment(input.liveSignals);
  const demandAcceleration = detectDemandAcceleration(input.liveSignals);

  const purchaseProbability = estimateFuturePurchaseProbability({
    readiness01: readiness.readiness01,
    momentum01: momentum.momentum01,
    maturity01,
  });
  const temporalBuying = predictTemporalBuying({
    readiness01: readiness.readiness01,
    urgency01: urgency.urgency01,
    macroScore01,
  });
  const futureState = modelDeterministicFutureState({
    purchaseProbability01: purchaseProbability.probability01,
    readiness01: readiness.readiness01,
    lifecycleForecast01: lifecycleForecast.forecast01,
  });

  const predictiveMemory = buildReplaySafePredictiveMemory({
    query: input.query,
    interactionCount: sessionMemory.interactionCount,
  });
  void trackBoundedPredictiveEvolution(sessionMemory.interactionCount);
  const timing = orchestrateCommerceTiming({
    memory: predictiveMemory,
    temporalHorizon: temporalBuying.horizon,
    urgency01: urgency.urgency01,
    readiness01: readiness.readiness01,
  });
  void timing;

  const rawAxes: { axisId: PredictionAxisId; strength01: number }[] = [
    { axisId: "readiness", strength01: readiness.readiness01 },
    { axisId: "purchase_probability", strength01: purchaseProbability.probability01 },
    { axisId: "replacement", strength01: replacementCycle.cycle01 },
    { axisId: "upgrade", strength01: upgradeTiming.timing01 },
    { axisId: "urgency", strength01: urgency.urgency01 },
    { axisId: "momentum", strength01: momentum.momentum01 },
    { axisId: "demand_accel", strength01: demandAcceleration.accel01 },
    { axisId: "temporal", strength01: temporalBuying.score01 },
    { axisId: "lifecycle", strength01: lifecycleForecast.forecast01 },
    { axisId: "seasonal", strength01: seasonalForecast.forecast01 },
    { axisId: "regional", strength01: regionalWeight.weight01 },
    { axisId: "trend", strength01: trendAlignment.alignment01 },
    { axisId: "confidence", strength01: futureState.confidence01 },
  ];

  let fusedSignals = fuseDeterministicPredictions(rawAxes);
  fusedSignals = applyTrustAwarePredictionFusion(fusedSignals, input.trust);
  const fusedScore = computeFusedPredictionScore(fusedSignals);

  const intentGraph = buildPredictiveIntentGraph(
    rawAxes.map((a) => ({ axis: a.axisId, score01: a.strength01 }))
  );
  const futureGraph = buildFutureCommerceGraph({
    temporalHorizon: temporalBuying.horizon,
    replacementCycle01: replacementCycle.cycle01,
    purchaseProbability01: purchaseProbability.probability01,
    seasonalForecast01: seasonalForecast.forecast01,
  });

  const governance = arbitratePredictionGovernance(input, 0);
  const predictionConfidence01 = computePredictiveConfidence({
    fusedScore01: fusedScore,
    readiness01: readiness.readiness01,
    purchaseProbability01: purchaseProbability.probability01,
    trustEnabled: input.trust?.meta.enabled ?? false,
    governanceAllowed: true,
  });
  const governanceFinal = arbitratePredictionGovernance(input, predictionConfidence01);

  const shadowCandidates = buildShadowPredictiveCandidates({
    signals: fusedSignals,
    governance: governanceFinal,
    maxInfluence01,
  });
  void computeBoundedPredictiveInfluence(fusedSignals, maxInfluence01, governanceFinal.allowed);

  const traceExamples = fusedSignals.map((s) => `${s.axisId}:${s.trustAdjusted01}`);
  const explain = buildPredictionExplainability({
    readinessLabel: readiness.label,
    purchaseHorizon: purchaseProbability.horizon,
    urgencyTier: urgency.tier,
    timingHorizon: temporalBuying.horizon,
    governance: governanceFinal,
    fusedCount: fusedSignals.length,
    traceExamples,
  });

  return {
    readiness,
    purchaseProbability,
    replacementCycle,
    upgradeTiming,
    urgency,
    momentum,
    demandAcceleration,
    temporalBuying,
    lifecycleForecast,
    seasonalForecast,
    regionalWeight,
    trendAlignment,
    futureState,
    fusedSignals,
    intentGraph,
    futureGraph,
    shadowCandidates,
    explain,
    predictionConfidence01,
    governanceAllowed: governanceFinal.allowed,
  };
}

export { EMPTY_COMMERCE_SESSION_MEMORY };
