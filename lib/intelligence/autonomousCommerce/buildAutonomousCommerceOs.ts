/**
 * Phase 8 — Authoritative autonomous commerce OS (shadow-safe).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import { buildCanonicalProductGraph } from "@/lib/intelligence/identity/canonicalProductGraph";
import {
  EMPTY_COMMERCE_SESSION_MEMORY,
  type CommerceSessionMemoryV1,
} from "@/lib/intelligence/commerceSessionMemory";
import type {
  AutonomousCommerceOsInput,
  AutonomousCommerceOsResult,
  AutonomousCommerceOsMeta,
} from "./types";
import { AUTONOMOUS_COMMERCE_OS_VERSION } from "./types";
import { readAutonomousCommerceOsFlags } from "./flags";
import { runAutonomousCommerceKernel } from "./orchestrator/autonomousCommerceKernel";
import { buildCanonicalCommerceIntelligenceGraph } from "./graph/canonicalCommerceIntelligenceGraph";
import { buildAutonomousRecommendationStrategy } from "./strategy/autonomousRecommendationStrategy";
import { applyCommerceSafetyGovernance } from "./governance/commerceSafetyGovernance";
import { buildCommerceOsExplainability } from "./explain/commerceOsExplainability";
import {
  buildOrchestrationReplayFingerprint,
  verifyBoundedCognition,
} from "./replay/deterministicOrchestrationExecution";
import {
  snapshotAutonomousCommerceOrchestration,
  type AutonomousCommerceOrchestrationContext,
  type AutonomousCommerceOrchestrationSnapshot,
} from "./autonomousCommerceOrchestration";
import { MAX_COGNITION_BYTES } from "./replay/orchestrationReplayContracts";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type BuildAutonomousCommerceOsOptions = {
  orchestration?: AutonomousCommerceOrchestrationContext;
  sessionMemory?: CommerceSessionMemoryV1;
};

/**
 * Build autonomous commerce OS cognition. Does NOT mutate product ranking.
 */
export function buildAutonomousCommerceOs(
  input: AutonomousCommerceOsInput,
  options: BuildAutonomousCommerceOsOptions = {}
): AutonomousCommerceOsResult {
  const started = Date.now();
  const flags = readAutonomousCommerceOsFlags();
  const { products, query } = input;
  const sessionMemory =
    options.sessionMemory ?? input.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY;

  const empty = (): AutonomousCommerceOsResult => ({
    products,
    meta: {
      version: AUTONOMOUS_COMMERCE_OS_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      graphNodeCount: 0,
      strategyLayerCount: 0,
      avgStrategicConfidence: 0,
      safetyBlockedCount: 0,
      cognitionBytes: 0,
      latencyMs: Date.now() - started,
      market: { pressureScore: 0, momentumScore: 0 },
      economic: { fitScore: 0, instabilityScore: 0 },
    },
    market: {
      seasonalDemand01: 0,
      pricingPressure01: 0,
      inventoryScarcity01: 0,
      merchantVolatility01: 0,
      discountAnomaly01: 0,
      categoryMomentum01: 0,
      launchCycle01: 0,
      marketSaturation01: 0,
    },
    economic: {
      inflationSensitive01: 0,
      premiumCompression01: 0,
      valueMigration01: 0,
      regionalPattern01: 0,
      pricingInstability01: 0,
      seasonalAffordability01: 0,
    },
    explain: {
      whyNow: [],
      whyMarketShift: [],
      whyPricePressure: [],
      whyCategoryMomentum: [],
      whyEconomicFit: [],
      whyReplacementCycle: [],
      whyStrategicRecommendation: [],
    },
    strategicLayers: [],
    replayFingerprint: "aco_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const trustResult = input.trustResult ?? options.orchestration?.trustResult ?? null;
  const memoryResult = input.memoryResult ?? options.orchestration?.memoryResult ?? null;
  const recommendationResult =
    input.recommendationResult ?? options.orchestration?.recommendationResult ?? null;

  const canonicalProducts: CanonicalProductNode[] =
    input.canonicalProducts ??
    buildCanonicalProductGraph(
      products,
      options.orchestration?.normalizationMeta?.groups ?? []
    ).nodes;

  const kernel = runAutonomousCommerceKernel({
    query,
    products,
    sessionMemory,
    trustResult,
    memoryResult,
    recommendationResult,
  });

  const cognitionGraph = buildCanonicalCommerceIntelligenceGraph({
    canonicalProducts,
    trustResult,
    memoryResult,
    recommendationResult,
    kernel,
  });

  const strategy = buildAutonomousRecommendationStrategy({ kernel, recommendationResult });

  const safety = applyCommerceSafetyGovernance({
    layers: strategy.layers,
    trustResult,
    merchantVolatility01: kernel.market.conditions.merchantVolatility01,
    discountAnomaly01: kernel.market.conditions.discountAnomaly01,
  });

  const explain = buildCommerceOsExplainability({ kernel, strategy });

  const cognitionBytes = Math.min(
    MAX_COGNITION_BYTES,
    cognitionGraph.nodes.length * 64 +
      safety.allowedLayers.length * 48 +
      kernel.market.environment.nodes.length * 32
  );
  verifyBoundedCognition(cognitionBytes);

  const confidences = safety.allowedLayers.map((l) => l.confidence01);
  const avgStrategicConfidence =
    confidences.length > 0
      ? round4(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : 0;

  const meta: AutonomousCommerceOsMeta = {
    version: AUTONOMOUS_COMMERCE_OS_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    graphNodeCount: cognitionGraph.nodes.length,
    strategyLayerCount: safety.allowedLayers.length,
    avgStrategicConfidence,
    safetyBlockedCount: safety.blockedCount,
    cognitionBytes,
    latencyMs: Date.now() - started,
    market: {
      pressureScore: kernel.market.trend.pressureScore,
      momentumScore: kernel.market.trend.momentumScore,
    },
    economic: {
      fitScore: kernel.affordability.affordabilityFit01,
      instabilityScore: kernel.economic.pricingInstability01,
    },
  };

  const result: AutonomousCommerceOsResult = {
    products,
    meta,
    market: kernel.market.conditions,
    economic: kernel.economic,
    explain,
    strategicLayers: safety.allowedLayers,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildOrchestrationReplayFingerprint(result);
  return result;
}

export function autonomousCommerceOsMetaForSearch(
  result: AutonomousCommerceOsResult,
  orchestration?: AutonomousCommerceOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    autonomousCommerceOs: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      primaryScenario: result.strategicLayers[0]?.layerId ?? null,
    },
    autonomousCommerceOsShadow: {
      marketCognitionTraces: result.explain.whyMarketShift.slice(0, 4),
      economicTelemetry: {
        fitScore: result.meta.economic.fitScore,
        instabilityScore: result.meta.economic.instabilityScore,
        climate: result.explain.whyEconomicFit.slice(0, 2),
      },
      orchestrationMetrics: {
        graphNodes: result.meta.graphNodeCount,
        strategyLayers: result.meta.strategyLayerCount,
        safetyBlocked: result.meta.safetyBlockedCount,
      },
      strategicTelemetry: result.strategicLayers.slice(0, 4).map((l) => ({
        layerId: l.layerId,
        horizon: l.horizon,
        confidence01: l.confidence01,
        rankingMutation: false,
      })),
      explainSample: {
        whyNow: result.explain.whyNow.slice(0, 3),
        whyStrategicRecommendation: result.explain.whyStrategicRecommendation.slice(0, 3),
      },
      boundedCognition: {
        cognitionBytes: result.meta.cognitionBytes,
        diversityStability: result.meta.market.momentumScore,
      },
    },
  };
}

export { snapshotAutonomousCommerceOrchestration };
