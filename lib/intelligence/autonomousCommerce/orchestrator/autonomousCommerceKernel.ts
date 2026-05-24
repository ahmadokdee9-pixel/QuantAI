/**
 * Phase 8 — Autonomous commerce kernel (orchestrates market + economic + strategy).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import { runMarketAwarenessEngine } from "../market/marketAwarenessEngine";
import { interpretEconomicSignals } from "../economic/economicSignalInterpreter";
import { analyzePricingClimate } from "../economic/pricingClimateAnalyzer";
import { computeAffordabilityContext } from "../economic/affordabilityContextEngine";
import { resolveRegionalDynamics } from "../economic/regionalCommerceDynamics";
import { buildBoundedStrategies } from "./boundedStrategyEngine";
import { planCommerceScenarios } from "./deterministicCommercePlanner";
import { orchestrateCommerceDecisions } from "./commerceDecisionOrchestrator";

export type AutonomousCommerceKernelResult = {
  market: ReturnType<typeof runMarketAwarenessEngine>;
  economic: ReturnType<typeof interpretEconomicSignals>;
  climate: ReturnType<typeof analyzePricingClimate>;
  affordability: ReturnType<typeof computeAffordabilityContext>;
  regional: ReturnType<typeof resolveRegionalDynamics>;
  layers: ReturnType<typeof buildBoundedStrategies>;
  scenarios: ReturnType<typeof planCommerceScenarios>;
  decision: ReturnType<typeof orchestrateCommerceDecisions>;
};

export function runAutonomousCommerceKernel(args: {
  query: string;
  products: QuantProduct[];
  sessionMemory: CommerceSessionMemoryV1;
  trustResult?: TrustEngineResult | null;
  memoryResult?: CommerceMemoryResult | null;
  recommendationResult?: RecommendationCognitionResult | null;
}): AutonomousCommerceKernelResult {
  const market = runMarketAwarenessEngine({
    query: args.query,
    products: args.products,
    trustResult: args.trustResult,
  });
  const economic = interpretEconomicSignals({
    query: args.query,
    market: market.conditions,
    memoryResult: args.memoryResult,
    regionHint: undefined,
  });
  const climate = analyzePricingClimate(market.conditions, economic);
  const affordability = computeAffordabilityContext({
    products: args.products,
    economic,
    sessionMemory: args.sessionMemory,
  });
  const regional = resolveRegionalDynamics(args.query, economic);
  const layers = buildBoundedStrategies({
    market: market.conditions,
    economic,
    recommendationResult: args.recommendationResult,
  });
  const diversityStability01 = args.recommendationResult?.meta.diversityStability01 ?? 0.5;
  const scenarios = planCommerceScenarios({
    layers,
    trend: market.trend,
    climate,
    diversityStability01,
  });
  const decision = orchestrateCommerceDecisions({ scenarios, layers });

  return {
    market,
    economic,
    climate,
    affordability,
    regional,
    layers,
    scenarios,
    decision,
  };
}
