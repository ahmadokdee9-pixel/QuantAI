/**
 * Phase 13.7 — Intelligence Translation Layer.
 * Rewrites activated intelligence into buyer-friendly language using existing meta only.
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
import {
  resolveIntelligenceActivationStance,
  type IntelligenceActivationStance,
} from "@/lib/intelligence/intelligenceActivationEngine";

export type IntelligenceTranslationInput = {
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

const VERSION = "phase13.7-v1" as const;

type LevelBand = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

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

function clipSentences(lines: string[], max = 3): string {
  return uniqueStrings(lines).slice(0, max).join(" ");
}

function translateValueLevel(level: LevelBand): string {
  if (level === "VERY_LOW" || level === "LOW") return "Current price is not attractive enough.";
  if (level === "MEDIUM") return "Price is fair, but not a standout deal.";
  if (level === "HIGH") return "Price looks strong for what you get.";
  return "Price looks excellent for what you get.";
}

function translateTrustLevel(level: LevelBand): string {
  if (level === "VERY_LOW" || level === "LOW") return "Seller reputation needs extra verification.";
  if (level === "MEDIUM") return "Seller reputation is acceptable.";
  if (level === "HIGH") return "Seller reputation looks reliable.";
  return "Seller reputation looks very reliable.";
}

function translateReviewLevel(level: LevelBand): string {
  if (level === "VERY_LOW" || level === "LOW") return "Customer reviews may not be fully trustworthy.";
  if (level === "MEDIUM") return "Customer feedback looks mixed.";
  if (level === "HIGH") return "Customer feedback appears reliable.";
  return "Customer feedback looks very reliable.";
}

function translateDiscountLevel(level: LevelBand, fakeDiscountRisk: number): string {
  if (fakeDiscountRisk >= 0.45) return "Discount may be inflated — check the original price.";
  if (level === "VERY_LOW" || level === "LOW") return "Savings look modest or unclear.";
  if (level === "MEDIUM") return "Discount appears reasonable.";
  return "Discount appears genuine.";
}

function translateReadiness(status: DecisionReadinessMeta["readinessStatus"]): string {
  switch (status) {
    case "READY_TO_BUY":
      return "Signals support moving forward.";
    case "NEEDS_COMPARE":
      return "Compare a few options before you decide.";
    case "NEEDS_RESEARCH":
      return "A little more research could help before buying.";
    case "WAIT_FOR_BETTER_DEAL":
      return "Waiting may produce a better opportunity.";
    case "LOW_CONFIDENCE":
      return "Confidence is limited — proceed carefully.";
    default:
      return "Waiting may produce a better opportunity.";
  }
}

function translateExecution(executedRanking: ExecutedRankingMeta): string {
  if (executedRanking.executed) {
    return "Results highlight the strongest matches first.";
  }
  if (executedRanking.executionMode === "blocked") {
    return "Waiting may produce a better opportunity.";
  }
  return "Original result order is kept until confidence improves.";
}

function translateRankingReason(reason: string): string {
  const normalized = reason.toLowerCase();
  if (normalized.includes("trust signals are strong")) {
    return "Trust and seller signals look solid.";
  }
  if (normalized.includes("trust signals are too weak")) {
    return "Trust signals are not strong enough yet.";
  }
  if (normalized.includes("trust signals are mixed")) {
    return "Trust signals are mixed across sellers.";
  }
  if (normalized.includes("value")) return "Value signals need a closer look.";
  return reason.replace(/\bintelligence\b/gi, "signal").replace(/\bcontrolled ranking\b/gi, "result ordering");
}

function translateWarning(warning: string): string {
  const normalized = warning.toLowerCase();
  if (normalized.includes("fake discount")) return "Discount may be inflated — check the original price.";
  if (normalized.includes("trust signals are too weak")) return "Trust is not strong enough for a quick buy.";
  if (normalized.includes("trust signals are mixed")) return "Trust varies between sellers — compare carefully.";
  if (normalized.includes("weak value")) return "Current price is not attractive enough.";
  if (normalized.includes("blocked")) return "Waiting may produce a better opportunity.";
  return translateTechnicalPhrase(warning);
}

function translateTechnicalPhrase(text: string): string {
  return text
    .replace(/\bvalue intelligence (is )?(very low|low|weak)\b/gi, "Current price is not attractive enough")
    .replace(/\bvalue intelligence (is )?(very high|high|strong)\b/gi, "Price looks strong for what you get")
    .replace(/\bvalue intelligence:?[^.]*\./gi, "Price looks strong for what you get.")
    .replace(/\bretailer trust (is )?medium\b/gi, "Seller reputation is acceptable")
    .replace(/\bretailer trust (is )?(high|very high|strong)\b/gi, "Seller reputation looks reliable")
    .replace(/\breview credibility (is )?(high|very high|strong)\b/gi, "Customer feedback appears reliable")
    .replace(/\breal discount (signal )?(is )?(verified|high|strong)\b/gi, "Discount appears genuine")
    .replace(/\bdecision readiness blocked\b/gi, "Waiting may produce a better opportunity")
    .replace(/\bcontrolled ranking blocked execution\b/gi, "Waiting may produce a better opportunity")
    .replace(/\bcontrolled ranking\b/gi, "result ordering")
    .replace(/\bexecution confidence\b/gi, "match confidence")
    .replace(/\bintent confidence\b/gi, "search match confidence")
    .replace(/\bbuyer fit signal\b/gi, "product fit")
    .replace(/\(\d+(\.\d+)?\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildBuyerTopSignals(input: IntelligenceTranslationInput): string[] {
  const {
    rankingEngine,
    valueIntelligence,
    retailerTrust,
    reviewCredibility,
    realDiscount,
    rankingPreparation,
    executedRanking,
  } = input;

  return uniqueStrings([
    ...rankingEngine.rankingReasons.slice(0, 2).map(translateRankingReason),
    translateValueLevel(valueIntelligence.valueLevel),
    translateTrustLevel(retailerTrust.trustLevel),
    translateReviewLevel(reviewCredibility.credibilityLevel),
    realDiscount.discountScore >= 0.45
      ? translateDiscountLevel(realDiscount.discountLevel, realDiscount.fakeDiscountRisk)
      : "",
    rankingPreparation.buyerFitSignal >= 0.55 ? "This looks like a strong match for your search." : "",
    translateExecution(executedRanking),
  ]).slice(0, 5);
}

function buildBuyerRiskSignals(input: IntelligenceTranslationInput): string[] {
  const { rankingEngine, executedRanking, verdictIntelligence, valueIntelligence, realDiscount } = input;

  return uniqueStrings([
    ...rankingEngine.rankingWarnings.map(translateWarning),
    ...executedRanking.rankingWarnings.map(translateWarning),
    ...verdictIntelligence.warnings.map(translateWarning),
    valueIntelligence.valueLevel === "VERY_LOW" || valueIntelligence.valueLevel === "LOW"
      ? "Current price is not attractive enough."
      : "",
    realDiscount.fakeDiscountRisk >= 0.45 ? "Discount may be inflated — check the original price." : "",
  ]).slice(0, 5);
}

function buildBuyerConfidenceExplanation(input: IntelligenceTranslationInput): string {
  const { intentConfidence, rankingEngine, executedRanking, decisionReadiness } = input;
  const tier = intentConfidence.confidenceTier.toLowerCase();

  return clipSentences([
    tier === "high" || tier === "very_high"
      ? "We're reasonably confident this matches what you're looking for."
      : tier === "medium"
        ? "Match confidence is moderate — double-check the details."
        : "Match confidence is limited — proceed carefully.",
    rankingEngine.rankingTier === "HIGH" || rankingEngine.rankingTier === "VERY_HIGH"
      ? "Overall result quality looks solid."
      : "Overall result quality is mixed.",
    translateExecution(executedRanking),
    translateReadiness(decisionReadiness.readinessStatus),
  ], 3);
}

function buildBuyerMarketStatus(input: IntelligenceTranslationInput): string {
  const { decisionBrief, valueIntelligence, realDiscount, executedRanking } = input;

  return clipSentences([
    decisionBrief?.marketContextSummary
      ? translateTechnicalPhrase(decisionBrief.marketContextSummary)
      : "",
    valueIntelligence.longTermValueSignal >= 0.55
      ? "Long-term value looks favorable if you buy now."
      : valueIntelligence.longTermValueSignal <= 0.35
        ? "Timing favors waiting for a better price."
        : "Market timing looks neutral.",
    realDiscount.urgencyDiscountSignal >= 0.45
      ? "Sale urgency looks artificial — verify the anchor price."
      : realDiscount.priceDropSignal >= 0.55
        ? "Recent price movement looks favorable."
        : "Price timing is mixed.",
    executedRanking.executed
      ? "Stronger matches are shown first."
      : translateExecution(executedRanking),
  ], 3);
}

function buildBuyerBuyReasoning(input: IntelligenceTranslationInput, topSignals: string[]): string {
  const { decisionBrief, rankingPreparation } = input;
  return clipSentences([
    decisionBrief?.fusionSummary ? translateTechnicalPhrase(decisionBrief.fusionSummary) : "",
    ...topSignals.slice(0, 3),
    rankingPreparation.buyerFitSignal >= 0.55 ? "This looks like a strong match for your search." : "",
    "This is a solid option to move forward with.",
  ], 3);
}

function buildBuyerCompareReasoning(
  input: IntelligenceTranslationInput,
  topSignals: string[],
  riskSignals: string[]
): string {
  const { decisionBrief, valueIntelligence, retailerTrust, reviewCredibility } = input;

  return clipSentences([
    "Compare a few options before you decide.",
    decisionBrief?.alternativesSummary
      ? translateTechnicalPhrase(decisionBrief.alternativesSummary)
      : "A few alternatives are worth comparing side by side.",
    valueIntelligence.valueLevel !== retailerTrust.trustLevel
      ? "Price and seller signals do not fully agree."
      : "",
    reviewCredibility.credibilityLevel !== retailerTrust.trustLevel
      ? "Customer feedback and seller reputation tell different stories."
      : "",
    topSignals[0] ? `Best alternative angle: ${topSignals[0]}` : "",
    riskSignals[0] ? `Watch for: ${riskSignals[0]}` : "",
  ], 3);
}

function buildBuyerWaitReasoning(
  input: IntelligenceTranslationInput,
  topSignals: string[],
  riskSignals: string[]
): string {
  const { decisionBrief, decisionReadiness } = input;

  return clipSentences([
    translateReadiness(decisionReadiness.readinessStatus),
    decisionBrief?.decisionReadinessSummary
      ? translateTechnicalPhrase(decisionBrief.decisionReadinessSummary)
      : "",
    "Waiting may produce a better opportunity.",
    riskSignals.slice(0, 2).join(" "),
    topSignals[0] ? `If you revisit later, note: ${topSignals[0]}` : "",
  ], 3);
}

function buildBuyerExplanation(
  stance: IntelligenceActivationStance,
  input: IntelligenceTranslationInput,
  topSignals: string[],
  riskSignals: string[]
): string {
  const lead = translateTechnicalPhrase(input.verdictIntelligence.rationale ?? "");

  switch (stance) {
    case "BUY_READY":
      return clipSentences([lead, buildBuyerBuyReasoning(input, topSignals)], 3);
    case "COMPARE":
      return clipSentences([lead, buildBuyerCompareReasoning(input, topSignals, riskSignals)], 3);
    default:
      return clipSentences([lead, buildBuyerWaitReasoning(input, topSignals, riskSignals)], 3);
  }
}

/** Translate activated intelligence into buyer-friendly decision brief language. */
export function translateQuantAIIntelligence(
  input: IntelligenceTranslationInput
): DecisionBriefDTO | null {
  if (!input.decisionBrief) return null;

  const stance = resolveIntelligenceActivationStance(
    input.verdictIntelligence,
    input.decisionReadiness
  );
  const topSignals = buildBuyerTopSignals(input);
  const riskSignals = buildBuyerRiskSignals(input);
  const explanation = buildBuyerExplanation(stance, input, topSignals, riskSignals);
  const marketStatus = buildBuyerMarketStatus(input);
  const confidenceExplanation = buildBuyerConfidenceExplanation(input);
  const buyReasoning = buildBuyerBuyReasoning(input, topSignals);
  const compareReasoning = buildBuyerCompareReasoning(input, topSignals, riskSignals);
  const waitReasoning = buildBuyerWaitReasoning(input, topSignals, riskSignals);

  const translatedWhy = uniqueStrings([
    ...(stance === "BUY_READY" ? topSignals.slice(0, 3) : []),
    ...(stance === "COMPARE" ? [compareReasoning] : []),
    ...(stance === "WAIT" ? [waitReasoning] : []),
    ...input.decisionBrief.why.map(translateTechnicalPhrase),
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
    why: translatedWhy,
    fusionSummary: input.decisionBrief.fusionSummary
      ? translateTechnicalPhrase(input.decisionBrief.fusionSummary)
      : input.decisionBrief.fusionSummary,
    marketContextSummary: input.decisionBrief.marketContextSummary
      ? translateTechnicalPhrase(input.decisionBrief.marketContextSummary)
      : input.decisionBrief.marketContextSummary,
    decisionReadinessSummary: input.decisionBrief.decisionReadinessSummary
      ? translateTechnicalPhrase(input.decisionBrief.decisionReadinessSummary)
      : input.decisionBrief.decisionReadinessSummary,
  };
}

export const INTELLIGENCE_TRANSLATION_VERSION = VERSION;
