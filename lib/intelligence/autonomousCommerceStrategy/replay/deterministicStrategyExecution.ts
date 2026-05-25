/**
 * Phase 15 — Deterministic strategy execution + replay fingerprint.
 */

import type { AutonomousCommerceStrategyResult } from "../types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildStrategyReplayFingerprint(result: AutonomousCommerceStrategyResult): string {
  const parts = [
    result.meta.primaryStrategy,
    Math.round(result.meta.strategyConfidence01 * 100),
    Math.round(result.meta.regretScore01 * 100),
    result.timing.label,
    result.merchantArbitration.verdict,
    result.meta.fusedAxisCount,
  ];
  return `acs_${fnv1aHex(parts.join("~"))}`;
}

export function assertStrategyReplayDeterministic(
  a: AutonomousCommerceStrategyResult,
  b: AutonomousCommerceStrategyResult
): { ok: boolean; reason?: string } {
  if (a.replayFingerprint !== b.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (a.meta.primaryStrategy !== b.meta.primaryStrategy) {
    return { ok: false, reason: "primary_strategy_mismatch" };
  }
  return { ok: true };
}
