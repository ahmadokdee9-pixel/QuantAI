/**
 * Phase 39 — Commerce Calibration Brief Enrichment.
 * Intelligence-only — preserves market coverage, adds calibration signal.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import { enrichDecisionBriefWithCommerceDominance } from "@/lib/ui/commerceDominanceBriefEnrichment";

export function enrichDecisionBriefWithCommerceCalibration(
  brief: DecisionBriefDTO | null,
  coverage: MarketCoverageIntelligence
): DecisionBriefDTO | null {
  const base = enrichDecisionBriefWithCommerceDominance(brief, coverage);
  if (!base) return null;

  return {
    ...base,
    topSignals: [
      "Calibrated commerce intelligence — verdicts aligned to confidence bands and purchase opportunity.",
      ...(base.topSignals ?? base.keyReasons ?? []),
    ].slice(0, 8),
  };
}
