/**
 * Phase 45 — Production Readiness Brief Enrichment.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import type { MarketSummaryV2 } from "@/lib/intelligence/marketSummaryV2Engine";
import { enrichDecisionBriefWithOpportunityDetection } from "@/lib/ui/opportunityDetectionBriefEnrichment";

export function enrichDecisionBriefWithProductionReadiness(
  brief: DecisionBriefDTO | null,
  coverage: MarketCoverageIntelligence,
  marketSummary: MarketSummaryV2,
  queryLine: string,
  args: {
    trueValueScore?: number;
    qualityScore?: number;
    discountConfidence?: number;
    merchantReliabilityScore?: number;
    reasoningFocus?: string[];
    opportunity?: import("@/lib/intelligence/opportunityDetectionEngine").ProductOpportunityIntelligence;
  }
): DecisionBriefDTO | null {
  const base = enrichDecisionBriefWithOpportunityDetection(
    brief,
    coverage,
    marketSummary,
    queryLine,
    args.opportunity
  );
  if (!base) return null;

  const focus = args.reasoningFocus?.join(" · ") ?? "Balanced commerce signals";

  return {
    ...base,
    trueValueScore: args.trueValueScore,
    categoryQualityScore: args.qualityScore,
    discountConfidenceScore: args.discountConfidence,
    merchantReliabilityScore: args.merchantReliabilityScore,
    topSignals: [
      args.trueValueScore !== undefined ? `True Value Score: ${args.trueValueScore}` : null,
      args.qualityScore !== undefined ? `Category Quality: ${args.qualityScore}` : null,
      args.discountConfidence !== undefined ? `Discount Confidence: ${args.discountConfidence}` : null,
      `Reasoning Focus: ${focus}`,
      ...(base.topSignals ?? []),
    ].filter((line): line is string => Boolean(line)).slice(0, 8),
  };
}
