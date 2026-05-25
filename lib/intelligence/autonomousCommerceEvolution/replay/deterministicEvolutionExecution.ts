/**
 * Phase 18 — Deterministic evolution execution + replay fingerprint.
 */

import type { AutonomousCommerceEvolutionResult } from "../types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildEvolutionReplayFingerprint(result: AutonomousCommerceEvolutionResult): string {
  const parts = [
    result.heuristicEvolution.heuristicId,
    Math.round(result.meta.evolutionConfidence01 * 100),
    result.calibration.band,
    result.categoryEvolution.vertical,
    result.meta.fusedAxisCount,
  ];
  return `ace_${fnv1aHex(parts.join("~"))}`;
}

export function assertEvolutionReplayDeterministic(
  a: AutonomousCommerceEvolutionResult,
  b: AutonomousCommerceEvolutionResult
): { ok: boolean; reason?: string } {
  if (a.replayFingerprint !== b.replayFingerprint) {
    return { ok: false, reason: "fingerprint_mismatch" };
  }
  if (a.heuristicEvolution.heuristicId !== b.heuristicEvolution.heuristicId) {
    return { ok: false, reason: "heuristic_mismatch" };
  }
  return { ok: true };
}
