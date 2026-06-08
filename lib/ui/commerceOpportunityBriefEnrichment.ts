/**
 * Phase 36 — Commerce Opportunity Brief Enrichment.
 * Attaches tray-level commerce summary to existing brief slots — no UI changes.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { TrayCommerceSummary } from "@/lib/intelligence/trayVerdictSummaryEngine";

export function enrichDecisionBriefWithCommerceOpportunity(
  brief: DecisionBriefDTO | null,
  summary: TrayCommerceSummary
): DecisionBriefDTO | null {
  if (!brief) return null;

  const commerceLines = [
    summary.headline,
    summary.shouldBuyNow ? "Tray verdict: buy opportunity available." : "Tray verdict: compare or wait before buying.",
    summary.bestDiscountLink ? "Best discount candidate identified in tray." : null,
    summary.bestCheaperAlternativeLink ? "Cheaper alternative available in tray." : null,
  ].filter(Boolean) as string[];

  return {
    ...brief,
    explanation: brief.explanation
      ? `${brief.explanation} ${summary.headline}`
      : summary.headline,
    buyReasoning: summary.shouldBuyNow
      ? brief.buyReasoning ?? "Strongest buy opportunity identified in this result set."
      : brief.buyReasoning,
    waitReasoning: summary.shouldWait
      ? brief.waitReasoning ?? "No clear buy-now leader — wait for better price or availability."
      : brief.waitReasoning,
    topSignals: [...commerceLines, ...(brief.topSignals ?? brief.keyReasons ?? [])].slice(0, 8),
  };
}
