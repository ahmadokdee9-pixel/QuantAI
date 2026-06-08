/**
 * Phase 39 — Best Deal Dominance Engine.
 * Only one product holds BEST DEAL FOUND unless statistically tied.
 */

import type { OpportunityPriorityV2 } from "@/lib/intelligence/opportunityPriorityEngineV2";
import type { RealDiscountValidationV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";

export type BestDealDominanceResult = {
  bestDealLink: string | null;
  tiedLinks: string[];
  dominanceScore: number;
};

const TIE_THRESHOLD = 3;

/** Select single best deal holder across tray. */
export function selectBestDealDominance(
  rows: Array<{
    link: string;
    opportunity: OpportunityPriorityV2;
    realDiscount: RealDiscountValidationV3;
    trustScore: number;
    valueScore: number;
  }>
): BestDealDominanceResult {
  if (!rows.length) return { bestDealLink: null, tiedLinks: [], dominanceScore: 0 };

  const scored = rows
    .map((row) => ({
      link: row.link,
      score: Math.round(
        row.opportunity.opportunityScore * 0.45 +
          row.valueScore * 0.2 +
          row.trustScore * 0.15 +
          row.realDiscount.realDiscountScore * 0.2
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0]!;
  const tiedLinks = scored.filter((r) => top.score - r.score <= TIE_THRESHOLD).map((r) => r.link);

  return {
    bestDealLink: top.link,
    tiedLinks,
    dominanceScore: top.score,
  };
}

export function isBestDealHolder(link: string, dominance: BestDealDominanceResult): boolean {
  return dominance.tiedLinks.includes(link);
}
