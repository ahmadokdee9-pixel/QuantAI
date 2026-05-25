/**
 * Phase 10 — Market timing adaptation (deterministic).
 */

import type { SeasonalEvolutionProfile } from "../types";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function adaptMarketTiming(args: {
  seasonal: SeasonalEvolutionProfile;
  commerceOs?: AutonomousCommerceOsResult | null;
}): { timingScore01: number; timingLabel: string } {
  const marketMomentum = args.commerceOs?.market.categoryMomentum01 ?? 0.3;
  const pressure = args.commerceOs?.meta.market.pressureScore ?? 0.3;
  const timingScore01 = round4(
    args.seasonal.launchWindow01 * 0.35 +
      args.seasonal.holidayProximity01 * 0.25 +
      marketMomentum * 0.2 +
      (1 - pressure) * 0.2
  );
  const timingLabel =
    timingScore01 >= 0.55 ? "buy_window" : timingScore01 >= 0.35 ? "watch_window" : "defer_window";
  return { timingScore01, timingLabel };
}
