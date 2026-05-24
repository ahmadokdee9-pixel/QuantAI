/**
 * Phase 7 — Recommendation cognition orchestration (trust + memory + identity read-only).
 */

import type { IdentityFoundationResult } from "@/lib/intelligence/identity/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { NormalizationTrayMeta } from "@/lib/intelligence/normalization/types";

export type RecommendationCognitionOrchestrationContext = {
  query: string;
  identityFoundation?: IdentityFoundationResult | null;
  trustResult?: TrustEngineResult | null;
  memoryResult?: CommerceMemoryResult | null;
  normalizationMeta?: NormalizationTrayMeta | null;
  controlledStackFastPath?: boolean;
  controlledStackRankingMutation?: boolean;
};

export type RecommendationCognitionOrchestrationSnapshot = {
  identityEnabled: boolean;
  trustEnabled: boolean;
  memoryEnabled: boolean;
  normalizationEnabled: boolean;
  controlledStackFastPath: boolean;
  controlledStackRankingMutation: boolean;
  canonicalProductCount: number;
  memoryConfidence: number;
  trustCoverage: number;
};

/** Read-only — does not mutate ranking or APPLY. */
export function snapshotRecommendationCognitionOrchestration(
  ctx: RecommendationCognitionOrchestrationContext
): RecommendationCognitionOrchestrationSnapshot {
  return {
    identityEnabled: ctx.identityFoundation?.meta.enabled ?? false,
    trustEnabled: ctx.trustResult?.meta.enabled ?? false,
    memoryEnabled: ctx.memoryResult?.meta.enabled ?? false,
    normalizationEnabled: ctx.normalizationMeta?.enabled ?? false,
    controlledStackFastPath: ctx.controlledStackFastPath ?? true,
    controlledStackRankingMutation: ctx.controlledStackRankingMutation ?? false,
    canonicalProductCount: ctx.identityFoundation?.meta.canonicalProductCount ?? 0,
    memoryConfidence: ctx.memoryResult?.preferenceSignals.confidence01 ?? 0,
    trustCoverage: ctx.trustResult?.meta.trustCoverage ?? 0,
  };
}
