/**
 * Phase 43 — Decision Calibration Brief Enrichment.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import type { MarketSummaryV2 } from "@/lib/intelligence/marketSummaryV2Engine";
import { enrichDecisionBriefWithCommerceIntelligenceCore } from "@/lib/ui/commerceIntelligenceCoreBriefEnrichment";

export function enrichDecisionBriefWithDecisionCalibration(
  brief: DecisionBriefDTO | null,
  coverage: MarketCoverageIntelligence,
  marketSummary: MarketSummaryV2,
  queryLine: string,
  calibrationLine: string
): DecisionBriefDTO | null {
  const base = enrichDecisionBriefWithCommerceIntelligenceCore(
    brief,
    coverage,
    marketSummary,
    queryLine,
    "Commerce intelligence core — combined value, trust, market position, and verified discount proof."
  );
  if (!base) return null;

  return {
    ...base,
    topSignals: [calibrationLine, ...(base.topSignals ?? [])].slice(0, 8),
  };
}
