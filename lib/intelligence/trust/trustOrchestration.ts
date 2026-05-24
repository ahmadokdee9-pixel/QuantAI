/**
 * Phase 5 — Controlled trust orchestration hooks (identity + governance read-only).
 */

import type { IdentityFoundationResult } from "@/lib/intelligence/identity/types";
import type { NormalizationTrayMeta } from "@/lib/intelligence/normalization/types";

export type TrustOrchestrationContext = {
  query: string;
  identityFoundation?: IdentityFoundationResult | null;
  normalizationMeta?: NormalizationTrayMeta | null;
  controlledStackFastPath?: boolean;
  controlledStackRankingMutation?: boolean;
};

export type TrustOrchestrationSnapshot = {
  identityEnabled: boolean;
  normalizationEnabled: boolean;
  controlledStackFastPath: boolean;
  controlledStackRankingMutation: boolean;
  canonicalProductCount: number;
  identityCoverage: number;
};

/** Read-only integration — does not mutate ranking or APPLY. */
export function snapshotTrustOrchestration(
  ctx: TrustOrchestrationContext
): TrustOrchestrationSnapshot {
  return {
    identityEnabled: ctx.identityFoundation?.meta.enabled ?? false,
    normalizationEnabled: ctx.normalizationMeta?.enabled ?? false,
    controlledStackFastPath: ctx.controlledStackFastPath ?? true,
    controlledStackRankingMutation: ctx.controlledStackRankingMutation ?? false,
    canonicalProductCount: ctx.identityFoundation?.meta.canonicalProductCount ?? 0,
    identityCoverage: ctx.identityFoundation?.meta.identityCoverage ?? 0,
  };
}
