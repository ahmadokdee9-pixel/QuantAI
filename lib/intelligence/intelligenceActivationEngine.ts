/**
 * Phase 13.6 — QuantAI Intelligence Activation Layer.
 * Surfaces existing intelligence through decisionBrief without new scoring engines.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { DecisionReadinessMeta } from "@/lib/intelligence/decisionReadinessEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { RankingPreparationMeta } from "@/lib/intelligence/rankingPreparationEngine";
import type { RealDiscountMeta } from "@/lib/intelligence/realDiscountEngine";
import type { RetailerTrustMeta } from "@/lib/intelligence/retailerTrustEngine";
import type { ReviewCredibilityMeta } from "@/lib/intelligence/reviewCredibilityEngine";
import type { ValueIntelligenceMeta } from "@/lib/intelligence/valueIntelligenceEngine";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { ExecutedRankingMeta } from "@/lib/ranking/controlledRankingExecution";
import type { RankingEngineMeta } from "@/lib/ranking/deterministicRankingEngine";

export type IntelligenceActivationStance = "BUY_READY" | "COMPARE" | "WAIT";

export type IntelligenceActivationInput = {
  decisionBrief: DecisionBriefDTO | null;
  verdictIntelligence: VerdictIntelligenceMeta;
  rankingEngine: RankingEngineMeta;
  executedRanking: ExecutedRankingMeta;
  valueIntelligence: ValueIntelligenceMeta;
  retailerTrust: RetailerTrustMeta;
  reviewCredibility: ReviewCredibilityMeta;
  realDiscount: RealDiscountMeta;
  rankingPreparation: RankingPreparationMeta;
  intentConfidence: IntentConfidenceMeta;
  decisionReadiness: DecisionReadinessMeta;
};

const VERSION = "phase13.6-v1" as const;

const BUY_VERDICTS = new Set(["STRONG BUY", "BUY READY", "BEST VALUE", "PREMIUM PICK"]);

function humanizeFlag(flag: string): string {
  return flag.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function levelPhrase(label: string, score: number): string {
  return `${label.replace(/_/g, " ").toLowerCase()} (${score})`;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (value == null) continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function resolveIntelligenceActivationStance(
  verdictIntelligence: VerdictIntelligenceMeta,
  decisionReadiness: DecisionReadinessMeta
): IntelligenceActivationStance {
  if (verdictIntelligence.verdict === "WAIT" || verdictIntelligence.verdict === "AVOID") {
    return "WAIT";
  }
  if (verdictIntelligence.verdict === "CONSIDER") {
    return "COMPARE";
  }
  if (BUY_VERDICTS.has(verdictIntelligence.verdict)) {
    return "BUY_READY";
  }

  switch (decisionReadiness.readinessStatus) {
    case "READY_TO_BUY":
      return "BUY_READY";
    case "NEEDS_COMPARE":
      return "COMPARE";
    default:
      return "WAIT";
  }
}

function buildTopSignals(input: IntelligenceActivationInput): string[] {
  const { rankingEngine, valueIntelligence, retailerTrust, reviewCredibility, realDiscount, rankingPreparation, executedRanking } =
    input;

  return uniqueStrings([
    ...rankingEngine.rankingReasons.slice(0, 3),
    ...rankingPreparation.rankingStrength.slice(0, 2).map(humanizeFlag),
    `Value intelligence: ${levelPhrase(valueIntelligence.valueLevel, valueIntelligence.valueScore)}.`,
    `Retailer trust: ${levelPhrase(retailerTrust.trustLevel, retailerTrust.trustScore)}.`,
    `Review credibility: ${levelPhrase(reviewCredibility.credibilityLevel, reviewCredibility.credibilityScore)}.`,
    realDiscount.discountScore >= 0.45
      ? `Real discount signal: ${levelPhrase(realDiscount.discountLevel, realDiscount.discountScore)}.`
      : "",
    rankingPreparation.buyerFitSignal >= 0.55
      ? `Buyer fit signal is strong (${rankingPreparation.buyerFitSignal}).`
      : "",
    executedRanking.executed
      ? `Controlled ranking applied in ${executedRanking.executionMode} mode at confidence ${executedRanking.executionConfidence}.`
      : "Controlled ranking held — tray order preserved.",
  ]).slice(0, 6);
}

function buildRiskSignals(input: IntelligenceActivationInput): string[] {
  const {
    rankingEngine,
    executedRanking,
    valueIntelligence,
    retailerTrust,
    reviewCredibility,
    realDiscount,
    rankingPreparation,
    verdictIntelligence,
  } = input;

  return uniqueStrings([
    ...rankingEngine.rankingWarnings,
    ...executedRanking.rankingWarnings,
    ...verdictIntelligence.warnings,
    ...rankingPreparation.rankingWeaknesses.slice(0, 2).map(humanizeFlag),
    ...valueIntelligence.riskFlags.map(humanizeFlag),
    ...retailerTrust.riskFlags.map(humanizeFlag),
    ...reviewCredibility.riskFlags.map(humanizeFlag),
    ...realDiscount.riskFlags.map(humanizeFlag),
  ]).slice(0, 6);
}

function buildConfidenceExplanation(input: IntelligenceActivationInput): string {
  const { intentConfidence, rankingEngine, executedRanking, decisionReadiness } = input;
  return [
    `Intent confidence is ${intentConfidence.confidenceTier.toLowerCase()} (${intentConfidence.overallConfidence}).`,
    `Ranking confidence weight ${rankingEngine.confidenceWeight} with ${rankingEngine.rankingTier.toLowerCase()} ranking tier.`,
    executedRanking.executed
      ? `Execution confidence ${executedRanking.executionConfidence} in ${executedRanking.executionMode} mode.`
      : "Ranking execution did not reorder this tray.",
    `Decision readiness ${decisionReadiness.readinessStatus.replace(/_/g, " ").toLowerCase()} at ${decisionReadiness.readinessScore}.`,
  ].join(" ");
}

function buildMarketStatus(input: IntelligenceActivationInput): string {
  const { decisionBrief, executedRanking, valueIntelligence, realDiscount } = input;
  const parts = [
    decisionBrief?.marketContextSummary,
    valueIntelligence.longTermValueSignal >= 0.55
      ? "Long-term value signal supports buying now."
      : valueIntelligence.longTermValueSignal <= 0.35
        ? "Long-term value signal favors patience."
        : "Long-term value signal is neutral.",
    realDiscount.urgencyDiscountSignal >= 0.45
      ? "Artificial urgency detected — verify anchor pricing."
      : realDiscount.priceDropSignal >= 0.55
        ? "Price-drop signal supports favorable timing."
        : "Market timing is mixed across discount signals.",
    executedRanking.executed
      ? `Ranking execution summary: ${executedRanking.rankingSummary}`
      : executedRanking.rankingSummary,
  ];
  return uniqueStrings(parts.filter((part): part is string => Boolean(part))).join(" ");
}

function buildBuyReasoning(input: IntelligenceActivationInput, topSignals: string[], riskSignals: string[]): string {
  const { decisionBrief, valueIntelligence, retailerTrust, reviewCredibility, realDiscount, rankingPreparation } =
    input;
  return uniqueStrings([
    decisionBrief?.fusionSummary,
    decisionBrief?.whyPrimaryWins,
    `Top strengths: ${topSignals.slice(0, 3).join(" ")}`,
    `Value: ${levelPhrase(valueIntelligence.valueLevel, valueIntelligence.valueScore)} with price-to-quality ${valueIntelligence.priceToQualitySignal}.`,
    `Trust: ${levelPhrase(retailerTrust.trustLevel, retailerTrust.trustScore)}; reviews ${levelPhrase(reviewCredibility.credibilityLevel, reviewCredibility.credibilityScore)}.`,
    realDiscount.discountScore >= 0.45
      ? `Discount reads genuine (${realDiscount.discountLevel.toLowerCase()}).`
      : "Discount signal is modest — value case rests on quality and trust.",
    rankingPreparation.buyerFitSignal >= 0.55
      ? `Buyer fit is strong (${rankingPreparation.buyerFitSignal}).`
      : "",
    riskSignals.length ? `Residual checks: ${riskSignals.slice(0, 2).join(" ")}` : "",
  ]).join(" ");
}

function buildCompareReasoning(input: IntelligenceActivationInput, topSignals: string[], riskSignals: string[]): string {
  const { decisionBrief, rankingEngine, valueIntelligence, retailerTrust, reviewCredibility } = input;
  const conflicts = uniqueStrings([
    ...rankingEngine.rankingWarnings,
    valueIntelligence.valueLevel === "VERY_LOW" || valueIntelligence.valueLevel === "LOW"
      ? "Value intelligence is weak relative to trust posture."
      : "",
    retailerTrust.trustLevel !== reviewCredibility.credibilityLevel
      ? `Trust (${retailerTrust.trustLevel}) and review credibility (${reviewCredibility.credibilityLevel}) diverge.`
      : "",
  ]);

  return uniqueStrings([
    decisionBrief?.alternativesSummary,
    decisionBrief?.competitiveSummary,
    "Comparison is recommended because signals conflict across value, trust, and timing.",
    conflicts.length ? `Conflicting signals: ${conflicts.join(" ")}` : "",
    topSignals.length
      ? `Alternative strength: ${topSignals.slice(0, 2).join(" ")}`
      : "Review peer listings before committing.",
    riskSignals.length ? `Watchpoints: ${riskSignals.slice(0, 2).join(" ")}` : "",
  ]).join(" ");
}

function buildWaitReasoning(input: IntelligenceActivationInput, topSignals: string[], riskSignals: string[]): string {
  const { decisionBrief, rankingPreparation, valueIntelligence, realDiscount, executedRanking } = input;
  const weakSignals = uniqueStrings([
    ...rankingPreparation.rankingWeaknesses.map(humanizeFlag),
    valueIntelligence.valueLevel === "VERY_LOW" || valueIntelligence.valueLevel === "LOW"
      ? `Value intelligence is ${valueIntelligence.valueLevel.toLowerCase()}.`
      : "",
    realDiscount.fakeDiscountRisk >= 0.45 ? "Fake discount risk elevated." : "",
    executedRanking.executionMode === "blocked" ? "Controlled ranking blocked execution." : "",
  ]);

  return uniqueStrings([
    decisionBrief?.decisionReadinessSummary,
    "Waiting may be better while weak signals resolve.",
    weakSignals.length ? `Weak signals: ${weakSignals.join(" ")}` : "",
    buildMarketStatus(input),
    riskSignals.length ? `Risk profile: ${riskSignals.slice(0, 3).join(" ")}` : "",
    topSignals.length ? `Partial strengths to revisit later: ${topSignals.slice(0, 2).join(" ")}` : "",
  ]).join(" ");
}

function buildExplanation(
  stance: IntelligenceActivationStance,
  input: IntelligenceActivationInput,
  topSignals: string[],
  riskSignals: string[]
): string {
  const { decisionBrief, verdictIntelligence } = input;
  const lead = decisionBrief?.explanationSummary ?? verdictIntelligence.rationale;

  switch (stance) {
    case "BUY_READY":
      return uniqueStrings([lead, buildBuyReasoning(input, topSignals, riskSignals)]).join(" ");
    case "COMPARE":
      return uniqueStrings([lead, buildCompareReasoning(input, topSignals, riskSignals)]).join(" ");
    default:
      return uniqueStrings([lead, buildWaitReasoning(input, topSignals, riskSignals)]).join(" ");
  }
}

/** Activate existing QuantAI intelligence on the decision brief. */
export function activateQuantAIIntelligence(
  input: IntelligenceActivationInput
): DecisionBriefDTO | null {
  if (!input.decisionBrief) return null;

  const topSignals = buildTopSignals(input);
  const riskSignals = buildRiskSignals(input);
  const stance = resolveIntelligenceActivationStance(input.verdictIntelligence, input.decisionReadiness);
  const explanation = buildExplanation(stance, input, topSignals, riskSignals);
  const marketStatus = buildMarketStatus(input);
  const confidenceExplanation = buildConfidenceExplanation(input);
  const buyReasoning = buildBuyReasoning(input, topSignals, riskSignals);
  const compareReasoning = buildCompareReasoning(input, topSignals, riskSignals);
  const waitReasoning = buildWaitReasoning(input, topSignals, riskSignals);

  const activatedWhy = uniqueStrings([
    ...(stance === "BUY_READY" ? topSignals.slice(0, 4) : []),
    ...(stance === "COMPARE" ? [compareReasoning] : []),
    ...(stance === "WAIT" ? [waitReasoning] : []),
    ...input.decisionBrief.why,
  ]).slice(0, 6);

  return {
    ...input.decisionBrief,
    explanation,
    marketStatus,
    buyReasoning,
    waitReasoning,
    compareReasoning,
    topSignals,
    riskSignals,
    confidenceExplanation,
    explanationSummary: explanation,
    keyReasons: topSignals.slice(0, 4),
    confidenceSummary: confidenceExplanation,
    why: activatedWhy,
  };
}

export const INTELLIGENCE_ACTIVATION_VERSION = VERSION;
