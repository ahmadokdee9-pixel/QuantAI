/**
 * Phase 12.20 — Ranking Intelligence Preparation Layer.
 * Aggregates Phase 12.x signals into a ranking-readiness profile before Phase 13 ranking.
 * Meta-only, read-only — no ranking execution, sorting, tray, or persistence mutations.
 */

import type { BrandAffinityMeta } from "@/lib/intelligence/brandAffinityEngine";
import type { BuyerIntentVectorMeta } from "@/lib/intelligence/buyerIntentVectorEngine";
import type { DecisionReadinessMeta } from "@/lib/intelligence/decisionReadinessEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { ProductAttributeAffinityMeta } from "@/lib/intelligence/productAttributeAffinityEngine";
import type { RetailerTrustMeta } from "@/lib/intelligence/retailerTrustEngine";
import type { ReviewCredibilityMeta } from "@/lib/intelligence/reviewCredibilityEngine";
import type { ShopperPsychologyMeta } from "@/lib/intelligence/shopperPsychologyEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";
import type { ValueIntelligenceMeta } from "@/lib/intelligence/valueIntelligenceEngine";

export type RankingReadinessLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type RankingPreparationMeta = {
  version: "phase12.20-v1";
  rankingReadinessLevel: RankingReadinessLevel;
  rankingReadinessScore: number;
  qualitySignal: number;
  trustSignal: number;
  valueSignal: number;
  buyerFitSignal: number;
  confidenceSignal: number;
  rankingStrength: string[];
  rankingWeaknesses: string[];
  confidenceTier: string;
  confidence: number;
};

export type RankingPreparationInput = {
  query: string;
  buyerModel: UniversalBuyerModelMeta;
  buyerIntentVector: BuyerIntentVectorMeta;
  shopperPsychology: ShopperPsychologyMeta;
  intentConfidence: IntentConfidenceMeta;
  decisionReadiness: DecisionReadinessMeta;
  brandAffinity: BrandAffinityMeta;
  productAttributeAffinity: ProductAttributeAffinityMeta;
  retailerTrust: RetailerTrustMeta;
  reviewCredibility: ReviewCredibilityMeta;
  valueIntelligence: ValueIntelligenceMeta;
};

const VERSION = "phase12.20-v1" as const;

const STRONG_READINESS_RX =
  /\b(trusted\s+retailer|official\s+store|verified\s+purchase|best\s+value|high\s+quality|well[\s-]?reviewed)\b/i;
const WEAK_READINESS_RX =
  /\b(unknown\s+seller|fake\s+reviews?|overpriced|weak\s+quality|low\s+trust|sketchy\s+deal)\b/i;
const CONFLICT_RX =
  /\b(conflicting\s+signals|mixed\s+signals|contradictory|inconsistent\s+trust|signal\s+conflict)\b/i;
const BUYER_FIT_RX =
  /\b(perfect\s+fit|matches\s+my\s+needs|ideal\s+for\s+me|right\s+for\s+my\s+use|tailored\s+match)\b/i;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function averageAffinity(input: RankingPreparationInput): number {
  const attrs = input.productAttributeAffinity;
  return clamp01(
    (attrs.performanceAffinity +
      attrs.qualityAffinity +
      attrs.designAffinity +
      attrs.durabilityAffinity +
      attrs.premiumAffinity) /
      5
  );
}

function scoreQualitySignal(input: RankingPreparationInput): number {
  let score = 0.2;
  score += input.productAttributeAffinity.qualityAffinity * 0.28;
  score += input.productAttributeAffinity.durabilityAffinity * 0.16;
  score += input.valueIntelligence.priceToQualitySignal * 0.22;
  score += input.valueIntelligence.longTermValueSignal * 0.1;
  if (input.productAttributeAffinity.attributeLevel === "HIGH" ||
    input.productAttributeAffinity.attributeLevel === "VERY_HIGH") {
    score += 0.08;
  }
  if (input.valueIntelligence.riskFlags.includes("weak_quality_for_price")) score -= 0.2;
  return clamp01(score);
}

function scoreTrustSignal(input: RankingPreparationInput): number {
  let score = 0.18;
  score += input.retailerTrust.trustScore * 0.34;
  score += input.reviewCredibility.credibilityScore * 0.28;
  score += input.retailerTrust.reputationSignal * 0.1;
  score += input.retailerTrust.reviewSignal * 0.08;
  if (input.retailerTrust.riskFlags.includes("unknown_seller_risk")) score -= 0.22;
  if (input.reviewCredibility.riskFlags.includes("fake_review_risk")) score -= 0.18;
  return clamp01(score);
}

function scoreValueSignal(input: RankingPreparationInput): number {
  let score = input.valueIntelligence.valueScore * 0.72 + 0.12;
  if (input.valueIntelligence.valueLevel === "HIGH" || input.valueIntelligence.valueLevel === "VERY_HIGH") {
    score += 0.1;
  }
  if (input.valueIntelligence.riskFlags.includes("overpriced_risk")) score -= 0.2;
  if (input.valueIntelligence.riskFlags.includes("short_lifecycle_risk")) score -= 0.1;
  return clamp01(score);
}

function scoreBuyerFitSignal(input: RankingPreparationInput): number {
  let score = 0.16;
  score += averageAffinity(input) * 0.24;
  score += input.brandAffinity.affinityScore * 0.18;
  score += input.decisionReadiness.readinessScore * 0.2;
  if (input.decisionReadiness.readinessStatus === "READY_TO_BUY") score += 0.12;
  if (BUYER_FIT_RX.test(input.query)) score += 0.14;
  if (input.buyerIntentVector.confidence >= 0.55) score += 0.1;
  if (input.decisionReadiness.readinessStatus === "LOW_CONFIDENCE") score -= 0.14;
  return clamp01(score);
}

function scoreConfidenceSignal(input: RankingPreparationInput): number {
  let score = 0.16;
  score += input.intentConfidence.overallConfidence * 0.42;
  score += input.valueIntelligence.confidence * 0.14;
  score += input.productAttributeAffinity.confidence * 0.1;
  if (input.intentConfidence.confidenceTier === "VERY_HIGH") score += 0.14;
  else if (input.intentConfidence.confidenceTier === "HIGH") score += 0.1;
  else if (input.intentConfidence.confidenceTier === "LOW") score -= 0.12;
  else if (input.intentConfidence.confidenceTier === "UNCERTAIN") score -= 0.18;
  return clamp01(score);
}

function detectConflicts(input: RankingPreparationInput, signals: {
  trustSignal: number;
  valueSignal: number;
  confidenceSignal: number;
}): number {
  let penalty = 0;

  if (signals.valueSignal >= 0.6 && signals.trustSignal <= 0.35) penalty += 0.18;
  if (input.reviewCredibility.credibilityScore <= 0.35 && signals.valueSignal >= 0.55) penalty += 0.14;
  if (input.valueIntelligence.valueScore >= 0.6 && input.retailerTrust.trustScore <= 0.35) penalty += 0.12;
  if (CONFLICT_RX.test(input.query)) penalty += 0.2;
  if (signals.confidenceSignal <= 0.35 && signals.valueSignal >= 0.55) penalty += 0.1;
  if (
    input.reviewCredibility.riskFlags.length > 0 &&
    input.retailerTrust.riskFlags.length > 0
  ) {
    penalty += 0.08;
  }

  return clamp01(penalty);
}

function scoreBaseReadiness(
  signals: {
    qualitySignal: number;
    trustSignal: number;
    valueSignal: number;
    buyerFitSignal: number;
    confidenceSignal: number;
  },
  conflictPenalty: number
): number {
  let score = 0.22;
  score += signals.qualitySignal * 0.18;
  score += signals.trustSignal * 0.2;
  score += signals.valueSignal * 0.2;
  score += signals.buyerFitSignal * 0.14;
  score += signals.confidenceSignal * 0.16;
  score -= conflictPenalty * 0.32;
  return clamp01(score);
}

function applyReadinessOverrides(score: number, input: RankingPreparationInput, conflictPenalty: number): number {
  let out = score;

  if (
    STRONG_READINESS_RX.test(input.query) &&
    input.retailerTrust.trustScore >= 0.65 &&
    input.valueIntelligence.valueScore >= 0.6 &&
    !CONFLICT_RX.test(input.query)
  ) {
    out = Math.max(out, 0.78);
  }

  if (
    input.reviewCredibility.credibilityScore >= 0.7 &&
    input.retailerTrust.trustScore >= 0.7 &&
    input.valueIntelligence.valueScore >= 0.65
  ) {
    out = Math.max(Math.min(out, 0.92), 0.72);
  }

  if (WEAK_READINESS_RX.test(input.query) || conflictPenalty >= 0.25) {
    out = Math.min(out, 0.38);
  }

  if (CONFLICT_RX.test(input.query)) {
    out = Math.min(out, 0.32);
  }

  if (input.intentConfidence.confidenceTier === "UNCERTAIN") {
    out = Math.min(out, 0.42);
  }

  if (
    input.valueIntelligence.valueScore <= 0.35 &&
    input.retailerTrust.trustScore <= 0.35
  ) {
    out = Math.min(out, 0.22);
  }

  return clamp01(out);
}

function readinessLevelFor(score: number): RankingReadinessLevel {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildRankingStrength(signals: {
  qualitySignal: number;
  trustSignal: number;
  valueSignal: number;
  buyerFitSignal: number;
  confidenceSignal: number;
}): string[] {
  const strengths: string[] = [];
  if (signals.qualitySignal >= 0.55) strengths.push("strong_quality_signal");
  if (signals.trustSignal >= 0.6) strengths.push("high_trust_signal");
  if (signals.valueSignal >= 0.6) strengths.push("strong_value_intelligence");
  if (signals.buyerFitSignal >= 0.55) strengths.push("strong_buyer_fit");
  if (signals.confidenceSignal >= 0.6) strengths.push("high_confidence_signal");
  if (signals.trustSignal >= 0.65 && signals.valueSignal >= 0.6) {
    strengths.push("aligned_trust_value_stack");
  }
  return strengths;
}

function buildRankingWeaknesses(
  input: RankingPreparationInput,
  signals: {
    qualitySignal: number;
    trustSignal: number;
    valueSignal: number;
    buyerFitSignal: number;
    confidenceSignal: number;
  },
  conflictPenalty: number
): string[] {
  const weaknesses: string[] = [];
  if (signals.trustSignal <= 0.4) weaknesses.push("weak_trust_signal");
  if (input.reviewCredibility.credibilityScore <= 0.4) weaknesses.push("low_review_credibility");
  if (signals.valueSignal <= 0.4) weaknesses.push("weak_value_score");
  if (signals.confidenceSignal <= 0.4) weaknesses.push("low_confidence_tier");
  if (signals.buyerFitSignal <= 0.4) weaknesses.push("weak_buyer_fit");
  if (conflictPenalty >= 0.15) weaknesses.push("conflicting_signals");
  if (input.retailerTrust.riskFlags.includes("unknown_seller_risk")) {
    weaknesses.push("unknown_seller_trust_gap");
  }
  if (input.valueIntelligence.riskFlags.length > 0 && signals.valueSignal >= 0.5) {
    weaknesses.push("value_risk_tension");
  }
  return weaknesses;
}

/** Build a ranking-readiness profile from Phase 12.x pre-search intelligence. */
export function buildRankingPreparation(input: RankingPreparationInput): RankingPreparationMeta {
  const signals = {
    qualitySignal: scoreQualitySignal(input),
    trustSignal: scoreTrustSignal(input),
    valueSignal: scoreValueSignal(input),
    buyerFitSignal: scoreBuyerFitSignal(input),
    confidenceSignal: scoreConfidenceSignal(input),
  };

  const conflictPenalty = detectConflicts(input, signals);
  const raw = scoreBaseReadiness(signals, conflictPenalty);
  const rankingReadinessScore = round2(applyReadinessOverrides(raw, input, conflictPenalty));

  return {
    version: VERSION,
    rankingReadinessLevel: readinessLevelFor(rankingReadinessScore),
    rankingReadinessScore,
    qualitySignal: round2(signals.qualitySignal),
    trustSignal: round2(signals.trustSignal),
    valueSignal: round2(signals.valueSignal),
    buyerFitSignal: round2(signals.buyerFitSignal),
    confidenceSignal: round2(signals.confidenceSignal),
    rankingStrength: buildRankingStrength(signals),
    rankingWeaknesses: buildRankingWeaknesses(input, signals, conflictPenalty),
    confidenceTier: input.valueIntelligence.confidenceTier,
    confidence: input.valueIntelligence.confidence,
  };
}
