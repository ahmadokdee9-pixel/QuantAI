/**
 * Phase 10 — Governance-safe adaptation boundaries (no live mutation).
 */

import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";

export type EvolutionAdaptationVerdict = {
  allowed: boolean;
  shadowOnly: true;
  reasons: string[];
};

export function evaluateEvolutionAdaptationBoundaries(args: {
  activationResult?: ControlledActivationResult | null;
  evolutionConfidence01: number;
  tasteDrift01: number;
}): EvolutionAdaptationVerdict {
  const reasons: string[] = [];
  if (args.evolutionConfidence01 < 0.4) reasons.push("evolution_confidence_low");
  if (args.tasteDrift01 > 0.85) reasons.push("taste_drift_unstable");

  const activationOk =
    !args.activationResult?.meta.enabled ||
    args.activationResult.governance.approved ||
    !args.activationResult.activation.inCanary;

  const allowed = reasons.length === 0 && activationOk;

  return { allowed, shadowOnly: true, reasons: reasons.slice(0, 6) };
}
