/**
 * Anti-manipulation governor — blocks addictive / monopoly patterns.
 */

import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";

export type AntiManipulationVerdict = {
  allowed: boolean;
  reasons: string[];
};

export function evaluateAntiManipulation(args: {
  recommendationResult?: RecommendationCognitionResult | null;
  merchantDiversity01: number;
  priorLinkCount?: number;
}): AntiManipulationVerdict {
  const reasons: string[] = [];
  const fakeMax = args.recommendationResult
    ? Math.max(...args.recommendationResult.shadowCandidates.map((c) => c.confidence01), 0)
    : 0;

  if (args.merchantDiversity01 < 0.15) reasons.push("merchant_monopolization");
  if ((args.priorLinkCount ?? 0) > 12) reasons.push("anti_loop_recursion");
  if (fakeMax > 0.95) reasons.push("over_personalization_drift");

  const safetyBlocked = args.recommendationResult?.meta.safetyBlockedCount ?? 0;
  if (safetyBlocked > 5) reasons.push("unstable_recommendation_recursion");

  return { allowed: reasons.length === 0, reasons };
}
