/**
 * Phase 6 — Controlled memory orchestration (trust + identity + governance read-only).
 */

import type { IdentityFoundationResult } from "@/lib/intelligence/identity/types";
import type { NormalizationTrayMeta } from "@/lib/intelligence/normalization/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";

export type MemoryOrchestrationContext = {
  query: string;
  identityFoundation?: IdentityFoundationResult | null;
  trustResult?: TrustEngineResult | null;
  normalizationMeta?: NormalizationTrayMeta | null;
  controlledStackFastPath?: boolean;
  controlledStackRankingMutation?: boolean;
};

export type MemoryOrchestrationSnapshot = {
  identityEnabled: boolean;
  trustEnabled: boolean;
  normalizationEnabled: boolean;
  controlledStackFastPath: boolean;
  controlledStackRankingMutation: boolean;
  canonicalProductCount: number;
  trustCoverage: number;
};

/** Read-only integration — does not mutate ranking or APPLY. */
export function snapshotMemoryOrchestration(
  ctx: MemoryOrchestrationContext
): MemoryOrchestrationSnapshot {
  return {
    identityEnabled: ctx.identityFoundation?.meta.enabled ?? false,
    trustEnabled: ctx.trustResult?.meta.enabled ?? false,
    normalizationEnabled: ctx.normalizationMeta?.enabled ?? false,
    controlledStackFastPath: ctx.controlledStackFastPath ?? true,
    controlledStackRankingMutation: ctx.controlledStackRankingMutation ?? false,
    canonicalProductCount: ctx.identityFoundation?.meta.canonicalProductCount ?? 0,
    trustCoverage: ctx.trustResult?.meta.trustCoverage ?? 0,
  };
}
