/**
 * Phase 40 — Search Ranking Brief Enrichment.
 * Enriches existing brief with search dominance summary — no new UI sections.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { SearchDominanceSummary } from "@/lib/intelligence/searchDominanceSummaryEngine";
import { enrichDecisionBriefWithCommerceCalibration } from "@/lib/ui/commerceCalibrationBriefEnrichment";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";

export function enrichDecisionBriefWithSearchRanking(
  brief: DecisionBriefDTO | null,
  coverage: MarketCoverageIntelligence,
  summary: SearchDominanceSummary
): DecisionBriefDTO | null {
  const base = enrichDecisionBriefWithCommerceCalibration(brief, coverage);
  if (!base) return null;

  return {
    ...base,
    explanation: base.explanation
      ? `${base.explanation} ${summary.synthesisLine}`
      : summary.synthesisLine,
    topSignals: [summary.synthesisLine, ...(base.topSignals ?? base.keyReasons ?? [])].slice(0, 8),
  };
}
