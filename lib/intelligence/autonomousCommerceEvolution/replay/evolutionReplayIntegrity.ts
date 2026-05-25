/**
 * Phase 18 — Evolution replay integrity engine.
 */

import type { AutonomousCommerceEvolutionInput } from "../types";

export function verifyEvolutionReplayIntegrity(input: AutonomousCommerceEvolutionInput): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (input.trust && !input.trust.replayFingerprint.startsWith("trp_")) missing.push("trust");
  if (input.commerceEvolution && !input.commerceEvolution.replayFingerprint.startsWith("evo_")) {
    missing.push("commerce_evolution");
  }
  if (input.emotionalCommerce && !input.emotionalCommerce.replayFingerprint.startsWith("eci_")) {
    missing.push("emotional");
  }
  return { ok: missing.length === 0, missing };
}
