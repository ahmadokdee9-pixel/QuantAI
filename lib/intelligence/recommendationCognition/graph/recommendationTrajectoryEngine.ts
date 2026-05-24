/**
 * Phase 7 — Recommendation trajectory engine (shopping journey continuation).
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { LatentIntentProfile } from "../types";
import type { RecommendationReasoningResult } from "../cognition/recommendationReasoningKernel";

export type RecommendationTrajectory = {
  steps: string[];
  continuationId: string;
  journeyMaturity01: number;
};

const MAX_STEPS = 6;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function buildRecommendationTrajectory(args: {
  query: string;
  sessionMemory: CommerceSessionMemoryV1;
  intent: LatentIntentProfile;
  reasoning: RecommendationReasoningResult;
}): RecommendationTrajectory {
  const steps: string[] = ["scan_tray"];
  if (args.reasoning.explorationVsCommitment === "exploration") steps.push("explore_alternatives");
  if (args.intent.comparisonDriven01 >= 0.4) steps.push("compare_offers");
  if (args.intent.trustFirst01 >= 0.5) steps.push("filter_by_trust");
  if (args.intent.valueSeekingIntent01 >= 0.5) steps.push("optimize_value");
  if (args.intent.luxuryIntent01 >= 0.5) steps.push("premium_shortlist");
  if (args.sessionMemory.interactionCount >= 3) steps.push("repeat_visitor_narrowing");

  const journeyMaturity01 = round4(
    clamp01(args.sessionMemory.interactionCount / 10 * 0.5 + args.intent.analyticalShopping01 * 0.5)
  );

  const continuationId = steps.slice(0, MAX_STEPS).join(">") || "scan_only";

  return {
    steps: steps.slice(0, MAX_STEPS),
    continuationId,
    journeyMaturity01,
  };
}
