/**
 * Phase 2F — Explainable AI output layer.
 * Transforms recommendation and truth evidence into natural-language buying intelligence.
 */

import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";
import type { RecommendationTier } from "@/lib/truth/recommendationIntelligenceEngine";

export type ExplainableAISnapshot = {
  headline: string;
  recommendationNarrative: string;
  whyThisProduct: string;
  strengths: string[];
  weaknesses: string[];
  trustSummary: string;
  valueSummary: string;
  bestFor: string[];
  avoidIf: string[];
  finalVerdict: string;
  explainabilityConfidence: number;
};

export type ExplainableAIInput = Omit<TruthFoundationSnapshot, "explainableAI" | "conversationalIntent" | "tastePreference">;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function uniqueNonEmpty(items: string[], limit = 5): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

function humanizeUseCase(useCase: string | null): string | null {
  if (!useCase) return null;
  return useCase
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildStrengths(input: ExplainableAIInput): string[] {
  const match = input.productMatch;
  const reasoning = input.productReasoning;
  const recommendation = input.recommendationIntelligence;
  return uniqueNonEmpty(
    [
      ...reasoning.topPositiveReasons.slice(0, 3),
      match.strongestMatchReason,
      recommendation.primaryRecommendationReason,
      match.intentMatchScore >= 70 ? `Strong ${input.intentEngine.intent.productType ?? "product"} alignment` : "",
      match.budgetMatchScore >= 70 && input.intentEngine.intent.budget != null
        ? "Price fits your stated budget"
        : "",
      match.useCaseMatchScore >= 70 ? "Use case signals look favorable" : "",
    ],
    5
  );
}

function buildWeaknesses(input: ExplainableAIInput): string[] {
  const reasoning = input.productReasoning;
  const recommendation = input.recommendationIntelligence;
  const items = [
    ...reasoning.topNegativeReasons.slice(0, 3),
    recommendation.primaryWarningReason !== "No major warning" ? recommendation.primaryWarningReason : "",
    ...input.trustEngine.trustRisks.slice(0, 2),
  ];
  if (input.commerceIntelligence.commerceConfidence < 50) {
    items.push("Commerce confidence is limited");
  }
  return uniqueNonEmpty(items, 5);
}

function buildTrustSummary(input: ExplainableAIInput): string {
  const trust = input.trustEngine;
  if (trust.trustState === "TRUST_STRONG" || trust.trustState === "TRUST_GOOD") {
    return `Trust looks solid (${trust.trustScore}/100) with ${trust.trustSignals[0]?.toLowerCase() ?? "supporting merchant and listing signals"}.`;
  }
  if (trust.trustState === "TRUST_CAUTION") {
    return `Trust is cautious (${trust.trustScore}/100). ${trust.trustRisks[0] ?? "Some verification signals remain incomplete."}`;
  }
  return `Trust is limited (${trust.trustScore}/100). ${trust.trustRisks[0] ?? "Treat listing claims carefully until more evidence is available."}`;
}

function buildValueSummary(input: ExplainableAIInput): string {
  const intent = input.intentEngine.intent;
  const match = input.productMatch;
  const commerce = input.commerceIntelligence;

  if (intent.budget != null && match.budgetMatchScore >= 70) {
    return `Value looks favorable for a ${intent.currency ?? "budget"} ${intent.budget} target with commerce confidence ${commerce.commerceConfidence}/100.`;
  }
  if (match.budgetMatchScore >= 55) {
    return `Pricing appears reasonable for your query with commerce confidence ${commerce.commerceConfidence}/100.`;
  }
  if (intent.budget != null && match.budgetMatchScore < 45) {
    return `This listing may exceed your ${intent.currency ?? "budget"} ${intent.budget} target; compare alternatives before buying.`;
  }
  return `Commerce value signals are ${commerce.commerceState.toLowerCase().replace(/_/g, " ")} (${commerce.commerceConfidence}/100).`;
}

function deriveFinalVerdict(tier: RecommendationTier, shouldRecommend: boolean): string {
  if (tier === "BEST_MATCH") return "Strong buy candidate for your search";
  if (tier === "RECOMMENDED") return "Good fit for your search";
  if (tier === "CONSIDER") return shouldRecommend ? "Worth comparing before buying" : "Compare carefully before buying";
  return "Not a strong fit for this search";
}

function buildHeadline(input: ExplainableAIInput): string {
  const intent = input.intentEngine.intent;
  const tier = input.recommendationIntelligence.recommendationTier;
  const productLabel = intent.productType ?? "product";
  const useCaseLabel = intent.useCase ? ` for ${intent.useCase}` : "";

  if (tier === "BEST_MATCH") return `Best ${productLabel} match${useCaseLabel}`;
  if (tier === "RECOMMENDED") return `Recommended ${productLabel}${useCaseLabel}`;
  if (tier === "CONSIDER") return `${productLabel} worth considering${useCaseLabel}`;
  return `${productLabel} is a weak match${useCaseLabel}`;
}

function buildWhyThisProduct(input: ExplainableAIInput, strengths: string[]): string {
  const intent = input.intentEngine.intent;
  const recommendation = input.recommendationIntelligence;
  const lead = strengths[0] ?? recommendation.primaryRecommendationReason;
  const productLabel = intent.productType ?? "product";
  const useCaseLabel = intent.useCase ? ` ${intent.useCase}` : "";
  return `This ${productLabel} stands out for your${useCaseLabel} search because ${lead.toLowerCase()}. Match score ${input.productMatch.overallMatchScore}/100.`;
}

function buildRecommendationNarrative(input: ExplainableAIInput, strengths: string[], weaknesses: string[]): string {
  const recommendation = input.recommendationIntelligence;
  const reasoning = input.productReasoning;
  const positive = strengths[0] ?? recommendation.primaryRecommendationReason;
  const negative = weaknesses[0] ?? recommendation.primaryWarningReason;

  if (recommendation.recommendationTier === "BEST_MATCH" || recommendation.recommendationTier === "RECOMMENDED") {
    return `${recommendation.recommendationSummary} ${reasoning.summaryReason} Key upside: ${positive.toLowerCase()}.`;
  }
  if (recommendation.recommendationTier === "CONSIDER") {
    return `${recommendation.recommendationSummary} Watch for ${negative.toLowerCase()} while you compare options.`;
  }
  return `${recommendation.recommendationSummary} Main concern: ${negative.toLowerCase()}.`;
}

function buildBestFor(input: ExplainableAIInput): string[] {
  const fromReasoning = input.productReasoning.bestFor;
  if (fromReasoning.length > 0) return uniqueNonEmpty(fromReasoning, 4);

  const intent = input.intentEngine.intent;
  const items: string[] = [];
  if (intent.useCase) items.push(`${humanizeUseCase(intent.useCase)} shoppers`);
  if (intent.productType) items.push(`${intent.productType} buyers`);
  if (intent.preferredBrand) items.push(`${intent.preferredBrand} preference`);
  return uniqueNonEmpty(items, 4);
}

function buildAvoidIf(input: ExplainableAIInput): string[] {
  const fromReasoning = input.productReasoning.notIdealFor;
  if (fromReasoning.length > 0) return uniqueNonEmpty(fromReasoning, 4);

  const weaknesses = buildWeaknesses(input);
  return uniqueNonEmpty(
    weaknesses.map((item) => `You need to avoid ${item.toLowerCase()}`),
    4
  );
}

function computeExplainabilityConfidence(input: ExplainableAIInput, strengths: string[], weaknesses: string[]): number {
  const scoreInputs = [
    Boolean(input.recommendationIntelligence.recommendationSummary),
    Boolean(input.productReasoning.summaryReason),
    strengths.length > 0,
    weaknesses.length > 0,
    input.productReasoning.explainabilityScore > 0,
    input.recommendationIntelligence.confidenceScore > 0,
    input.trustEngine.trustScore > 0,
    input.commerceIntelligence.commerceConfidence > 0,
    input.productMatch.overallMatchScore > 0,
    input.recommendationIntelligence.recommendationEvidenceChain.length > 0,
  ].filter(Boolean).length;

  return clampScore(
    input.productReasoning.explainabilityScore * 0.22 +
      input.recommendationIntelligence.confidenceScore * 0.22 +
      input.productMatch.overallMatchScore * 0.22 +
      input.recommendationIntelligence.recommendationScore * 0.18 +
      (scoreInputs / 10) * 100 * 0.16
  );
}

export function buildExplainableAIEvidenceChain(snapshot: ExplainableAISnapshot): string[] {
  return uniqueNonEmpty(
    [
      `headline:${snapshot.headline}`,
      `verdict:${snapshot.finalVerdict}`,
      `confidence:${snapshot.explainabilityConfidence}`,
      `why:${snapshot.whyThisProduct}`,
      ...snapshot.strengths.slice(0, 2).map((item) => `strength:${item}`),
      ...snapshot.weaknesses.slice(0, 2).map((item) => `weakness:${item}`),
      `trust:${snapshot.trustSummary}`,
      `value:${snapshot.valueSummary}`,
    ],
    12
  );
}

export function hasExplainableAISignal(snapshot: ExplainableAISnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.headline.length > 0);
}

/** Build natural-language explainable AI snapshot from recommendation and truth layers. */
export function buildExplainableAIEngine(input: ExplainableAIInput): ExplainableAISnapshot {
  const strengths = buildStrengths(input);
  const weaknesses = buildWeaknesses(input);
  const recommendation = input.recommendationIntelligence;
  const explainabilityConfidence = computeExplainabilityConfidence(input, strengths, weaknesses);

  return {
    headline: buildHeadline(input),
    recommendationNarrative: buildRecommendationNarrative(input, strengths, weaknesses),
    whyThisProduct: buildWhyThisProduct(input, strengths),
    strengths,
    weaknesses,
    trustSummary: buildTrustSummary(input),
    valueSummary: buildValueSummary(input),
    bestFor: buildBestFor(input),
    avoidIf: buildAvoidIf(input),
    finalVerdict: deriveFinalVerdict(recommendation.recommendationTier, recommendation.shouldRecommend),
    explainabilityConfidence,
  };
}
