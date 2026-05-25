/**
 * Phase 13 — Deterministic identity execution + replay fingerprint.
 */

import type { AutonomousCommerceIdentityResult } from "../types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildIdentityReplayFingerprint(result: AutonomousCommerceIdentityResult): string {
  const parts = [
    result.luxuryModel.band,
    result.crossSessionPersonality.personaId,
    Math.round(result.meta.identityConfidence01 * 100),
    result.meta.driftBand,
    result.meta.fusedAxisCount,
    result.tasteFingerprint.fingerprintId.slice(0, 12),
  ];
  return `aci_${fnv1aHex(parts.join("~"))}`;
}

export function assertIdentityReplayDeterministic(
  a: AutonomousCommerceIdentityResult,
  b: AutonomousCommerceIdentityResult
): { ok: boolean; reason?: string } {
  if (a.replayFingerprint !== b.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (a.luxuryModel.band !== b.luxuryModel.band) {
    return { ok: false, reason: "luxury_band_mismatch" };
  }
  return { ok: true };
}
