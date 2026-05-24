/**
 * Phase 5 — Deterministic trust execution + replay fingerprint.
 */

import type { TrustEngineResult } from "../types";
import { DEFAULT_TRUST_REPLAY_CONTRACT } from "./trustReplayContracts";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildTrustReplayFingerprint(result: TrustEngineResult): string {
  const parts = [
    result.meta.offerIntelligenceCount,
    result.meta.fraudAlertCount,
    result.meta.fakeDiscountAlertCount,
    Math.round(result.meta.avgTrustScore),
    Math.round(result.meta.avgPriceTruthScore),
    ...result.offerIntelligence
      .slice(0, 8)
      .map((o) => o.commerceId)
      .sort(),
  ];
  return `trp_${fnv1aHex(parts.join("~"))}`;
}

export function assertTrustReplayDeterministic(
  runA: TrustEngineResult,
  runB: TrustEngineResult
): { ok: boolean; reason?: string } {
  if (runA.replayFingerprint !== runB.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (runA.meta.fraudAlertCount !== runB.meta.fraudAlertCount) {
    return { ok: false, reason: "fraud_alert_count_mismatch" };
  }
  if (runA.meta.offerIntelligenceCount !== runB.meta.offerIntelligenceCount) {
    return { ok: false, reason: "offer_count_mismatch" };
  }
  return { ok: true };
}

export function isTrustExecutionBounded(latencyMs: number): boolean {
  return latencyMs <= DEFAULT_TRUST_REPLAY_CONTRACT.maxLatencyMs * 2;
}
