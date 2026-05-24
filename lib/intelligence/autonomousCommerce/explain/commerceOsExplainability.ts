/**
 * Phase 8 — Commerce OS explainability (meta-only).
 */

import type { CommerceOsExplainability } from "../types";
import type { AutonomousCommerceKernelResult } from "../orchestrator/autonomousCommerceKernel";
import type { AutonomousRecommendationStrategy } from "../strategy/autonomousRecommendationStrategy";

export function buildCommerceOsExplainability(args: {
  kernel: AutonomousCommerceKernelResult;
  strategy: AutonomousRecommendationStrategy;
}): CommerceOsExplainability {
  const { kernel, strategy } = args;
  const whyNow: string[] = [];
  const whyMarketShift: string[] = [];
  const whyPricePressure: string[] = [];
  const whyCategoryMomentum: string[] = [];
  const whyEconomicFit: string[] = [];
  const whyReplacementCycle: string[] = [];
  const whyStrategicRecommendation: string[] = [];

  if (kernel.market.conditions.launchCycle01 >= 0.45 || kernel.market.conditions.inventoryScarcity01 >= 0.4) {
    whyNow.push("timing_sensitive_window");
  }
  whyMarketShift.push(`dominant_pressure_${kernel.market.trend.dominantPressure}`);
  if (kernel.market.conditions.pricingPressure01 >= 0.4) {
    whyPricePressure.push("elevated_pricing_pressure");
  }
  if (kernel.market.conditions.categoryMomentum01 >= 0.35) {
    whyCategoryMomentum.push("category_momentum_detected");
  }
  whyEconomicFit.push(`climate_${kernel.climate.climate}`);
  whyEconomicFit.push(`affordability_fit_${Math.round(kernel.affordability.affordabilityFit01 * 100)}`);
  if (strategy.replacementCycle01 >= 0.4) {
    whyReplacementCycle.push("replacement_cycle_signal");
  }
  for (const layer of strategy.layers.slice(0, 3)) {
    whyStrategicRecommendation.push(`${layer.layerId}_${layer.horizon}`);
  }

  return {
    whyNow: whyNow.slice(0, 5),
    whyMarketShift: whyMarketShift.slice(0, 5),
    whyPricePressure: whyPricePressure.slice(0, 5),
    whyCategoryMomentum: whyCategoryMomentum.slice(0, 5),
    whyEconomicFit: whyEconomicFit.slice(0, 5),
    whyReplacementCycle: whyReplacementCycle.slice(0, 5),
    whyStrategicRecommendation: whyStrategicRecommendation.slice(0, 6),
  };
}
