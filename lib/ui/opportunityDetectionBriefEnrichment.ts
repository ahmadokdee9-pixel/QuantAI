/**
 * Phase 44 — Opportunity Detection Brief Enrichment.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import type { MarketSummaryV2 } from "@/lib/intelligence/marketSummaryV2Engine";
import type { ProductOpportunityIntelligence } from "@/lib/intelligence/opportunityDetectionEngine";
import { enrichDecisionBriefWithDecisionCalibration } from "@/lib/ui/decisionCalibrationBriefEnrichment";

export function enrichDecisionBriefWithOpportunityDetection(
  brief: DecisionBriefDTO | null,
  coverage: MarketCoverageIntelligence,
  marketSummary: MarketSummaryV2,
  queryLine: string,
  opportunity: ProductOpportunityIntelligence | undefined
): DecisionBriefDTO | null {
  const base = enrichDecisionBriefWithDecisionCalibration(
    brief,
    coverage,
    marketSummary,
    queryLine,
    "Decision calibration — evidence-based promotion with strict merchant and discount gates."
  );
  if (!base || !opportunity) return base;

  const driverLine =
    opportunity.drivers.length > 0 ? opportunity.drivers.join(" · ") : "Balanced market signals";

  return {
    ...base,
    opportunityScore: opportunity.score,
    opportunityLabel: opportunity.label,
    opportunityDrivers: opportunity.drivers,
    topSignals: [
      `Opportunity Score: ${opportunity.score}`,
      `Opportunity Label: ${opportunity.label}`,
      `Opportunity Drivers: ${driverLine}`,
      ...(base.topSignals ?? []),
    ].slice(0, 8),
  };
}
