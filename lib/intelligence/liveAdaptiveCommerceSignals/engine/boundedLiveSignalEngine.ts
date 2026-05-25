/**
 * Phase 12 — Bounded live signal engine (orchestrates all analyzers).
 */

import type { LiveCommerceSignalsInput } from "../types";
import { interpretLiveMarketSignals } from "../signals/liveMarketSignalInterpreter";
import { detectCommerceMomentum } from "../signals/commerceMomentumDetector";
import { analyzeRegionalCommerceDynamics } from "../signals/regionalCommerceIntelligence";
import { analyzeCategoryTrendPressure } from "../pressure/marketPressureAnalyzer";
import { resolveMacroCommerceTiming } from "../macro/macroCommerceTiming";
import { trackDemandMigration } from "../demand/demandMigrationTracker";
import { evolvePricingClimate } from "../climate/pricingClimateEvolution";
import { trackMerchantEcosystemMovement } from "../merchant/merchantEcosystemMovement";
import { resolveLifecycleWave } from "../lifecycle/lifecycleWaveIntelligence";
import { measureSeasonalAcceleration } from "../seasonal/seasonalAcceleration";
import { interpretCommerceVolatility } from "../volatility/commerceVolatilityInterpreter";
import {
  applyTrustWeightedMarketSignals,
  buildTrustWeightedAnchor,
} from "../trust/trustWeightedMarketSignals";
import { buildTemporalMarketMemory } from "../memory/temporalMarketMemory";
import {
  fuseDeterministicLiveSignals,
  computeFusedLiveScore,
} from "../kernel/deterministicSignalFusionKernel";
import { buildCommerceTimingGraph } from "../graph/commerceTimingGraph";
import { buildShadowSignalInfluenceGraph } from "../graph/shadowSignalInfluenceGraph";
import { buildBoundedAdaptiveForecast } from "../forecast/boundedAdaptiveForecast";
import { arbitrateLiveSignalGovernance } from "../governance/governanceSignalArbitration";
import { buildShadowLiveSignalCandidates } from "../candidates/shadowLiveSignalCandidates";
import { buildSignalExplainability } from "../explain/signalExplainability";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export type BoundedLiveSignalEngineResult = Omit<
  import("../types").LiveCommerceSignalsResult,
  "products" | "meta" | "replayFingerprint"
> & {
  signalConfidence01: number;
  governanceAllowed: boolean;
  volatilityBand: "low" | "moderate" | "elevated";
};

export function runBoundedLiveSignalEngine(
  input: LiveCommerceSignalsInput,
  maxInfluence01: number
): BoundedLiveSignalEngineResult {
  const marketInterpretation = interpretLiveMarketSignals({
    query: input.query,
    products: input.products,
    commerceOs: input.commerceOs,
  });
  const momentum = detectCommerceMomentum({
    products: input.products,
    commerceOs: input.commerceOs,
  });
  const regional = analyzeRegionalCommerceDynamics({
    query: input.query,
    commerceOs: input.commerceOs,
  });
  const categoryPressure = analyzeCategoryTrendPressure({
    products: input.products,
    commerceOs: input.commerceOs,
  });
  const macroTiming = resolveMacroCommerceTiming(input.query);
  const demandShift = trackDemandMigration({
    query: input.query,
    evolution: input.evolution,
  });
  const pricingClimate = evolvePricingClimate(input.commerceOs);
  const merchantEcosystem = trackMerchantEcosystemMovement({
    products: input.products,
    commerceOs: input.commerceOs,
  });
  const lifecycleWave = resolveLifecycleWave(input.evolution);
  const seasonal = measureSeasonalAcceleration(input.evolution);
  const volatility = interpretCommerceVolatility({
    products: input.products,
    commerceOs: input.commerceOs,
  });

  const rawSignals = [
    { signalId: "market_interpretation" as const, strength01: marketInterpretation.liveMarketScore01 },
    { signalId: "momentum" as const, strength01: momentum.momentum01 },
    { signalId: "regional" as const, strength01: regional.regionalPressure01 },
    { signalId: "category_pressure" as const, strength01: categoryPressure.pressure01 },
    { signalId: "macro_timing" as const, strength01: macroTiming.macroScore01 },
    { signalId: "demand_shift" as const, strength01: demandShift.shift01 },
    { signalId: "pricing_climate" as const, strength01: pricingClimate.evolution01 },
    { signalId: "merchant_ecosystem" as const, strength01: merchantEcosystem.movement01 },
    { signalId: "lifecycle_wave" as const, strength01: lifecycleWave.wave01 },
    { signalId: "seasonal_accel" as const, strength01: seasonal.acceleration01 },
    { signalId: "volatility" as const, strength01: volatility.volatility01 },
    buildTrustWeightedAnchor(input.trust),
  ];

  let fusedSignals = fuseDeterministicLiveSignals(rawSignals);
  fusedSignals = applyTrustWeightedMarketSignals(fusedSignals, input.trust);

  const memory = buildTemporalMarketMemory(input);
  const timingGraph = buildCommerceTimingGraph({
    memory,
    macroScore01: macroTiming.macroScore01,
    momentum01: momentum.momentum01,
    lifecycleWave01: lifecycleWave.wave01,
  });

  const fusedScore = computeFusedLiveScore(fusedSignals);
  const signalConfidence01 = round4(
    clamp01(
      fusedScore * 0.4 +
        momentum.acceleration01 * 0.2 +
        (input.brain?.meta.brainConfidence01 ?? 0.3) * 0.25 +
        (input.trust?.meta.enabled ? 0.15 : 0.05)
    )
  );

  const governance = arbitrateLiveSignalGovernance(
    input,
    signalConfidence01,
    volatility.band
  );

  const forecast = buildBoundedAdaptiveForecast({
    momentum01: momentum.momentum01,
    macroScore01: macroTiming.macroScore01,
    demandShift01: demandShift.shift01,
    volatility01: volatility.volatility01,
    governanceAllowed: governance.allowed,
  });

  const influenceGraph = buildShadowSignalInfluenceGraph(fusedSignals);
  const shadowCandidates = buildShadowLiveSignalCandidates({
    signals: fusedSignals,
    governance,
    maxInfluence01,
  });

  const explain = buildSignalExplainability({
    movementLabel: marketInterpretation.movementLabel,
    momentum01: momentum.momentum01,
    regionLabel: regional.regionLabel,
    demandDirection: demandShift.direction,
    volatilityBand: volatility.band,
    governance,
    fusedCount: fusedSignals.length,
  });

  return {
    marketInterpretation,
    momentum,
    regional,
    categoryPressure,
    macroTiming,
    demandShift,
    pricingClimate,
    merchantEcosystem,
    lifecycleWave,
    seasonal,
    volatility,
    fusedSignals,
    timingGraph,
    forecast,
    influenceGraph,
    shadowCandidates,
    explain,
    signalConfidence01,
    governanceAllowed: governance.allowed,
    volatilityBand: volatility.band,
  };
}
