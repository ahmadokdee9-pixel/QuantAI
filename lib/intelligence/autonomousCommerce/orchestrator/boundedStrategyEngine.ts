/**
 * Phase 8 — Bounded strategy engine (deterministic strategic layers).
 */

import type { MarketConditionProfile } from "../types";
import type { EconomicContextProfile } from "../types";
import type { StrategicRecommendationLayer } from "../types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";

const MAX_LAYERS = 6;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function buildBoundedStrategies(args: {
  market: MarketConditionProfile;
  economic: EconomicContextProfile;
  recommendationResult?: RecommendationCognitionResult | null;
}): StrategicRecommendationLayer[] {
  const layers: StrategicRecommendationLayer[] = [];
  const recConf = args.recommendationResult?.meta.avgConfidence01 ?? 0.4;

  if (args.market.launchCycle01 >= 0.45) {
    layers.push({
      layerId: "upgrade_timing",
      horizon: "immediate",
      confidence01: round4(clamp01(args.market.launchCycle01 * 0.7 + recConf * 0.3)),
      rankingMutation: false,
    });
  }
  if (args.market.seasonalDemand01 >= 0.4) {
    layers.push({
      layerId: "seasonal_window",
      horizon: "seasonal",
      confidence01: round4(args.market.seasonalDemand01),
      rankingMutation: false,
    });
  }
  if (args.economic.valueMigration01 >= 0.45) {
    layers.push({
      layerId: "value_retention",
      horizon: "immediate",
      confidence01: round4(args.economic.valueMigration01),
      rankingMutation: false,
    });
  }
  const upgrade = args.recommendationResult?.latentIntent.upgradeIntent01 ?? 0;
  if (upgrade >= 0.4) {
    layers.push({
      layerId: "ecosystem_completion",
      horizon: "replacement_cycle",
      confidence01: round4(upgrade),
      rankingMutation: false,
    });
  }
  if (args.market.inventoryScarcity01 >= 0.35) {
    layers.push({
      layerId: "scarcity_timing",
      horizon: "immediate",
      confidence01: round4(args.market.inventoryScarcity01),
      rankingMutation: false,
    });
  }

  return layers.slice(0, MAX_LAYERS);
}
