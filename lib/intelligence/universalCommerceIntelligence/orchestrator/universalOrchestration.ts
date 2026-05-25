/**
 * Phase 16 — Universal orchestration snapshot.
 */

import type { AutonomousCommerceStrategyResult } from "@/lib/intelligence/autonomousCommerceStrategy/types";
import type { PredictiveCommerceIntentResult } from "@/lib/intelligence/predictiveCommerceIntent/types";
import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

export type UniversalOrchestrationSnapshot = {
  commerceIdentityEnabled: boolean;
  predictiveEnabled: boolean;
  strategyEnabled: boolean;
  upstreamLayersActive: number;
};

export function snapshotUniversalOrchestration(args: {
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
  predictiveIntent?: PredictiveCommerceIntentResult | null;
  commerceStrategy?: AutonomousCommerceStrategyResult | null;
}): UniversalOrchestrationSnapshot {
  const flags = [
    args.commerceIdentity?.meta.enabled,
    args.predictiveIntent?.meta.enabled,
    args.commerceStrategy?.meta.enabled,
  ];
  return {
    commerceIdentityEnabled: args.commerceIdentity?.meta.enabled ?? false,
    predictiveEnabled: args.predictiveIntent?.meta.enabled ?? false,
    strategyEnabled: args.commerceStrategy?.meta.enabled ?? false,
    upstreamLayersActive: flags.filter(Boolean).length,
  };
}
