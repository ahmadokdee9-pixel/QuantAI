/**
 * Phase 18 — Evolution observability layer (meta-only).
 */

import type { AutonomousCommerceEvolutionResult } from "../types";

export function buildEvolutionObservability(result: AutonomousCommerceEvolutionResult): Record<string, unknown> {
  if (!result.meta.enabled) return {};
  return {
    evolutionConfidence01: result.meta.evolutionConfidence01,
    calibrationBand: result.meta.calibrationBand,
    candidateCount: result.meta.candidateCount,
    governanceAllowed: result.meta.governanceAllowed,
    replayFingerprint: result.replayFingerprint,
  };
}
