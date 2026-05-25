/**
 * Phase 11 — Temporal + trust + taste fusion layer.
 */

import type { CommerceBrainInput } from "../types";

export type TemporalTrustTasteFusion = {
  temporalWeight01: number;
  trustWeight01: number;
  tasteWeight01: number;
  fusedScore01: number;
  fusionLabel: string;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function fuseTemporalTrustTaste(input: CommerceBrainInput): TemporalTrustTasteFusion {
  const trustWeight01 = round4(
    clamp01((input.trust?.meta.avgTrustScore ?? 50) / 100 * 0.6 + (input.recommendation?.latentIntent.trustFirst01 ?? 0.35) * 0.4)
  );
  const tasteWeight01 = round4(
    clamp01(
      (input.memory?.meta.tasteProfileConfidence ?? 0.3) * 0.5 +
        (input.memory?.preferenceSignals.preferenceScore ?? 40) / 100 * 0.3 +
        (1 - (input.evolution?.tasteEvolution.tasteDrift01 ?? 0.3)) * 0.2
    )
  );
  const temporalWeight01 = round4(
    clamp01(
      (input.evolution?.lifecycle.timingSensitivity01 ?? 0.25) * 0.4 +
        (input.commerceOs?.meta.market.momentumScore ?? 0.3) * 0.35 +
        (input.evolution?.meta.evolutionConfidence01 ?? 0.35) * 0.25
    )
  );
  const fusedScore01 = round4(
    clamp01(trustWeight01 * 0.4 + tasteWeight01 * 0.35 + temporalWeight01 * 0.25)
  );
  const fusionLabel =
    fusedScore01 >= 0.6 ? "trust_taste_temporal_aligned" : fusedScore01 >= 0.4 ? "partial_alignment" : "weak_alignment";

  return { temporalWeight01, trustWeight01, tasteWeight01, fusedScore01, fusionLabel };
}
