/**
 * Phase 6 — Deterministic memory execution + replay fingerprint.
 */

import type { CommerceMemoryResult } from "../types";
import {
  DEFAULT_PREFERENCE_REPLAY_CONTRACT,
  MAX_MEMORY_GROWTH_BYTES,
} from "./preferenceReplayContracts";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildMemoryReplayFingerprint(result: CommerceMemoryResult): string {
  const parts = [
    result.meta.memoryNodeCount,
    result.meta.tasteProfileConfidence,
    Math.round(result.preferenceSignals.preferenceScore),
    result.recommendationPrep.length,
    result.canonicalTaste.aestheticProfile.minimalist01,
    result.canonicalTaste.aestheticProfile.luxury01,
    ...result.recommendationPrep
      .slice(0, 6)
      .map((n) => n.commerceId)
      .sort(),
  ];
  return `mmp_${fnv1aHex(parts.join("~"))}`;
}

export function assertMemoryReplayDeterministic(
  runA: CommerceMemoryResult,
  runB: CommerceMemoryResult
): { ok: boolean; reason?: string } {
  if (runA.replayFingerprint !== runB.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (runA.meta.memoryNodeCount !== runB.meta.memoryNodeCount) {
    return { ok: false, reason: "node_count_mismatch" };
  }
  if (runA.preferenceSignals.preferenceScore !== runB.preferenceSignals.preferenceScore) {
    return { ok: false, reason: "preference_score_mismatch" };
  }
  return { ok: true };
}

export function isMemoryExecutionBounded(latencyMs: number): boolean {
  return latencyMs <= DEFAULT_PREFERENCE_REPLAY_CONTRACT.maxLatencyMs * 3;
}

export function verifyBoundedMemoryGrowth(estimatedBytes: number): boolean {
  return estimatedBytes <= MAX_MEMORY_GROWTH_BYTES;
}
