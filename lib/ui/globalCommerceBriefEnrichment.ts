/**
 * Phase 37 — Global Commerce Brief Enrichment.
 * Attaches global commerce summary to existing brief slots — no UI changes.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { UniversalOfferGraph } from "@/lib/intelligence/universalOfferGraphEngine";
import type { GlobalCommercePriorityLabel } from "@/lib/ui/globalCommerceVerdictEngine";

export function enrichDecisionBriefWithGlobalCommerce(
  brief: DecisionBriefDTO | null,
  args: {
    offerGraph: UniversalOfferGraph;
    commercePriorityLabel: GlobalCommercePriorityLabel;
    headline: string;
    shouldBuyNow: boolean;
  }
): DecisionBriefDTO | null {
  if (!brief) return null;

  const lines = [
    args.headline,
    `Search universe: ${args.offerGraph.totalOffers} offers across ${args.offerGraph.storeCount} merchants.`,
    args.shouldBuyNow ? "Global verdict: buy opportunity identified." : "Global verdict: compare or wait before purchasing.",
    args.commercePriorityLabel === "LIKELY DEAL SIGNAL" || args.commercePriorityLabel === "BEST DEAL FOUND"
      ? "Likely deal signal in current search sample."
      : null,
  ].filter(Boolean) as string[];

  return {
    ...brief,
    explanation: brief.explanation ? `${brief.explanation} ${args.headline}` : args.headline,
    buyReasoning:
      args.shouldBuyNow
        ? brief.buyReasoning ?? "Strongest global buy opportunity identified across merchants."
        : brief.buyReasoning,
    topSignals: [...lines, ...(brief.topSignals ?? brief.keyReasons ?? [])].slice(0, 8),
  };
}
