/**
 * Phase 15 — Strategy orchestration snapshot.
 */

import type { CommerceBrainResult } from "@/lib/intelligence/commerceBrain/types";
import type { PredictiveCommerceIntentResult } from "@/lib/intelligence/predictiveCommerceIntent/types";
import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";

export type StrategyOrchestrationSnapshot = {
  commerceOsEnabled: boolean;
  brainEnabled: boolean;
  predictiveEnabled: boolean;
  identityEnabled: boolean;
  upstreamLayersActive: number;
};

export function snapshotStrategyOrchestration(args: {
  commerceOs?: AutonomousCommerceOsResult | null;
  brain?: CommerceBrainResult | null;
  predictiveIntent?: PredictiveCommerceIntentResult | null;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
}): StrategyOrchestrationSnapshot {
  const flags = [
    args.commerceOs?.meta.enabled,
    args.brain?.meta.enabled,
    args.predictiveIntent?.meta.enabled,
    args.commerceIdentity?.meta.enabled,
  ];
  return {
    commerceOsEnabled: args.commerceOs?.meta.enabled ?? false,
    brainEnabled: args.brain?.meta.enabled ?? false,
    predictiveEnabled: args.predictiveIntent?.meta.enabled ?? false,
    identityEnabled: args.commerceIdentity?.meta.enabled ?? false,
    upstreamLayersActive: flags.filter(Boolean).length,
  };
}
