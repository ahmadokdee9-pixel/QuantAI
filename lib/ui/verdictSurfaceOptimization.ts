/**
 * Phase 13.8 — Verdict Surface Optimization.
 * Prioritizes existing verdict language into current card slots only.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { DecisionReadinessMeta } from "@/lib/intelligence/decisionReadinessEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { ValueIntelligenceMeta } from "@/lib/intelligence/valueIntelligenceEngine";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { RankingEngineMeta } from "@/lib/ranking/deterministicRankingEngine";
import { resolveActivatedBriefPresentation } from "@/lib/ui/activatedDecisionBriefPresentation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type VerdictSurfaceContext = {
  verdictIntelligence?: VerdictIntelligenceMeta | null;
  rankingEngine?: RankingEngineMeta | null;
  decisionReadiness?: DecisionReadinessMeta | null;
  intentConfidence?: IntentConfidenceMeta | null;
  valueIntelligence?: ValueIntelligenceMeta | null;
};

export type VerdictSurfaceInput = VerdictSurfaceContext & {
  verdict: PrimaryVerdict;
  fallbackReason: string;
  decisionBrief?: DecisionBriefDTO | null;
};

export type OptimizedVerdictSurface = {
  verdictReason: string;
  summaryLines: string[];
};

const GLANCE_HOOK: Record<PrimaryVerdict, string> = {
  "BUY READY": "Solid buy — the main signals line up.",
  COMPARE: "Compare closely — signals do not fully agree.",
  WAIT: "Wait — timing or trust is not ready yet.",
  AVOID: "Avoid — risk outweighs the upside.",
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  return clipLine(match?.[0]?.trim() ?? trimmed);
}

function uniqueLines(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const line = clipLine(value);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

function readinessHook(readiness: DecisionReadinessMeta | null | undefined, verdict: PrimaryVerdict): string {
  if (!readiness) return GLANCE_HOOK[verdict];
  switch (readiness.readinessStatus) {
    case "READY_TO_BUY":
      return "Ready to buy — signals support moving forward.";
    case "NEEDS_COMPARE":
      return "Compare a few options before you decide.";
    case "WAIT_FOR_BETTER_DEAL":
      return "Waiting may produce a better opportunity.";
    case "LOW_CONFIDENCE":
    case "UNCERTAIN":
      return "Proceed carefully — confidence is limited.";
    default:
      return GLANCE_HOOK[verdict];
  }
}

function valueHook(valueIntelligence: ValueIntelligenceMeta | null | undefined): string {
  if (!valueIntelligence) return "";
  if (valueIntelligence.valueLevel === "VERY_LOW" || valueIntelligence.valueLevel === "LOW") {
    return "Current price is not attractive enough.";
  }
  if (valueIntelligence.valueLevel === "HIGH" || valueIntelligence.valueLevel === "VERY_HIGH") {
    return "Price looks strong for what you get.";
  }
  return "Price is fair, but not a standout deal.";
}

function confidenceHook(intentConfidence: IntentConfidenceMeta | null | undefined): string {
  if (!intentConfidence) return "";
  const tier = intentConfidence.confidenceTier.toLowerCase();
  if (tier === "high" || tier === "very_high") {
    return "Search match confidence looks solid.";
  }
  if (tier === "medium") {
    return "Search match confidence is moderate.";
  }
  return "Search match confidence is limited.";
}

function rankingHook(rankingEngine: RankingEngineMeta | null | undefined): string {
  if (!rankingEngine) return "";
  const reason = rankingEngine.rankingReasons[0];
  if (!reason) return "";
  if (reason.toLowerCase().includes("trust signals are strong")) {
    return "Trust and seller signals look solid.";
  }
  if (reason.toLowerCase().includes("trust signals are mixed")) {
    return "Trust varies between sellers — compare carefully.";
  }
  return clipLine(reason.replace(/\bintelligence\b/gi, "signal"));
}

function buildVerdictReason(
  verdict: PrimaryVerdict,
  activated: ReturnType<typeof resolveActivatedBriefPresentation>,
  input: VerdictSurfaceInput
): string {
  const fromBrief = activated?.reasoning ? firstSentence(activated.reasoning) : "";
  if (fromBrief) return fromBrief;

  const fromVerdict = input.verdictIntelligence?.rationale
    ? firstSentence(input.verdictIntelligence.rationale)
    : "";
  if (fromVerdict) return fromVerdict;

  if (verdict === "WAIT" || verdict === "AVOID") {
    const wait = input.decisionBrief?.waitReasoning ? firstSentence(input.decisionBrief.waitReasoning) : "";
    if (wait) return wait;
    return readinessHook(input.decisionReadiness, verdict);
  }

  if (verdict === "COMPARE") {
    const compare = input.decisionBrief?.compareReasoning
      ? firstSentence(input.decisionBrief.compareReasoning)
      : "";
    if (compare) return compare;
    return readinessHook(input.decisionReadiness, verdict);
  }

  const buy = input.decisionBrief?.buyReasoning ? firstSentence(input.decisionBrief.buyReasoning) : "";
  if (buy) return buy;

  const value = valueHook(input.valueIntelligence);
  if (value && verdict === "BUY READY") return value;

  return clipLine(input.fallbackReason) || readinessHook(input.decisionReadiness, verdict);
}

function buildSummaryLines(
  verdict: PrimaryVerdict,
  activated: ReturnType<typeof resolveActivatedBriefPresentation>,
  verdictReason: string,
  input: VerdictSurfaceInput
): string[] {
  const topSignals = activated?.topSignals ?? input.decisionBrief?.topSignals ?? [];
  const riskSignals = activated?.riskSignals ?? input.decisionBrief?.riskSignals ?? [];

  if (verdict === "BUY READY") {
    return uniqueLines([
      rankingHook(input.rankingEngine),
      topSignals[0],
      valueHook(input.valueIntelligence),
      confidenceHook(input.intentConfidence),
      topSignals[1],
    ]).filter((line) => line !== verdictReason).slice(0, 2);
  }

  if (verdict === "COMPARE") {
    return uniqueLines([
      topSignals[0],
      riskSignals[0] ?? rankingHook(input.rankingEngine),
      confidenceHook(input.intentConfidence),
      activated?.marketStatus ? firstSentence(activated.marketStatus) : "",
    ])
      .filter((line) => line !== verdictReason)
      .slice(0, 2);
  }

  return uniqueLines([
    riskSignals[0],
    valueHook(input.valueIntelligence),
    readinessHook(input.decisionReadiness, verdict),
    riskSignals[1],
  ])
    .filter((line) => line !== verdictReason)
    .slice(0, 2);
}

/** Optimize existing verdict copy for the card verdict band and summary slots. */
export function optimizeVerdictSurface(input: VerdictSurfaceInput): OptimizedVerdictSurface {
  const activated = input.decisionBrief
    ? resolveActivatedBriefPresentation(input.decisionBrief, input.verdict)
    : null;

  const verdictReason = buildVerdictReason(input.verdict, activated, input);
  const summaryLines = buildSummaryLines(input.verdict, activated, verdictReason, input);

  if (summaryLines.length >= 2) {
    return { verdictReason, summaryLines };
  }

  const fallbackSummary = uniqueLines([
    ...summaryLines,
    rankingHook(input.rankingEngine),
    valueHook(input.valueIntelligence),
    confidenceHook(input.intentConfidence),
    clipLine(input.fallbackReason),
  ]).filter((line) => line !== verdictReason);

  while (fallbackSummary.length < 2) fallbackSummary.push("");
  return { verdictReason, summaryLines: fallbackSummary.slice(0, 2) };
}
