/**
 * Phase 12 — Deterministic live signal execution + replay fingerprint.
 */

import type { LiveCommerceSignalsResult } from "../types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildLiveSignalReplayFingerprint(result: LiveCommerceSignalsResult): string {
  const parts = [
    result.meta.volatilityBand,
    Math.round(result.meta.signalConfidence01 * 100),
    result.meta.fusedSignalCount,
    result.forecast.horizon,
    Math.round(result.forecast.forecast01 * 100),
    result.momentum.momentum01,
    result.demandShift.direction,
  ];
  return `lcs_${fnv1aHex(parts.join("~"))}`;
}

export function assertLiveSignalReplayDeterministic(
  a: LiveCommerceSignalsResult,
  b: LiveCommerceSignalsResult
): { ok: boolean; reason?: string } {
  if (a.replayFingerprint !== b.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (a.meta.volatilityBand !== b.meta.volatilityBand) {
    return { ok: false, reason: "volatility_band_mismatch" };
  }
  return { ok: true };
}
