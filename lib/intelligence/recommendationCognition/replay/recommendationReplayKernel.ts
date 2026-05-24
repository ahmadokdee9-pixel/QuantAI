/**
 * Phase 7 — Recommendation replay kernel (deterministic fingerprint).
 */

import type { RecommendationCognitionResult } from "../types";
import { DEFAULT_RECOMMENDATION_CONTRACT } from "../contracts/deterministicRecommendationContracts";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildRecommendationReplayFingerprint(result: RecommendationCognitionResult): string {
  const parts = [
    result.meta.candidateCount,
    result.meta.graphNodeCount,
    Math.round(result.meta.avgConfidence01 * 100),
    result.intentEvolution.trajectoryId,
    result.latentIntent.luxuryIntent01,
    result.latentIntent.valueSeekingIntent01,
    ...result.shadowCandidates
      .slice(0, 6)
      .map((c) => c.commerceId)
      .sort(),
  ];
  return `rcp_${fnv1aHex(parts.join("~"))}`;
}

export function assertRecommendationReplayDeterministic(
  runA: RecommendationCognitionResult,
  runB: RecommendationCognitionResult
): { ok: boolean; reason?: string } {
  if (runA.replayFingerprint !== runB.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (runA.meta.candidateCount !== runB.meta.candidateCount) {
    return { ok: false, reason: "candidate_count_mismatch" };
  }
  if (runA.meta.safetyBlockedCount !== runB.meta.safetyBlockedCount) {
    return { ok: false, reason: "safety_blocked_mismatch" };
  }
  return { ok: true };
}

export function isRecommendationExecutionBounded(latencyMs: number): boolean {
  return latencyMs <= DEFAULT_RECOMMENDATION_CONTRACT.maxLatencyMs * 3;
}
