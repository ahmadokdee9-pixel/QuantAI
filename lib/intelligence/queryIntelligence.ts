/**
 * Phase 12.0 — Query intelligence orchestration.
 * Combines Phase 9.4 canonical query intelligence with the Universal Shopping Brain (pre-search).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  buildPhase94QueryIntelligence,
  type QueryIntelligenceMeta,
} from "@/lib/search/phase94QueryIntelligence";
import {
  buildUniversalShoppingBrain,
  type ShoppingBrainMeta,
} from "@/lib/intelligence/universalShoppingBrain";

export type QueryIntelligenceBundle = {
  meta: QueryIntelligenceMeta;
  shoppingBrain: ShoppingBrainMeta;
  canonicalQuery: CanonicalQueryContract;
};

/** Build Phase 9.4 query intelligence plus Phase 12.0 universal shopping brain (pre-search). */
export function buildQueryIntelligence(rawQuery: string): QueryIntelligenceBundle {
  const phase94 = buildPhase94QueryIntelligence(rawQuery);
  const shoppingBrain = buildUniversalShoppingBrain(rawQuery, phase94.meta);
  return {
    meta: phase94.meta,
    shoppingBrain,
    canonicalQuery: phase94.canonicalQuery,
  };
}

export type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";
export type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";
