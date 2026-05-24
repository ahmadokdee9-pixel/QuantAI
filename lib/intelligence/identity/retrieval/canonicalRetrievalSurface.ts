/**
 * Phase 4 — Canonical retrieval surface (keyword overlap only, no vectors).
 */

import type { CanonicalProductNode } from "../types";
import type { CanonicalRetrievalHit, CanonicalRetrievalQuery } from "./retrievalContracts";
import { CANONICAL_RETRIEVAL_CONTRACT } from "./retrievalContracts";
import { titleIdentityTokens } from "../titleNormalization";

function keywordOverlapScore(query: string, title: string): number {
  const qTokens = new Set(titleIdentityTokens(query));
  if (!qTokens.size) return 0;
  const tTokens = titleIdentityTokens(title);
  let hit = 0;
  for (const t of tTokens) {
    if (qTokens.has(t)) hit += 1;
  }
  return Math.round((hit / qTokens.size) * 10000) / 10000;
}

export type CanonicalRetrievalSurface = {
  contractVersion: string;
  surfaceId: string;
  hits: CanonicalRetrievalHit[];
  latencyMs: number;
};

/** Build deterministic retrieval surface over canonical graph nodes. */
export function buildCanonicalRetrievalSurface(
  query: CanonicalRetrievalQuery,
  nodes: CanonicalProductNode[]
): CanonicalRetrievalSurface {
  const started = Date.now();
  const hits: CanonicalRetrievalHit[] = nodes
    .map((n) => ({
      canonicalProductId: n.canonicalProductId,
      commerceId: n.commerceId,
      identityConfidence: n.identityConfidence,
      offerCount: n.offers.length,
      keywordScore: keywordOverlapScore(query.query, n.normalizedTitle),
    }))
    .filter((h) => h.keywordScore > 0 || h.identityConfidence >= 0.7)
    .sort(
      (a, b) =>
        b.keywordScore - a.keywordScore ||
        b.identityConfidence - a.identityConfidence ||
        b.offerCount - a.offerCount
    )
    .slice(0, query.maxResults);

  return {
    contractVersion: CANONICAL_RETRIEVAL_CONTRACT.version,
    surfaceId: `crs_${query.query.length}_${nodes.length}_${hits.length}`,
    hits,
    latencyMs: Date.now() - started,
  };
}
