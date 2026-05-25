/**
 * Phase 12 — Live signal orchestration snapshot (read-only).
 */

import type { IdentityFoundationResult } from "@/lib/intelligence/identity/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";
import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { CommerceBrainResult } from "@/lib/intelligence/commerceBrain/types";

export type LiveSignalOrchestrationSnapshot = {
  trustEnabled: boolean;
  commerceOsEnabled: boolean;
  activationEnabled: boolean;
  evolutionEnabled: boolean;
  brainEnabled: boolean;
  upstreamLayersActive: number;
};

export function snapshotLiveSignalOrchestration(args: {
  trust?: TrustEngineResult | null;
  commerceOs?: AutonomousCommerceOsResult | null;
  activation?: ControlledActivationResult | null;
  evolution?: CommerceEvolutionResult | null;
  brain?: CommerceBrainResult | null;
  identity?: IdentityFoundationResult | null;
}): LiveSignalOrchestrationSnapshot {
  const flags = [
    args.trust?.meta.enabled,
    args.commerceOs?.meta.enabled,
    args.activation?.meta.enabled,
    args.evolution?.meta.enabled,
    args.brain?.meta.enabled,
  ];
  return {
    trustEnabled: args.trust?.meta.enabled ?? false,
    commerceOsEnabled: args.commerceOs?.meta.enabled ?? false,
    activationEnabled: args.activation?.meta.enabled ?? false,
    evolutionEnabled: args.evolution?.meta.enabled ?? false,
    brainEnabled: args.brain?.meta.enabled ?? false,
    upstreamLayersActive: flags.filter(Boolean).length,
  };
}
