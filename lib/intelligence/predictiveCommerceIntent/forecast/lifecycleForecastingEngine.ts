/**
 * Phase 14 — Lifecycle forecasting engine.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function forecastLifecycle(args: {
  evolution?: CommerceEvolutionResult | null;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
}): { phase: string; forecast01: number } {
  const phase =
    args.commerceIdentity?.lifecycleTransition.toPhase ??
    args.evolution?.lifecycle.phase ??
    "discovery";
  const forecast01 = round4(
    (args.evolution?.lifecycle.lifecycleMaturity01 ?? 0.2) * 0.6 +
      (args.commerceIdentity?.maturity.maturity01 ?? 0.2) * 0.4
  );
  return { phase, forecast01 };
}
