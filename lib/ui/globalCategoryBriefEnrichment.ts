/**
 * Phase 41 — Global Category Brief Enrichment.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { MarketSummaryV2 } from "@/lib/intelligence/marketSummaryV2Engine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import { enrichDecisionBriefWithSearchRanking } from "@/lib/ui/searchRankingBriefEnrichment";

export function enrichDecisionBriefWithGlobalCategory(
  brief: DecisionBriefDTO | null,
  coverage: MarketCoverageIntelligence,
  marketSummary: MarketSummaryV2,
  queryLine: string
): DecisionBriefDTO | null {
  const base = enrichDecisionBriefWithSearchRanking(
    brief,
    coverage,
    {
      version: 1,
      resultsAnalyzed: 0,
      merchantsAnalyzed: coverage.merchantsScanned,
      bestOverallChoice: marketSummary.bestOverallChoice,
      lowestPrice: 0,
      highestPrice: 0,
      potentialSavings: 0,
      topOpportunityScore: 0,
      topOpportunityBand: "",
      headline: marketSummary.headline,
      synthesisLine: marketSummary.synthesisLine,
    }
  );
  if (!base) return null;

  return {
    ...base,
    topSignals: [queryLine, marketSummary.synthesisLine, ...(base.topSignals ?? [])].slice(0, 8),
  };
}
