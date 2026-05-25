/**
 * Phase 10 — Temporal recommendation reasoning (long-horizon shadow).
 */

import type { CommerceLifecycleProfile } from "../types";
import type { SeasonalEvolutionProfile } from "../types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";

export type TemporalReasoningResult = {
  horizon: "immediate" | "seasonal" | "replacement_cycle";
  adaptationConfidence01: number;
  reasoningChain: string[];
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function reasonTemporalRecommendation(args: {
  lifecycle: CommerceLifecycleProfile;
  seasonal: SeasonalEvolutionProfile;
  recommendationResult?: RecommendationCognitionResult | null;
  timingScore01: number;
}): TemporalReasoningResult {
  const chain: string[] = [];
  let horizon: TemporalReasoningResult["horizon"] = "immediate";

  if (args.lifecycle.phase === "replacement" || args.lifecycle.replacementCycle01 >= 0.5) {
    horizon = "replacement_cycle";
    chain.push("replacement_cycle_active");
  } else if (args.seasonal.holidayProximity01 >= 0.45 || args.seasonal.seasonalShift01 >= 0.45) {
    horizon = "seasonal";
    chain.push("seasonal_window");
  } else {
    chain.push("session_horizon");
  }

  const recConf = args.recommendationResult?.meta.avgConfidence01 ?? 0.4;
  const adaptationConfidence01 = round4(
    clamp01(recConf * 0.35 + args.lifecycle.lifecycleMaturity01 * 0.25 + args.timingScore01 * 0.4)
  );
  chain.push(`timing_${args.timingScore01 >= 0.5 ? "favorable" : "neutral"}`);

  return { horizon, adaptationConfidence01, reasoningChain: chain.slice(0, 6) };
}
