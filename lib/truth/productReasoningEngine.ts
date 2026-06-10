/**
 * Phase 2D — Product reasoning engine.
 * Converts match, intent, trust, and intelligence evidence into explainable reasoning.
 */

import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type RecommendationStrength = "STRONG" | "GOOD" | "CAUTION" | "WEAK" | "UNKNOWN";

export type ProductReasoningSnapshot = {
  recommendationStrength: RecommendationStrength;
  reasoningConfidence: number;
  topPositiveReasons: string[];
  topNegativeReasons: string[];
  bestFor: string[];
  notIdealFor: string[];
  summaryReason: string;
  shortReason: string;
  explainabilityScore: number;
};

export type ProductReasoningInput = Omit<TruthFoundationSnapshot, "productReasoning" | "recommendationIntelligence" | "explainableAI" | "conversationalIntent" | "tastePreference">;

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

function deriveRecommendationStrength(args: {
  overallMatchScore: number;
  trustScore: number;
  reasoningConfidence: number;
}): RecommendationStrength {
  if (args.overallMatchScore >= 75 && args.trustScore >= 65 && args.reasoningConfidence >= 68) {
    return "STRONG";
  }
  if (args.overallMatchScore >= 58 && args.trustScore >= 52 && args.reasoningConfidence >= 55) {
    return "GOOD";
  }
  if (args.overallMatchScore >= 45 || args.reasoningConfidence >= 48) {
    return "CAUTION";
  }
  if (args.overallMatchScore >= 25) {
    return "WEAK";
  }
  return "UNKNOWN";
}

function buildBestFor(input: ProductReasoningInput): string[] {
  const intent = input.intentEngine.intent;
  const match = input.productMatch;
  const items: string[] = [];

  if (intent.useCase) items.push(`${humanizeUseCase(intent.useCase)} use cases`);
  if (intent.productType) items.push(`${intent.productType} shoppers`);
  if (intent.preferredBrand) items.push(`${intent.preferredBrand} preference`);
  if (intent.qualityLevel === "budget" || input.intentEngine.rewrite.budgetSensitive) {
    items.push("Budget-conscious buyers");
  }
  if (match.useCaseMatchScore >= 70) items.push("Performance aligned with your query");
  if (match.budgetMatchScore >= 70 && intent.budget != null) {
    items.push(`Purchases under ${intent.currency ?? "budget"} ${intent.budget}`);
  }

  return uniqueNonEmpty(items, 4);
}

function buildNotIdealFor(input: ProductReasoningInput): string[] {
  const intent = input.intentEngine.intent;
  const match = input.productMatch;
  const items: string[] = [];

  if (match.budgetMatchScore < 45 && intent.budget != null) {
    items.push(`Strict ${intent.currency ?? "budget"} ${intent.budget} budgets`);
  }
  if (match.brandMatchScore < 45 && intent.preferredBrand) {
    items.push(`Shoppers avoiding non-${intent.preferredBrand} options`);
  }
  for (const brand of intent.excludedBrands) {
    items.push(`Buyers excluding ${brand}`);
  }
  if (input.trustEngine.trustRisks.length >= 2) items.push("Low-trust purchase decisions");
  if (match.overallMatchScore < 45) items.push("Tight intent-fit requirements");
  if (input.commerceReasoning.primaryRisk !== "none") {
    items.push("Risk-sensitive buyers");
  }

  return uniqueNonEmpty(items, 4);
}

function collectPositiveReasons(input: ProductReasoningInput): string[] {
  const match = input.productMatch;
  const positives = [
    match.strongestMatchReason,
    input.commerceReasoning.strongestPositiveSignal,
    ...input.trustEngine.trustSignals.slice(0, 2),
    ...input.evidenceReasoningGraph.supportingEvidence.slice(0, 2),
    ...input.intentRetrieval.retrievalReasons.filter((reason) => reason.startsWith("✓")).slice(0, 2),
  ];

  if (match.intentMatchScore >= 70) positives.push(`Strong ${input.intentEngine.intent.productType ?? "product"} fit`);
  if (match.budgetMatchScore >= 70) positives.push("Budget alignment looks favorable");
  if (input.productIntelligence.overallProductConfidence >= 65) {
    positives.push(`Product intelligence ${input.productIntelligence.intelligenceState.toLowerCase().replace(/_/g, " ")}`);
  }
  if (input.commerceIntelligence.commerceConfidence >= 65) {
    positives.push(`Commerce confidence ${input.commerceIntelligence.commerceConfidence}`);
  }

  return uniqueNonEmpty(positives, 5);
}

function collectNegativeReasons(input: ProductReasoningInput): string[] {
  const match = input.productMatch;
  const negatives = [
    match.strongestMismatchReason !== "No major mismatch detected" ? match.strongestMismatchReason : "",
    input.commerceReasoning.strongestNegativeSignal !== "No major negative signal"
      ? input.commerceReasoning.strongestNegativeSignal
      : "",
    ...input.trustEngine.trustRisks.slice(0, 2),
    ...input.evidenceReasoningGraph.conflictingEvidence.slice(0, 2),
    ...input.intentRetrieval.retrievalReasons.filter((reason) => reason.startsWith("✗")).slice(0, 2),
  ];

  if (input.commerceReasoning.primaryRisk !== "none") {
    negatives.push(`Primary commerce risk: ${input.commerceReasoning.primaryRisk}`);
  }
  if (input.trustEngine.trustState === "TRUST_WEAK" || input.trustEngine.trustState === "TRUST_UNKNOWN") {
    negatives.push(`Trust state ${input.trustEngine.trustState.toLowerCase().replace(/_/g, " ")}`);
  }

  return uniqueNonEmpty(negatives, 5);
}

function buildReasoningEvidenceChain(input: ProductReasoningInput, positives: string[], negatives: string[]): string[] {
  return uniqueNonEmpty(
    [
      `intent:${input.intentEngine.intent.productType ?? "unknown"}:${input.intentEngine.intent.useCase ?? "general"}`,
      `match:${input.productMatch.overallMatchScore}`,
      `trust:${input.trustEngine.trustScore}:${input.trustEngine.trustState}`,
      `product_intel:${input.productIntelligence.overallProductConfidence}`,
      `commerce_intel:${input.commerceIntelligence.commerceConfidence}`,
      `evidence:${input.evidenceReasoningGraph.evidenceStrength}/${input.evidenceReasoningGraph.evidenceCompleteness}`,
      ...input.evidenceReasoningGraph.evidenceChain.slice(0, 3),
      ...positives.slice(0, 3).map((reason) => `positive:${reason}`),
      ...negatives.slice(0, 3).map((reason) => `negative:${reason}`),
    ],
    12
  );
}

function computeReasoningConfidence(input: ProductReasoningInput): number {
  const match = input.productMatch;
  return clampScore(
    match.overallMatchScore * 0.28 +
      input.trustEngine.trustConfidence * 0.2 +
      input.commerceReasoning.reasoningConfidence * 0.18 +
      input.productIntelligence.overallProductConfidence * 0.16 +
      input.commerceIntelligence.commerceConfidence * 0.1 +
      input.evidenceReasoningGraph.evidenceStrength * 0.08
  );
}

function computeExplainabilityScore(input: ProductReasoningInput, positives: string[], negatives: string[]): number {
  const filled = [
    Boolean(input.intentEngine.intent.productType),
    Boolean(input.intentEngine.intent.useCase),
    input.productMatch.overallMatchScore > 0,
    input.trustEngine.trustScore > 0,
    input.productIntelligence.overallProductConfidence > 0,
    input.commerceIntelligence.commerceConfidence > 0,
    input.evidenceReasoningGraph.evidenceChain.length > 0,
    positives.length > 0,
    negatives.length > 0,
    input.commerceReasoning.reasoningConfidence > 0,
  ].filter(Boolean).length;

  return clampScore(Math.round((filled / 10) * 100));
}

function buildSummaryReason(args: {
  strength: RecommendationStrength;
  intent: ProductReasoningInput["intentEngine"]["intent"];
  positives: string[];
  negatives: string[];
  reasoningConfidence: number;
}): string {
  const intentLabel = args.intent.productType ?? "product";
  const useCaseLabel = args.intent.useCase ? ` for ${args.intent.useCase}` : "";
  const lead = args.positives[0] ?? "General intent alignment";
  const risk = args.negatives[0];

  if (args.strength === "STRONG" || args.strength === "GOOD") {
    return `This ${intentLabel}${useCaseLabel} looks well aligned with your search because ${lead.toLowerCase()}. Reasoning confidence is ${args.reasoningConfidence}%.`;
  }
  if (args.strength === "CAUTION") {
    return `This ${intentLabel}${useCaseLabel} is a cautious match: ${lead.toLowerCase()}, but ${(risk ?? "some trust or fit signals remain mixed").toLowerCase()}.`;
  }
  return `This ${intentLabel}${useCaseLabel} has limited alignment with your intent${risk ? ` due to ${risk.toLowerCase()}` : ""}.`;
}

function buildShortReason(strength: RecommendationStrength, positives: string[], negatives: string[]): string {
  if ((strength === "STRONG" || strength === "GOOD") && positives[0]) {
    return positives[0];
  }
  if (negatives[0]) return negatives[0];
  return "Mixed product reasoning signals";
}

export function hasProductReasoningSignal(snapshot: ProductReasoningSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.reasoningConfidence >= 0);
}

export function buildProductReasoningEvidenceChain(input: ProductReasoningInput): string[] {
  const positives = collectPositiveReasons(input);
  const negatives = collectNegativeReasons(input);
  return buildReasoningEvidenceChain(input, positives, negatives);
}

/** Build explainable product reasoning snapshot from fused truth foundation layers. */
export function buildProductReasoningEngine(input: ProductReasoningInput): ProductReasoningSnapshot {
  const topPositiveReasons = collectPositiveReasons(input);
  const topNegativeReasons = collectNegativeReasons(input);
  const reasoningConfidence = computeReasoningConfidence(input);
  const recommendationStrength = deriveRecommendationStrength({
    overallMatchScore: input.productMatch.overallMatchScore,
    trustScore: input.trustEngine.trustScore,
    reasoningConfidence,
  });
  const bestFor = buildBestFor(input);
  const notIdealFor = buildNotIdealFor(input);
  const explainabilityScore = computeExplainabilityScore(input, topPositiveReasons, topNegativeReasons);
  const summaryReason = buildSummaryReason({
    strength: recommendationStrength,
    intent: input.intentEngine.intent,
    positives: topPositiveReasons,
    negatives: topNegativeReasons,
    reasoningConfidence,
  });
  const shortReason = buildShortReason(recommendationStrength, topPositiveReasons, topNegativeReasons);

  return {
    recommendationStrength,
    reasoningConfidence,
    topPositiveReasons,
    topNegativeReasons,
    bestFor,
    notIdealFor,
    summaryReason,
    shortReason,
    explainabilityScore,
  };
}
