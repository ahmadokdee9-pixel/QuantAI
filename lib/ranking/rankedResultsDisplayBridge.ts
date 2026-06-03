/**
 * Phase 13.5 — Ranked Results Display Bridge.
 * Applies executed ranking order to product trays using executedRanking + qiRank only.
 */

import type { ExecutedRankingMeta } from "@/lib/ranking/controlledRankingExecution";

export type RankedDisplayProduct = {
  qiRank?: number;
  link?: string;
};

export type RankedResultsDisplayBridgeInput<T extends RankedDisplayProduct> = {
  products: T[];
  executedRanking: ExecutedRankingMeta | null | undefined;
};

export function isExecutedRankingActive(
  executedRanking: ExecutedRankingMeta | null | undefined
): boolean {
  return executedRanking?.executed === true;
}

/** Order products by qiRank when controlled ranking was executed; otherwise preserve input order. */
export function applyRankedResultsDisplayBridge<T extends RankedDisplayProduct>(
  input: RankedResultsDisplayBridgeInput<T>
): T[] {
  const { products, executedRanking } = input;

  if (!isExecutedRankingActive(executedRanking)) {
    return products;
  }

  return [...products].sort((a, b) => {
    const rankA = a.qiRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.qiRank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    if (a.link && b.link && a.link !== b.link) return a.link.localeCompare(b.link);
    return 0;
  });
}
