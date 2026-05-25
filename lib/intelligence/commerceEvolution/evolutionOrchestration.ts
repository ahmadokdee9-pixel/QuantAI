/**
 * Phase 10 — Evolution orchestration snapshot (read-only).
 */

import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";

export type EvolutionOrchestrationSnapshot = {
  memoryEnabled: boolean;
  recommendationEnabled: boolean;
  commerceOsEnabled: boolean;
  activationEnabled: boolean;
  activationGovernanceApproved: boolean;
  cognitionConfidence: number;
};

export function snapshotEvolutionOrchestration(args: {
  memoryResult?: CommerceMemoryResult | null;
  recommendationResult?: RecommendationCognitionResult | null;
  commerceOsResult?: AutonomousCommerceOsResult | null;
  activationResult?: ControlledActivationResult | null;
}): EvolutionOrchestrationSnapshot {
  return {
    memoryEnabled: args.memoryResult?.meta.enabled ?? false,
    recommendationEnabled: args.recommendationResult?.meta.enabled ?? false,
    commerceOsEnabled: args.commerceOsResult?.meta.enabled ?? false,
    activationEnabled: args.activationResult?.meta.enabled ?? false,
    activationGovernanceApproved: args.activationResult?.governance.approved ?? false,
    cognitionConfidence: args.recommendationResult?.meta.avgConfidence01 ?? 0,
  };
}
