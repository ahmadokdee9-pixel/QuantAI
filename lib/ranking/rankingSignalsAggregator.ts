/**
 * Phase 13.0 — Ranking Signals Aggregator.
 * Consumes the complete Phase 12 intelligence stack into a final ranking signal package.
 * Read-only — no sorting, reranking, tray, or recommendation mutations.
 */

import type { BrandAffinityMeta } from "@/lib/intelligence/brandAffinityEngine";
import type { ProductAttributeAffinityMeta } from "@/lib/intelligence/productAttributeAffinityEngine";
import type { RankingPreparationMeta } from "@/lib/intelligence/rankingPreparationEngine";
import type { RealDiscountMeta } from "@/lib/intelligence/realDiscountEngine";
import type { RetailerTrustMeta } from "@/lib/intelligence/retailerTrustEngine";
import type { ReviewCredibilityMeta } from "@/lib/intelligence/reviewCredibilityEngine";
import type { ValueIntelligenceMeta } from "@/lib/intelligence/valueIntelligenceEngine";

export type RankingSignalWeights = {
  buyerFit: number;
  trust: number;
  value: number;
  quality: number;
  confidence: number;
  brandAffinity: number;
  productAttributeAffinity: number;
  reviewCredibility: number;
  retailerTrust: number;
  realDiscount: number;
  valueIntelligence: number;
};

export type RankingSignalsMeta = {
  version: "phase13.0-v1";
  rankingSignalScore: number;
  signalWeights: RankingSignalWeights;
  signalConflicts: string[];
  signalStrengths: string[];
  signalWeaknesses: string[];
};

export type RankingSignalsInput = {
  rankingPreparation: RankingPreparationMeta;
  brandAffinity: BrandAffinityMeta;
  productAttributeAffinity: ProductAttributeAffinityMeta;
  reviewCredibility: ReviewCredibilityMeta;
  retailerTrust: RetailerTrustMeta;
  realDiscount: RealDiscountMeta;
  valueIntelligence: ValueIntelligenceMeta;
};

const VERSION = "phase13.0-v1" as const;

const BASE_WEIGHTS: RankingSignalWeights = {
  buyerFit: 0.12,
  trust: 0.14,
  value: 0.14,
  quality: 0.12,
  confidence: 0.1,
  brandAffinity: 0.08,
  productAttributeAffinity: 0.1,
  reviewCredibility: 0.08,
  retailerTrust: 0.06,
  realDiscount: 0.04,
  valueIntelligence: 0.02,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function productAttributeScore(attrs: ProductAttributeAffinityMeta): number {
  return clamp01(
    (attrs.performanceAffinity +
      attrs.qualityAffinity +
      attrs.designAffinity +
      attrs.simplicityAffinity +
      attrs.premiumAffinity +
      attrs.durabilityAffinity +
      attrs.portabilityAffinity +
      attrs.innovationAffinity) /
      8
  );
}

function normalizeWeights(raw: RankingSignalWeights): RankingSignalWeights {
  const total = Object.values(raw).reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return BASE_WEIGHTS;

  return {
    buyerFit: round4(raw.buyerFit / total),
    trust: round4(raw.trust / total),
    value: round4(raw.value / total),
    quality: round4(raw.quality / total),
    confidence: round4(raw.confidence / total),
    brandAffinity: round4(raw.brandAffinity / total),
    productAttributeAffinity: round4(raw.productAttributeAffinity / total),
    reviewCredibility: round4(raw.reviewCredibility / total),
    retailerTrust: round4(raw.retailerTrust / total),
    realDiscount: round4(raw.realDiscount / total),
    valueIntelligence: round4(raw.valueIntelligence / total),
  };
}

function computeSignalWeights(input: RankingSignalsInput): RankingSignalWeights {
  const weights = { ...BASE_WEIGHTS };
  const prep = input.rankingPreparation;

  if (prep.trustSignal >= 0.6) weights.trust += 0.02;
  if (prep.valueSignal >= 0.6) weights.value += 0.02;
  if (input.brandAffinity.affinityScore >= 0.6) weights.brandAffinity += 0.02;
  if (input.realDiscount.fakeDiscountRisk >= 0.5) {
    weights.realDiscount += 0.03;
    weights.value -= 0.02;
  }
  if (input.reviewCredibility.credibilityScore <= 0.35) weights.reviewCredibility += 0.03;
  if (prep.buyerFitSignal >= 0.55) weights.buyerFit += 0.02;

  return normalizeWeights(weights);
}

function extractSignalScores(input: RankingSignalsInput): RankingSignalWeights {
  return {
    buyerFit: clamp01(input.rankingPreparation.buyerFitSignal),
    trust: clamp01(input.rankingPreparation.trustSignal),
    value: clamp01(input.rankingPreparation.valueSignal),
    quality: clamp01(input.rankingPreparation.qualitySignal),
    confidence: clamp01(input.rankingPreparation.confidenceSignal),
    brandAffinity: clamp01(input.brandAffinity.affinityScore),
    productAttributeAffinity: productAttributeScore(input.productAttributeAffinity),
    reviewCredibility: clamp01(input.reviewCredibility.credibilityScore),
    retailerTrust: clamp01(input.retailerTrust.trustScore),
    realDiscount: clamp01(input.realDiscount.discountScore),
    valueIntelligence: clamp01(input.valueIntelligence.valueScore),
  };
}

function detectSignalConflicts(input: RankingSignalsInput): string[] {
  const conflicts: string[] = [];
  const prep = input.rankingPreparation;

  if (input.valueIntelligence.valueScore >= 0.6 && input.retailerTrust.trustScore <= 0.35) {
    conflicts.push("value_intelligence_vs_trust");
  }
  if (input.realDiscount.fakeDiscountRisk >= 0.5 && input.realDiscount.discountScore >= 0.5) {
    conflicts.push("discount_credibility_conflict");
  }
  if (input.reviewCredibility.credibilityScore <= 0.35 && input.valueIntelligence.valueScore >= 0.55) {
    conflicts.push("review_value_mismatch");
  }
  if (prep.rankingWeaknesses.includes("conflicting_signals")) {
    conflicts.push("preparation_signal_conflict");
  }
  if (
    input.retailerTrust.riskFlags.length > 0 &&
    input.realDiscount.riskFlags.includes("fake_discount_risk")
  ) {
    conflicts.push("trust_discount_tension");
  }
  if (prep.valueSignal >= 0.55 && prep.trustSignal <= 0.4) {
    conflicts.push("preparation_value_trust_gap");
  }
  if (
    input.brandAffinity.premiumBrandBias >= 0.6 &&
    input.realDiscount.urgencyDiscountSignal >= 0.5
  ) {
    conflicts.push("premium_brand_urgency_tension");
  }

  return conflicts;
}

function buildSignalStrengths(
  input: RankingSignalsInput,
  scores: RankingSignalWeights
): string[] {
  const strengths = new Set<string>(input.rankingPreparation.rankingStrength);

  if (scores.buyerFit >= 0.55) strengths.add("strong_buyer_fit_signal");
  if (scores.trust >= 0.6) strengths.add("strong_trust_signal");
  if (scores.value >= 0.6) strengths.add("strong_value_signal");
  if (scores.quality >= 0.55) strengths.add("strong_quality_signal");
  if (scores.confidence >= 0.6) strengths.add("strong_confidence_signal");
  if (scores.brandAffinity >= 0.6) strengths.add("strong_brand_affinity");
  if (scores.productAttributeAffinity >= 0.55) strengths.add("strong_attribute_affinity");
  if (scores.reviewCredibility >= 0.65) strengths.add("credible_reviews");
  if (scores.retailerTrust >= 0.65) strengths.add("trusted_retailer");
  if (scores.realDiscount >= 0.6 && input.realDiscount.fakeDiscountRisk <= 0.35) {
    strengths.add("genuine_discount_signal");
  }
  if (scores.valueIntelligence >= 0.65) strengths.add("strong_value_intelligence");

  if (scores.trust >= 0.6 && scores.value >= 0.6 && scores.reviewCredibility >= 0.6) {
    strengths.add("aligned_ranking_signal_stack");
  }

  return [...strengths];
}

function buildSignalWeaknesses(
  input: RankingSignalsInput,
  scores: RankingSignalWeights
): string[] {
  const weaknesses = new Set<string>(input.rankingPreparation.rankingWeaknesses);

  if (scores.trust <= 0.4) weaknesses.add("weak_trust_signal");
  if (scores.value <= 0.4) weaknesses.add("weak_value_signal");
  if (scores.quality <= 0.4) weaknesses.add("weak_quality_signal");
  if (scores.confidence <= 0.4) weaknesses.add("weak_confidence_signal");
  if (scores.brandAffinity <= 0.35) weaknesses.add("weak_brand_affinity");
  if (scores.productAttributeAffinity <= 0.35) weaknesses.add("weak_attribute_affinity");
  if (scores.reviewCredibility <= 0.4) weaknesses.add("low_review_credibility");
  if (scores.retailerTrust <= 0.35) weaknesses.add("low_retailer_trust");
  if (input.realDiscount.fakeDiscountRisk >= 0.5) weaknesses.add("fake_discount_risk");
  if (scores.valueIntelligence <= 0.35) weaknesses.add("weak_value_intelligence");
  if (input.valueIntelligence.riskFlags.length > 0) weaknesses.add("value_intelligence_risk");

  return [...weaknesses];
}

function computeRankingSignalScore(
  scores: RankingSignalWeights,
  weights: RankingSignalWeights,
  readinessScore: number,
  conflictCount: number
): number {
  let score = 0;
  for (const key of Object.keys(weights) as (keyof RankingSignalWeights)[]) {
    score += scores[key] * weights[key];
  }
  score += readinessScore * 0.08;
  score -= conflictCount * 0.04;
  return clamp01(score);
}

function applyScoreOverrides(score: number, input: RankingSignalsInput, conflicts: string[]): number {
  let out = score;
  const prep = input.rankingPreparation;

  if (
    prep.rankingReadinessLevel === "HIGH" ||
    prep.rankingReadinessLevel === "VERY_HIGH"
  ) {
    out = Math.max(out, 0.62);
  }

  if (
    prep.rankingReadinessLevel === "VERY_LOW" ||
    (prep.rankingReadinessLevel === "LOW" && conflicts.length >= 2)
  ) {
    out = Math.min(out, 0.38);
  }

  if (conflicts.includes("preparation_signal_conflict")) {
    out = Math.min(out, 0.35);
  }

  if (
    input.reviewCredibility.credibilityScore >= 0.7 &&
    input.retailerTrust.trustScore >= 0.7 &&
    input.valueIntelligence.valueScore >= 0.65
  ) {
    out = Math.max(Math.min(out, 0.92), 0.68);
  }

  return clamp01(out);
}

/** Aggregate Phase 12 intelligence into a Phase 13 ranking signal package. */
export function aggregateRankingSignals(input: RankingSignalsInput): RankingSignalsMeta {
  const signalWeights = computeSignalWeights(input);
  const scores = extractSignalScores(input);
  const signalConflicts = detectSignalConflicts(input);
  const rawScore = computeRankingSignalScore(
    scores,
    signalWeights,
    input.rankingPreparation.rankingReadinessScore,
    signalConflicts.length
  );
  const rankingSignalScore = round2(applyScoreOverrides(rawScore, input, signalConflicts));

  return {
    version: VERSION,
    rankingSignalScore,
    signalWeights,
    signalConflicts,
    signalStrengths: buildSignalStrengths(input, scores),
    signalWeaknesses: buildSignalWeaknesses(input, scores),
  };
}
