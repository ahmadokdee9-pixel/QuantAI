/**
 * Phase 8 — Autonomous recommendation strategy (long-horizon shadow prep).
 */

import type { StrategicRecommendationLayer } from "../types";
import type { AutonomousCommerceKernelResult } from "../orchestrator/autonomousCommerceKernel";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";

export type AutonomousRecommendationStrategy = {
  layers: StrategicRecommendationLayer[];
  upgradeTiming01: number;
  replacementCycle01: number;
  ecosystemCompletion01: number;
  valueRetention01: number;
  rankingMutation: false;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function buildAutonomousRecommendationStrategy(args: {
  kernel: AutonomousCommerceKernelResult;
  recommendationResult?: RecommendationCognitionResult | null;
}): AutonomousRecommendationStrategy {
  const latent = args.recommendationResult?.latentIntent;
  const upgradeTiming01 = round4(
    clamp01((latent?.upgradeIntent01 ?? 0.2) * 0.5 + args.kernel.market.conditions.launchCycle01 * 0.5)
  );
  const replacementCycle01 = round4(
    clamp01((latent?.analyticalShopping01 ?? 0.3) * 0.4 + args.kernel.market.conditions.marketSaturation01 * 0.35)
  );
  const ecosystemCompletion01 = round4(
    clamp01((latent?.comparisonDriven01 ?? 0.25) * 0.35 + args.kernel.decision.orchestrationScore * 0.4)
  );
  const valueRetention01 = round4(args.kernel.economic.valueMigration01);

  return {
    layers: args.kernel.layers,
    upgradeTiming01,
    replacementCycle01,
    ecosystemCompletion01,
    valueRetention01,
    rankingMutation: false,
  };
}
