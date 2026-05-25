/**
 * Phase 17 — Deterministic emotional execution + replay fingerprint.
 */

import type { EmotionalCommerceIntelligenceResult } from "../types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildEmotionalReplayFingerprint(result: EmotionalCommerceIntelligenceResult): string {
  const parts = [
    result.stylePersonality.personality,
    Math.round(result.meta.emotionalConfidence01 * 100),
    result.aestheticIdentity.label,
    result.purchaseDrivers.driver,
    result.emotionalLifecycle.phase,
    result.meta.fusedAxisCount,
  ];
  return `eci_${fnv1aHex(parts.join("~"))}`;
}

export function assertEmotionalReplayDeterministic(
  a: EmotionalCommerceIntelligenceResult,
  b: EmotionalCommerceIntelligenceResult
): { ok: boolean; reason?: string } {
  if (a.replayFingerprint !== b.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (a.stylePersonality.personality !== b.stylePersonality.personality) {
    return { ok: false, reason: "personality_mismatch" };
  }
  return { ok: true };
}
