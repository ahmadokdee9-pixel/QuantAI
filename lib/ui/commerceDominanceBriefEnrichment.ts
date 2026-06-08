/**
 * Phase 38 — Commerce Dominance Brief Enrichment.
 * Market coverage only — no tray-level global buy/wait/avoid verdicts.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";

export function enrichDecisionBriefWithCommerceDominance(
  brief: DecisionBriefDTO | null,
  coverage: MarketCoverageIntelligence
): DecisionBriefDTO | null {
  if (!brief) return null;

  const lines = [
    coverage.headline,
    coverage.detailLine,
    "Product-level verdicts only — compare deals, fair prices, and overpriced listings in this tray.",
  ];

  return {
    ...brief,
    explanation: brief.explanation
      ? `${brief.explanation} ${coverage.headline}`
      : coverage.headline,
    topSignals: [...lines, ...(brief.topSignals ?? brief.keyReasons ?? [])].slice(0, 8),
    waitReasoning: undefined,
  };
}
