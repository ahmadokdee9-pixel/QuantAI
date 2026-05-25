/**
 * Phase 13 — Commerce identity orchestration snapshot.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { CommerceBrainResult } from "@/lib/intelligence/commerceBrain/types";
import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";
import type { IdentityFoundationResult } from "@/lib/intelligence/identity/types";

export type CommerceIdentityOrchestrationSnapshot = {
  identityFoundationEnabled: boolean;
  memoryEnabled: boolean;
  evolutionEnabled: boolean;
  brainEnabled: boolean;
  liveSignalsEnabled: boolean;
  upstreamLayersActive: number;
};

export function snapshotCommerceIdentityOrchestration(args: {
  identityFoundation?: IdentityFoundationResult | null;
  memory?: CommerceMemoryResult | null;
  evolution?: CommerceEvolutionResult | null;
  brain?: CommerceBrainResult | null;
  liveSignals?: LiveCommerceSignalsResult | null;
  trust?: TrustEngineResult | null;
}): CommerceIdentityOrchestrationSnapshot {
  const flags = [
    args.identityFoundation?.meta.enabled,
    args.memory?.meta.enabled,
    args.evolution?.meta.enabled,
    args.brain?.meta.enabled,
    args.liveSignals?.meta.enabled,
    args.trust?.meta.enabled,
  ];
  return {
    identityFoundationEnabled: args.identityFoundation?.meta.enabled ?? false,
    memoryEnabled: args.memory?.meta.enabled ?? false,
    evolutionEnabled: args.evolution?.meta.enabled ?? false,
    brainEnabled: args.brain?.meta.enabled ?? false,
    liveSignalsEnabled: args.liveSignals?.meta.enabled ?? false,
    upstreamLayersActive: flags.filter(Boolean).length,
  };
}
