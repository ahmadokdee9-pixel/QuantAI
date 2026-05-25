/**
 * Phase 10 — Intent transition tracking across session evolution.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { IntentTransitionSnapshot } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function trackIntentTransition(args: {
  query: string;
  sessionMemory: CommerceSessionMemoryV1;
  recommendationResult?: RecommendationCognitionResult | null;
}): IntentTransitionSnapshot {
  const dominant = args.recommendationResult
    ? Object.entries(args.recommendationResult.latentIntent)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral"
    : "neutral";
  const prior =
    args.sessionMemory.lastPersonas[0] ??
    args.sessionMemory.styleTags[0] ??
    "exploration";
  const explorationToCommitment01 = round4(
    (args.recommendationResult?.intentEvolution.commitment01 ?? 0.3) -
      (args.recommendationResult?.intentEvolution.exploration01 ?? 0.4) +
      0.5
  );
  const transitionStrength01 = round4(
    Math.min(1, args.sessionMemory.interactionCount / 8) * 0.5 + explorationToCommitment01 * 0.5
  );

  return {
    fromIntent: String(prior),
    toIntent: dominant.replace(/01$/, ""),
    transitionStrength01,
    explorationToCommitment01: round4(Math.min(1, Math.max(0, explorationToCommitment01))),
  };
}
