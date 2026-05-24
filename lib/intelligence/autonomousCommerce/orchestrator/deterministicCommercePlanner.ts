/**
 * Phase 8 — Deterministic commerce planner (scenario evaluation).
 */

import type { StrategicRecommendationLayer } from "../types";
import type { TrendPressureSnapshot } from "../market/trendPressureAnalyzer";
import type { PricingClimate } from "../economic/pricingClimateAnalyzer";

export type CommercePlanScenario = {
  scenarioId: string;
  trustValueBalance01: number;
  diversityBalance01: number;
  timingSensitivity01: number;
  rankingMutation: false;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function planCommerceScenarios(args: {
  layers: StrategicRecommendationLayer[];
  trend: TrendPressureSnapshot;
  climate: PricingClimate;
  diversityStability01: number;
}): CommercePlanScenario[] {
  const avgConf =
    args.layers.length > 0
      ? args.layers.reduce((s, l) => s + l.confidence01, 0) / args.layers.length
      : 0.4;

  return [
    {
      scenarioId: "trust_value_balanced",
      trustValueBalance01: round4(clamp01(avgConf * 0.6 + (1 - args.trend.pressureScore) * 0.4)),
      diversityBalance01: round4(args.diversityStability01),
      timingSensitivity01: round4(args.trend.momentumScore),
      rankingMutation: false,
    },
    {
      scenarioId: `climate_${args.climate.climate}`,
      trustValueBalance01: round4(clamp01(avgConf * 0.5)),
      diversityBalance01: round4(args.diversityStability01 * 0.9),
      timingSensitivity01: round4(args.trend.momentumScore * 0.85),
      rankingMutation: false,
    },
  ];
}
