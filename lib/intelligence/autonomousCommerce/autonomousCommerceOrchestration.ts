/**
 * Phase 8 — Autonomous commerce OS orchestration snapshot (read-only).
 */

import type { IdentityFoundationResult } from "@/lib/intelligence/identity/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { NormalizationTrayMeta } from "@/lib/intelligence/normalization/types";

export type AutonomousCommerceOrchestrationContext = {
  query: string;
  identityFoundation?: IdentityFoundationResult | null;
  trustResult?: TrustEngineResult | null;
  memoryResult?: CommerceMemoryResult | null;
  recommendationResult?: RecommendationCognitionResult | null;
  normalizationMeta?: NormalizationTrayMeta | null;
  controlledStackFastPath?: boolean;
  controlledStackRankingMutation?: boolean;
};

export type AutonomousCommerceOrchestrationSnapshot = {
  identityEnabled: boolean;
  trustEnabled: boolean;
  memoryEnabled: boolean;
  recommendationEnabled: boolean;
  normalizationEnabled: boolean;
  controlledStackFastPath: boolean;
  controlledStackRankingMutation: boolean;
  canonicalProductCount: number;
  cognitionConfidence: number;
};

export function snapshotAutonomousCommerceOrchestration(
  ctx: AutonomousCommerceOrchestrationContext
): AutonomousCommerceOrchestrationSnapshot {
  return {
    identityEnabled: ctx.identityFoundation?.meta.enabled ?? false,
    trustEnabled: ctx.trustResult?.meta.enabled ?? false,
    memoryEnabled: ctx.memoryResult?.meta.enabled ?? false,
    recommendationEnabled: ctx.recommendationResult?.meta.enabled ?? false,
    normalizationEnabled: ctx.normalizationMeta?.enabled ?? false,
    controlledStackFastPath: ctx.controlledStackFastPath ?? true,
    controlledStackRankingMutation: ctx.controlledStackRankingMutation ?? false,
    canonicalProductCount: ctx.identityFoundation?.meta.canonicalProductCount ?? 0,
    cognitionConfidence: ctx.recommendationResult?.meta.avgConfidence01 ?? 0,
  };
}
