/**
 * Phase 3A — Truth integration kernel.
 * Reads existing TruthFoundationSnapshot blocks (2C–2K) and produces bounded rank deltas.
 * Does not generate intelligence — consumes snapshots only.
 */

import type { RecommendationStrength } from "@/lib/truth/productReasoningEngine";
import type { RecommendationTier } from "@/lib/truth/recommendationIntelligenceEngine";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type TruthRankLayerId =
  | "2C_productMatch"
  | "2D_productReasoning"
  | "2E_recommendation"
  | "2F_explainableAI"
  | "2G_conversationalIntent"
  | "2H_tastePreference"
  | "2I_userDecision"
  | "2J_purchaseMotivation"
  | "2K_purchaseConstraints";

export type TruthRankLayerContribution = {
  layer: TruthRankLayerId;
  rawScore: number;
  weight: number;
  scoreContribution: number;
  signals: string[];
};

export type TruthRankBundle = {
  version: 1;
  truthRankDelta: number;
  layers: TruthRankLayerContribution[];
};

const TRUTH_RANK_DELTA_CLAMP = 25;

function clampDelta(value: number, maxAbs: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(maxAbs, Math.max(-maxAbs, Math.round(value * 10) / 10));
}

function scoreCenteredNudge(score: number, scale: number, maxAbs: number): number {
  if (!Number.isFinite(score)) return 0;
  return clampDelta((score - 50) * scale, maxAbs);
}

function layerContribution(
  layer: TruthRankLayerId,
  rawScore: number,
  weight: number,
  scoreContribution: number,
  signals: string[]
): TruthRankLayerContribution {
  return {
    layer,
    rawScore: Math.round(rawScore),
    weight,
    scoreContribution: clampDelta(scoreContribution, Math.abs(weight) || 25),
    signals: signals.filter(Boolean).slice(0, 4),
  };
}

const REASONING_STRENGTH_DELTA: Record<RecommendationStrength, number> = {
  STRONG: 4,
  GOOD: 2,
  CAUTION: 0,
  WEAK: -4,
  UNKNOWN: 0,
};

const RECOMMENDATION_TIER_DELTA: Record<RecommendationTier, number> = {
  BEST_MATCH: 8,
  RECOMMENDED: 4,
  CONSIDER: 0,
  NOT_RECOMMENDED: -8,
};

function compute2CProductMatch(foundation: TruthFoundationSnapshot): TruthRankLayerContribution {
  const match = foundation.productMatch;
  const raw = match.overallMatchScore;
  const delta = scoreCenteredNudge(raw, 0.12, 6);
  const signals = [match.strongestMatchReason, match.strongestMismatchReason].filter(Boolean);
  return layerContribution("2C_productMatch", raw, 6, delta, signals);
}

function compute2DProductReasoning(foundation: TruthFoundationSnapshot): TruthRankLayerContribution {
  const reasoning = foundation.productReasoning;
  const strengthDelta = REASONING_STRENGTH_DELTA[reasoning.recommendationStrength] ?? 0;
  const confidenceNudge = scoreCenteredNudge(reasoning.reasoningConfidence, 0.04, 2);
  const delta = clampDelta(strengthDelta + confidenceNudge, 4);
  const signals = [
    reasoning.shortReason,
    reasoning.topPositiveReasons[0] ?? "",
    reasoning.topNegativeReasons[0] ?? "",
  ];
  return layerContribution("2D_productReasoning", reasoning.reasoningConfidence, 4, delta, signals);
}

function compute2ERecommendation(foundation: TruthFoundationSnapshot): TruthRankLayerContribution {
  const rec = foundation.recommendationIntelligence;
  const tierDelta = RECOMMENDATION_TIER_DELTA[rec.recommendationTier] ?? 0;
  const scoreNudge = scoreCenteredNudge(rec.recommendationScore, 0.04, 2);
  const delta = clampDelta(tierDelta + scoreNudge, 8);
  const signals = [
    rec.primaryRecommendationReason,
    rec.primaryWarningReason,
    rec.recommendationSummary,
  ];
  return layerContribution("2E_recommendation", rec.recommendationScore, 8, delta, signals);
}

function compute2FExplainableAI(foundation: TruthFoundationSnapshot): TruthRankLayerContribution {
  const explain = foundation.explainableAI;
  const raw = explain.explainabilityConfidence;
  const delta = scoreCenteredNudge(raw, 0.04, 2);
  const signals = [explain.headline, explain.finalVerdict];
  return layerContribution("2F_explainableAI", raw, 2, delta, signals);
}

function compute2GConversationalIntent(foundation: TruthFoundationSnapshot): TruthRankLayerContribution {
  const conv = foundation.conversationalIntent;
  const raw = conv.conversationalConfidence;
  let delta = scoreCenteredNudge(raw, 0.06, 3);
  if (conv.budgetSensitivity === "HIGH" || conv.qualitySensitivity === "HIGH") {
    delta += 0.5;
  }
  delta = clampDelta(delta, 3);
  const signals = [conv.explicitIntent, conv.shoppingGoal, conv.preferenceSignals[0] ?? ""];
  return layerContribution("2G_conversationalIntent", raw, 3, delta, signals);
}

function compute2HTastePreference(foundation: TruthFoundationSnapshot): TruthRankLayerContribution {
  const taste = foundation.tastePreference;
  const raw =
    (taste.premiumAffinity +
      taste.valueAffinity +
      taste.performancePreference +
      taste.portabilityPreference) /
    4;
  const delta = scoreCenteredNudge(raw, 0.08, 4);
  const signals = taste.tasteSignals.slice(0, 3);
  return layerContribution("2H_tastePreference", raw, 4, delta, signals);
}

function compute2IUserDecision(foundation: TruthFoundationSnapshot): TruthRankLayerContribution {
  const decision = foundation.userDecisionIntelligence;
  const raw = decision.decisionConfidence;
  const delta = scoreCenteredNudge(raw, 0.06, 3);
  const signals = [
    decision.decisionStrategy,
    decision.decisionBehavior,
    decision.decisionEvidenceChain[0] ?? "",
  ];
  return layerContribution("2I_userDecision", raw, 3, delta, signals);
}

function compute2JPurchaseMotivation(foundation: TruthFoundationSnapshot): TruthRankLayerContribution {
  const motivation = foundation.purchaseMotivation;
  const raw = motivation.motivationConfidence;
  const delta = scoreCenteredNudge(raw, 0.06, 3);
  const signals = [
    motivation.motivation,
    motivation.motivationEvidenceChain[0] ?? "",
    motivation.motivationSignals[0] ?? "",
  ];
  return layerContribution("2J_purchaseMotivation", raw, 3, delta, signals);
}

function compute2KPurchaseConstraints(foundation: TruthFoundationSnapshot): TruthRankLayerContribution {
  const constraints = foundation.purchaseConstraints;
  const match = foundation.productMatch;
  const raw = constraints.constraintConfidence;
  let delta = scoreCenteredNudge(raw, 0.08, 4);
  if (constraints.hardRequirements.length > 0 && match.overallMatchScore < 45) {
    delta -= Math.min(4, constraints.hardRequirements.length * 1.5);
  }
  if (match.strongestMismatchReason && match.overallMatchScore < 50) {
    delta -= 2;
  }
  delta = clampDelta(delta, 4);
  const signals = [
    constraints.primaryConstraint,
    ...constraints.hardRequirements.slice(0, 2),
    constraints.constraintEvidenceChain[0] ?? "",
  ];
  return layerContribution("2K_purchaseConstraints", raw, 4, delta, signals);
}

/** Aggregate bounded rank contributions from Truth snapshots 2C–2K. */
export function computeTruthRankContributions(foundation: TruthFoundationSnapshot): TruthRankBundle {
  const layers = [
    compute2CProductMatch(foundation),
    compute2DProductReasoning(foundation),
    compute2ERecommendation(foundation),
    compute2FExplainableAI(foundation),
    compute2GConversationalIntent(foundation),
    compute2HTastePreference(foundation),
    compute2IUserDecision(foundation),
    compute2JPurchaseMotivation(foundation),
    compute2KPurchaseConstraints(foundation),
  ];

  const rawSum = layers.reduce((sum, layer) => sum + layer.scoreContribution, 0);
  const truthRankDelta = clampDelta(rawSum, TRUTH_RANK_DELTA_CLAMP);

  return {
    version: 1,
    truthRankDelta,
    layers,
  };
}
