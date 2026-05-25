/**
 * Bounded recommendation influence — caps shadow influence (no live apply).
 */

import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";

const MAX_INFLUENCE = 0.12;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function computeBoundedInfluence(
  recommendationResult?: RecommendationCognitionResult | null,
  governanceConfidence01 = 0.5
): number {
  if (!recommendationResult?.meta.enabled) return 0;
  const top = recommendationResult.shadowCandidates[0];
  if (!top) return 0;
  const raw = (top.deterministicScore / 100) * governanceConfidence01 * 0.25;
  return round4(Math.min(MAX_INFLUENCE, raw));
}
