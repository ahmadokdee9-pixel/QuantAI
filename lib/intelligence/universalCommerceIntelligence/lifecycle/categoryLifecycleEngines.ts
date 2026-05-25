/**
 * Phase 16 — Category-specific lifecycle reasoning.
 */

import type { PredictiveCommerceIntentResult } from "@/lib/intelligence/predictiveCommerceIntent/types";
import type { UniversalVerticalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveCategoryLifecycle(args: {
  dominantVertical: UniversalVerticalId;
  predictive?: PredictiveCommerceIntentResult | null;
}): { phase: string; verticalTiming01: number } {
  const phase = args.predictive?.lifecycleForecast.phase ?? "discovery";
  const base = args.predictive?.lifecycleForecast.forecast01 ?? 0.25;
  const verticalBoost =
    args.dominantVertical === "electronics" || args.dominantVertical === "gaming" ? 0.1 : 0.05;
  return { phase, verticalTiming01: round4(Math.min(1, base + verticalBoost)) };
}
