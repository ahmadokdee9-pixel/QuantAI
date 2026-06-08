/**
 * Phase 13.6 — Decision brief presentation bridge (existing visual slots only).
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type ActivatedBriefPresentation = {
  summaryLines: string[];
  reasoning: string;
  marketStatus: string;
  confidenceExplanation: string;
  topSignals: string[];
  riskSignals: string[];
};

function pickReasoning(brief: DecisionBriefDTO, verdict: PrimaryVerdict): string {
  switch (verdict) {
    case "BUY READY":
      return brief.buyReasoning ?? brief.explanation ?? "";
    case "COMPARE":
      return brief.compareReasoning ?? brief.explanation ?? "";
    case "WAIT":
    case "AVOID":
      return brief.waitReasoning ?? brief.explanation ?? "";
    default:
      return brief.explanation ?? "";
  }
}

/** Map activated decision brief fields into existing card/drawer text slots. */
export function resolveActivatedBriefPresentation(
  brief: DecisionBriefDTO | null | undefined,
  verdict: PrimaryVerdict
): ActivatedBriefPresentation | null {
  if (!brief?.explanation) return null;

  const reasoning = pickReasoning(brief, verdict);
  const topSignals = brief.topSignals ?? brief.keyReasons ?? [];
  const riskSignals = brief.riskSignals ?? [];

  const personalSignals = brief.personalCommerce
    ? [
        `Detected Buyer: ${brief.personalCommerce.detectedBuyer}`,
        `Detected Taste: ${brief.personalCommerce.detectedTaste}`,
        `Buyer Match: ${brief.personalCommerce.buyerMatchPct}%`,
        `Taste Match: ${brief.personalCommerce.tasteMatchPct}%`,
      ]
    : [];

  const summaryLines =
    verdict === "BUY READY"
      ? uniqueLines([...personalSignals, ...topSignals]).slice(0, 2)
      : verdict === "COMPARE"
        ? uniqueLines([...personalSignals, reasoning, ...topSignals]).slice(0, 2)
        : uniqueLines([...personalSignals, reasoning, ...riskSignals]).slice(0, 2);

  return {
    summaryLines: summaryLines.filter(Boolean),
    reasoning,
    marketStatus: brief.marketStatus ?? brief.marketContextSummary ?? "",
    confidenceExplanation: brief.confidenceExplanation ?? brief.confidenceSummary ?? "",
    topSignals,
    riskSignals,
  };
}

function uniqueLines(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
