/**
 * Phase 18 — Commerce evolution engine (deterministic synthesis).
 */

import type { AutonomousCommerceEvolutionInput } from "../types";

export function synthesizeCommerceEvolutionContext(input: AutonomousCommerceEvolutionInput): {
  upstreamDelta01: number;
  driftSignals: number;
} {
  const upstreamDelta01 =
    (input.commerceEvolution?.meta.evolutionConfidence01 ?? 0.25) * 0.15 +
    (input.emotionalCommerce?.meta.emotionalConfidence01 ?? 0.25) * 0.1;
  const driftSignals = input.commerceIdentity?.preferenceContinuity.decay01 ?? 0.2;
  return { upstreamDelta01: Math.min(0.12, upstreamDelta01), driftSignals };
}
