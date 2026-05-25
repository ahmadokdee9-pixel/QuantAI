/**
 * Phase 14 — Deterministic prediction execution + replay fingerprint.
 */

import type { PredictiveCommerceIntentResult } from "../types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildPredictionReplayFingerprint(result: PredictiveCommerceIntentResult): string {
  const parts = [
    result.readiness.label,
    result.purchaseProbability.horizon,
    Math.round(result.meta.predictionConfidence01 * 100),
    Math.round(result.meta.readiness01 * 100),
    result.futureState.stateLabel,
    result.meta.fusedAxisCount,
  ];
  return `pci_${fnv1aHex(parts.join("~"))}`;
}

export function assertPredictionReplayDeterministic(
  a: PredictiveCommerceIntentResult,
  b: PredictiveCommerceIntentResult
): { ok: boolean; reason?: string } {
  if (a.replayFingerprint !== b.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (a.readiness.label !== b.readiness.label) {
    return { ok: false, reason: "readiness_mismatch" };
  }
  return { ok: true };
}
