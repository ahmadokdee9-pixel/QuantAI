/**
 * Phase 11 — Deterministic brain execution + replay fingerprint.
 */

import type { CommerceBrainResult } from "../types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildBrainReplayFingerprint(result: CommerceBrainResult): string {
  const parts = [
    result.arbitration.primaryLayer,
    result.arbitration.secondaryLayer,
    Math.round(result.meta.brainConfidence01 * 100),
    result.meta.fusedSignalCount,
    result.synthesis.synthesisId,
    Math.round(result.synthesis.maxInfluence01 * 1000),
  ];
  return `brn_${fnv1aHex(parts.join("~"))}`;
}

export function assertBrainReplayDeterministic(
  a: CommerceBrainResult,
  b: CommerceBrainResult
): { ok: boolean; reason?: string } {
  if (a.replayFingerprint !== b.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (a.arbitration.primaryLayer !== b.arbitration.primaryLayer) {
    return { ok: false, reason: "arbitration_mismatch" };
  }
  return { ok: true };
}
