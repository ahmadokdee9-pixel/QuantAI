/**
 * Phase 2E — Recommendation intelligence engine.
 * Final recommendation layer on intent, match, reasoning, trust, and intelligence signals.
 */

import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type RecommendationTier = "BEST_MATCH" | "RECOMMENDED" | "CONSIDER" | "NOT_RECOMMENDED";

export type RecommendationSnapshot = {
  recommendationTier: RecommendationTier;
  recommendationScore: number;
  confidenceScore: number;
  recommendationSummary: string;
  primaryRecommendationReason: string;
  primaryWarningReason: string;
  shouldRecommend: boolean;
  shouldHighlight: boolean;
  recommendationEvidenceChain: string[];
};

export type RecommendationIntelligenceInput = Omit<TruthFoundationSnapshot, "recommendationIntelligence" | "explainableAI" | "conversationalIntent" | "tastePreference">;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function uniqueNonEmpty(items: string[], limit = 10): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

function computeRecommendationScore(input: RecommendationIntelligenceInput): number {
  const match = input.productMatch;
  const reasoning = input.productReasoning;
  return clampScore(
    match.overallMatchScore * 0.38 +
      reasoning.reasoningConfidence * 0.3 +
      input.trustEngine.trustScore * 0.12 +
      input.productIntelligence.overallProductConfidence * 0.1 +
      input.commerceIntelligence.commerceConfidence * 0.1
  );
}

function computeConfidenceScore(input: RecommendationIntelligenceInput): number {
  const reasoning = input.productReasoning;
  return clampScore(
    reasoning.reasoningConfidence * 0.34 +
      input.trustEngine.trustConfidence * 0.26 +
      input.productIntelligence.overallProductConfidence * 0.2 +
      input.commerceIntelligence.commerceConfidence * 0.2
  );
}

function deriveRecommendationTier(args: {
  recommendationScore: number;
  confidenceScore: number;
  overallMatchScore: number;
  trustScore: number;
  reasoningStrength: string;
}): RecommendationTier {
  if (
    args.recommendationScore >= 72 &&
    args.confidenceScore >= 58 &&
    args.overallMatchScore >= 74 &&
    args.trustScore >= 55 &&
    (args.reasoningStrength === "STRONG" || args.reasoningStrength === "GOOD")
  ) {
    return "BEST_MATCH";
  }

  if (
    args.recommendationScore >= 52 &&
    args.overallMatchScore >= 68 &&
    args.reasoningStrength !== "WEAK" &&
    args.reasoningStrength !== "UNKNOWN"
  ) {
    return "RECOMMENDED";
  }

  if (args.recommendationScore >= 40 && args.overallMatchScore >= 45) {
    return "CONSIDER";
  }

  if (args.overallMatchScore < 35 || args.reasoningStrength === "WEAK") {
    return "NOT_RECOMMENDED";
  }

  return args.recommendationScore >= 40 ? "CONSIDER" : "NOT_RECOMMENDED";
}

function pickPrimaryRecommendationReason(input: RecommendationIntelligenceInput): string {
  return (
    input.productReasoning.topPositiveReasons[0] ??
    input.productMatch.strongestMatchReason ??
    input.productReasoning.shortReason ??
    "General intent alignment"
  );
}

function pickPrimaryWarningReason(input: RecommendationIntelligenceInput): string {
  const warning =
    input.productReasoning.topNegativeReasons[0] ??
    (input.productMatch.strongestMismatchReason !== "No major mismatch detected"
      ? input.productMatch.strongestMismatchReason
      : "");
  return warning || "No major warning";
}

function buildRecommendationEvidenceChain(
  input: RecommendationIntelligenceInput,
  tier: RecommendationTier,
  recommendationScore: number,
  confidenceScore: number,
  primaryRecommendationReason: string,
  primaryWarningReason: string
): string[] {
  const intent = input.intentEngine.intent;
  return uniqueNonEmpty(
    [
      `intent:${intent.productType ?? "unknown"}:${intent.useCase ?? "general"}`,
      `match:${input.productMatch.overallMatchScore}`,
      `reasoning:${input.productReasoning.recommendationStrength}:${input.productReasoning.reasoningConfidence}`,
      `trust:${input.trustEngine.trustScore}:${input.trustEngine.trustState}`,
      `product_intel:${input.productIntelligence.overallProductConfidence}`,
      `commerce_intel:${input.commerceIntelligence.commerceConfidence}`,
      `tier:${tier}`,
      `recommendation_score:${recommendationScore}`,
      `confidence_score:${confidenceScore}`,
      `positive:${primaryRecommendationReason}`,
      primaryWarningReason !== "No major warning" ? `warning:${primaryWarningReason}` : "",
    ],
    12
  );
}

function buildRecommendationSummary(args: {
  tier: RecommendationTier;
  intent: RecommendationIntelligenceInput["intentEngine"]["intent"];
  recommendationScore: number;
  confidenceScore: number;
  primaryRecommendationReason: string;
  primaryWarningReason: string;
}): string {
  const productLabel = args.intent.productType ?? "product";
  const useCaseLabel = args.intent.useCase ? ` for ${args.intent.useCase}` : "";

  if (args.tier === "BEST_MATCH") {
    return `Best match ${productLabel}${useCaseLabel}: ${args.primaryRecommendationReason.toLowerCase()}. Recommendation score ${args.recommendationScore} with ${args.confidenceScore}% confidence.`;
  }
  if (args.tier === "RECOMMENDED") {
    return `Recommended ${productLabel}${useCaseLabel} based on ${args.primaryRecommendationReason.toLowerCase()}. Score ${args.recommendationScore}, confidence ${args.confidenceScore}%.`;
  }
  if (args.tier === "CONSIDER") {
    return `Consider this ${productLabel}${useCaseLabel} with caution: ${args.primaryRecommendationReason.toLowerCase()}, but ${args.primaryWarningReason.toLowerCase()}.`;
  }
  return `Not recommended for this ${productLabel}${useCaseLabel} search due to ${args.primaryWarningReason.toLowerCase()}.`;
}

function deriveShouldRecommend(
  tier: RecommendationTier,
  recommendationScore: number,
  confidenceScore: number,
  overallMatchScore: number
): boolean {
  if (tier === "BEST_MATCH" || tier === "RECOMMENDED") return true;
  if (tier === "CONSIDER") {
    return recommendationScore >= 48 && (confidenceScore >= 38 || overallMatchScore >= 68);
  }
  return false;
}

function deriveShouldHighlight(
  tier: RecommendationTier,
  recommendationScore: number,
  _confidenceScore: number,
  overallMatchScore: number
): boolean {
  if (tier === "BEST_MATCH") return true;
  if (tier === "RECOMMENDED") return recommendationScore >= 55 && overallMatchScore >= 70;
  return false;
}

export function hasRecommendationIntelligenceSignal(snapshot: RecommendationSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.recommendationScore >= 0);
}

/** Build final recommendation snapshot from fused truth foundation layers. */
export function buildRecommendationIntelligenceEngine(
  input: RecommendationIntelligenceInput
): RecommendationSnapshot {
  const recommendationScore = computeRecommendationScore(input);
  const confidenceScore = computeConfidenceScore(input);
  const primaryRecommendationReason = pickPrimaryRecommendationReason(input);
  const primaryWarningReason = pickPrimaryWarningReason(input);
  const recommendationTier = deriveRecommendationTier({
    recommendationScore,
    confidenceScore,
    overallMatchScore: input.productMatch.overallMatchScore,
    trustScore: input.trustEngine.trustScore,
    reasoningStrength: input.productReasoning.recommendationStrength,
  });
  const recommendationEvidenceChain = buildRecommendationEvidenceChain(
    input,
    recommendationTier,
    recommendationScore,
    confidenceScore,
    primaryRecommendationReason,
    primaryWarningReason
  );
  const recommendationSummary = buildRecommendationSummary({
    tier: recommendationTier,
    intent: input.intentEngine.intent,
    recommendationScore,
    confidenceScore,
    primaryRecommendationReason,
    primaryWarningReason,
  });
  const shouldRecommend = deriveShouldRecommend(
    recommendationTier,
    recommendationScore,
    confidenceScore,
    input.productMatch.overallMatchScore
  );
  const shouldHighlight = deriveShouldHighlight(
    recommendationTier,
    recommendationScore,
    confidenceScore,
    input.productMatch.overallMatchScore
  );

  return {
    recommendationTier,
    recommendationScore,
    confidenceScore,
    recommendationSummary,
    primaryRecommendationReason,
    primaryWarningReason,
    shouldRecommend,
    shouldHighlight,
    recommendationEvidenceChain,
  };
}
