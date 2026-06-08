/**
 * Phase 42 — Commerce Intelligence Core Brief Enrichment.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import type { MarketSummaryV2 } from "@/lib/intelligence/marketSummaryV2Engine";
import { enrichDecisionBriefWithGlobalCategory } from "@/lib/ui/globalCategoryBriefEnrichment";

export function enrichDecisionBriefWithCommerceIntelligenceCore(
  brief: DecisionBriefDTO | null,
  coverage: MarketCoverageIntelligence,
  marketSummary: MarketSummaryV2,
  queryLine: string,
  coreLine: string
): DecisionBriefDTO | null {
  const base = enrichDecisionBriefWithGlobalCategory(brief, coverage, marketSummary, queryLine);
  if (!base) return null;

  return {
    ...base,
    topSignals: [coreLine, ...(base.topSignals ?? [])].slice(0, 8),
  };
}
