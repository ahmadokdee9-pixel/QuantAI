/**
 * Phase 7 — Commerce intent evolution tracker.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { LatentIntentProfile, IntentEvolutionSnapshot } from "../types";
import type { RecommendationReasoningResult } from "../cognition/recommendationReasoningKernel";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function trackIntentEvolution(args: {
  query: string;
  sessionMemory: CommerceSessionMemoryV1;
  intent: LatentIntentProfile;
  reasoning: RecommendationReasoningResult;
  memoryResult?: CommerceMemoryResult | null;
}): IntentEvolutionSnapshot {
  const memConf = args.memoryResult?.preferenceSignals.confidence01 ?? 0.35;
  const prevConf = memConf * 0.9;
  const confidenceShift01 = round4(Math.abs(memConf - prevConf));

  const exploration01 =
    args.reasoning.explorationVsCommitment === "exploration"
      ? 0.7
      : args.reasoning.explorationVsCommitment === "commitment"
        ? 0.25
        : 0.5;
  const commitment01 = 1 - exploration01 * 0.6;

  const catCount = Object.keys(args.sessionMemory.categoryAffinity).length;
  const funnelNarrowing01 = round4(clamp01(catCount > 0 ? 1 / catCount : 0.3));
  const shoppingMaturity01 = round4(clamp01(args.sessionMemory.interactionCount / 12));
  const repeatPattern01 = round4(clamp01(args.sessionMemory.interactionCount > 2 ? 0.65 : 0.2));

  const trajectoryId = [
    args.query.slice(0, 12).replace(/\s/g, "_"),
    `m${Math.round(shoppingMaturity01 * 10)}`,
    args.reasoning.explorationVsCommitment,
  ].join(":");

  return {
    exploration01: round4(exploration01),
    commitment01: round4(commitment01),
    shoppingMaturity01,
    funnelNarrowing01,
    confidenceShift01,
    repeatPattern01,
    trajectoryId,
  };
}
