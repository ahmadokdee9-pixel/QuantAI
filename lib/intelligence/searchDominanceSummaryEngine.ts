/**
 * Phase 40 — Search Dominance Summary Engine.
 * One search-level intelligence block — not a dashboard.
 */

import type { BestSavingsIntelligence } from "@/lib/intelligence/bestSavingsEngine";
import type { GlobalWinnerResult } from "@/lib/intelligence/globalWinnerEngine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import type { OpportunityLabel } from "@/lib/intelligence/opportunityLabelEngine";

export type SearchDominanceSummary = {
  version: 1;
  resultsAnalyzed: number;
  merchantsAnalyzed: number;
  bestOverallChoice: string | null;
  lowestPrice: number;
  highestPrice: number;
  potentialSavings: number;
  topOpportunityScore: number;
  topOpportunityBand: string;
  headline: string;
  synthesisLine: string;
};

/** Generate search-level dominance summary from tray intelligence. */
export function buildSearchDominanceSummary(args: {
  coverage: MarketCoverageIntelligence;
  savings: BestSavingsIntelligence;
  winner: GlobalWinnerResult;
  topOpportunity: OpportunityLabel | null;
  resultsAnalyzed: number;
}): SearchDominanceSummary {
  const { coverage, savings, winner, topOpportunity, resultsAnalyzed } = args;

  const headline = "Search Summary";
  const synthesisLine = [
    `Results analyzed: ${resultsAnalyzed}`,
    `Merchants analyzed: ${coverage.merchantsScanned}`,
    winner.winnerTitle ? `Best overall choice: ${winner.winnerTitle.split(" ").slice(0, 5).join(" ")}` : null,
    savings.bestPrice > 0 ? `Lowest price: €${savings.bestPrice}` : null,
    savings.highestPrice > 0 ? `Highest price: €${savings.highestPrice}` : null,
    savings.potentialSavings > 0 ? `Potential savings: €${savings.potentialSavings}` : null,
    topOpportunity ? `Top opportunity score: ${topOpportunity.score}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    version: 1,
    resultsAnalyzed,
    merchantsAnalyzed: coverage.merchantsScanned,
    bestOverallChoice: winner.winnerTitle,
    lowestPrice: savings.bestPrice,
    highestPrice: savings.highestPrice,
    potentialSavings: savings.potentialSavings,
    topOpportunityScore: topOpportunity?.score ?? 0,
    topOpportunityBand: topOpportunity?.band ?? "Fair Opportunity",
    headline,
    synthesisLine,
  };
}
