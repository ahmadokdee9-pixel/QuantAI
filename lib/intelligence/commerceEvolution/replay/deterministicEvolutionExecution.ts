/**
 * Phase 10 — Deterministic evolution execution + replay fingerprint.
 */

import type { CommerceEvolutionResult } from "../types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildEvolutionReplayFingerprint(result: CommerceEvolutionResult): string {
  const parts = [
    result.meta.graphNodeCount,
    result.meta.candidateCount,
    result.lifecycle.phase,
    Math.round(result.meta.evolutionConfidence01 * 100),
    result.intentTransition.toIntent,
    ...result.shadowCandidates.map((c) => c.adaptationId).sort(),
  ];
  return `evo_${fnv1aHex(parts.join("~"))}`;
}

export function assertEvolutionReplayDeterministic(
  a: CommerceEvolutionResult,
  b: CommerceEvolutionResult
): { ok: boolean; reason?: string } {
  if (a.replayFingerprint !== b.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (a.lifecycle.phase !== b.lifecycle.phase) {
    return { ok: false, reason: "lifecycle_mismatch" };
  }
  return { ok: true };
}
