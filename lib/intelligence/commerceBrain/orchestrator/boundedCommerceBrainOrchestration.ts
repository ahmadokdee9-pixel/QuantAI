/**
 * Phase 11 — Bounded commerce brain orchestration snapshot.
 */

import type { IdentityFoundationResult } from "@/lib/intelligence/identity/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";
import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";

export type BrainOrchestrationSnapshot = {
  identityEnabled: boolean;
  trustEnabled: boolean;
  memoryEnabled: boolean;
  recommendationEnabled: boolean;
  commerceOsEnabled: boolean;
  activationEnabled: boolean;
  evolutionEnabled: boolean;
  layersActive: number;
};

export function snapshotBrainOrchestration(args: {
  identity?: IdentityFoundationResult | null;
  trust?: TrustEngineResult | null;
  memory?: CommerceMemoryResult | null;
  recommendation?: RecommendationCognitionResult | null;
  commerceOs?: AutonomousCommerceOsResult | null;
  activation?: ControlledActivationResult | null;
  evolution?: CommerceEvolutionResult | null;
}): BrainOrchestrationSnapshot {
  const flags = [
    args.identity?.meta.enabled,
    args.trust?.meta.enabled,
    args.memory?.meta.enabled,
    args.recommendation?.meta.enabled,
    args.commerceOs?.meta.enabled,
    args.activation?.meta.enabled,
    args.evolution?.meta.enabled,
  ];
  return {
    identityEnabled: args.identity?.meta.enabled ?? false,
    trustEnabled: args.trust?.meta.enabled ?? false,
    memoryEnabled: args.memory?.meta.enabled ?? false,
    recommendationEnabled: args.recommendation?.meta.enabled ?? false,
    commerceOsEnabled: args.commerceOs?.meta.enabled ?? false,
    activationEnabled: args.activation?.meta.enabled ?? false,
    evolutionEnabled: args.evolution?.meta.enabled ?? false,
    layersActive: flags.filter(Boolean).length,
  };
}
