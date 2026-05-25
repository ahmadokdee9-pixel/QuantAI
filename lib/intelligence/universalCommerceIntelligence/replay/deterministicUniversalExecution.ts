/**
 * Phase 16 — Deterministic universal execution + replay fingerprint.
 */

import type { UniversalCommerceIntelligenceResult } from "../types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildUniversalReplayFingerprint(result: UniversalCommerceIntelligenceResult): string {
  const parts = [
    result.meta.dominantVertical,
    Math.round(result.meta.universalConfidence01 * 100),
    result.premiumUtility.bias,
    result.aesthetic.label,
    result.meta.verticalCount,
    result.meta.fusedAxisCount,
  ];
  return `uci_${fnv1aHex(parts.join("~"))}`;
}

export function assertUniversalReplayDeterministic(
  a: UniversalCommerceIntelligenceResult,
  b: UniversalCommerceIntelligenceResult
): { ok: boolean; reason?: string } {
  if (a.replayFingerprint !== b.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (a.meta.dominantVertical !== b.meta.dominantVertical) {
    return { ok: false, reason: "vertical_mismatch" };
  }
  return { ok: true };
}
