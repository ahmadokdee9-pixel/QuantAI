/**
 * Phase 14 — Predictive intent orchestration snapshot.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { CommerceBrainResult } from "@/lib/intelligence/commerceBrain/types";
import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";
import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

export type PredictiveIntentOrchestrationSnapshot = {
  evolutionEnabled: boolean;
  brainEnabled: boolean;
  liveSignalsEnabled: boolean;
  commerceIdentityEnabled: boolean;
  upstreamLayersActive: number;
};

export function snapshotPredictiveIntentOrchestration(args: {
  evolution?: CommerceEvolutionResult | null;
  brain?: CommerceBrainResult | null;
  liveSignals?: LiveCommerceSignalsResult | null;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
}): PredictiveIntentOrchestrationSnapshot {
  const flags = [
    args.evolution?.meta.enabled,
    args.brain?.meta.enabled,
    args.liveSignals?.meta.enabled,
    args.commerceIdentity?.meta.enabled,
  ];
  return {
    evolutionEnabled: args.evolution?.meta.enabled ?? false,
    brainEnabled: args.brain?.meta.enabled ?? false,
    liveSignalsEnabled: args.liveSignals?.meta.enabled ?? false,
    commerceIdentityEnabled: args.commerceIdentity?.meta.enabled ?? false,
    upstreamLayersActive: flags.filter(Boolean).length,
  };
}
