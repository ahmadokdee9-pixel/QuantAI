/**
 * Phase 13.1 — Deterministic Ranking Engine.
 * Consumes ONLY Phase 13.0 rankingSignals to produce a final ranking score package.
 * Read-only — no sorting, reranking, tray, UI, or persistence mutations.
 */

import type { RankingSignalsMeta } from "@/lib/ranking/rankingSignalsAggregator";

export type RankingTier = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type RankingEngineMeta = {
  version: "phase13.1-v1";
  rankingScore: number;
  rankingTier: RankingTier;
  trustWeight: number;
  valueWeight: number;
  buyerFitWeight: number;
  confidenceWeight: number;
  rankingReasons: string[];
  rankingWarnings: string[];
};

const VERSION = "phase13.1-v1" as const;

const PRIMARY_SIGNAL_WEIGHT = 0.5;
const TRUST_BLEND = 0.18;
const VALUE_BLEND = 0.16;
const BUYER_FIT_BLEND = 0.1;
const CONFIDENCE_BLEND = 0.06;

const TRUST_STRENGTHS = [
  "strong_trust_signal",
  "trusted_retailer",
  "credible_reviews",
  "aligned_ranking_signal_stack",
];
const TRUST_WEAKNESSES = ["weak_trust_signal", "low_retailer_trust", "low_review_credibility"];
const TRUST_CONFLICTS = [
  "value_intelligence_vs_trust",
  "preparation_value_trust_gap",
  "trust_discount_tension",
];

const VALUE_STRENGTHS = [
  "strong_value_signal",
  "strong_value_intelligence",
  "genuine_discount_signal",
  "aligned_ranking_signal_stack",
];
const VALUE_WEAKNESSES = ["weak_value_signal", "weak_value_intelligence", "fake_discount_risk", "value_intelligence_risk"];
const VALUE_CONFLICTS = ["discount_credibility_conflict", "review_value_mismatch"];

const BUYER_FIT_STRENGTHS = ["strong_buyer_fit_signal", "strong_brand_affinity", "strong_attribute_affinity"];
const BUYER_FIT_WEAKNESSES = ["weak_buyer_fit", "weak_brand_affinity", "weak_attribute_affinity"];

const CONFIDENCE_STRENGTHS = ["strong_confidence_signal", "aligned_ranking_signal_stack"];
const CONFIDENCE_WEAKNESSES = ["weak_confidence_signal", "low_confidence_tier"];

const STRENGTH_REASONS: Record<string, string> = {
  strong_trust_signal: "Trust signals are strong across retailer and review posture.",
  trusted_retailer: "Retailer trust supports confident ranking.",
  credible_reviews: "Review credibility supports ranking confidence.",
  strong_value_signal: "Value signals indicate meaningful value-for-money.",
  strong_value_intelligence: "Value intelligence supports ranking uplift.",
  genuine_discount_signal: "Discount posture appears genuine rather than inflated.",
  strong_buyer_fit_signal: "Buyer-fit signals align with the query intent.",
  strong_brand_affinity: "Brand affinity supports personalized ranking.",
  strong_attribute_affinity: "Product attribute affinity is well defined.",
  strong_confidence_signal: "Intent confidence is strong enough for ranking.",
  strong_quality_signal: "Quality signals reinforce ranking readiness.",
  aligned_ranking_signal_stack: "Trust, value, and confidence signals are aligned.",
};

const CONFLICT_WARNINGS: Record<string, string> = {
  value_intelligence_vs_trust: "Value intelligence conflicts with retailer trust.",
  discount_credibility_conflict: "Discount posture conflicts with credibility signals.",
  review_value_mismatch: "Review credibility does not match value posture.",
  preparation_signal_conflict: "Pre-search intelligence reported conflicting signals.",
  trust_discount_tension: "Retailer trust tension detected alongside discount risk.",
  preparation_value_trust_gap: "Value and trust signals diverge materially.",
  premium_brand_urgency_tension: "Premium brand posture conflicts with urgency discounting.",
};

const WEAKNESS_WARNINGS: Record<string, string> = {
  weak_trust_signal: "Trust signals are too weak for aggressive ranking.",
  low_review_credibility: "Review credibility is low.",
  low_retailer_trust: "Retailer trust is low.",
  weak_value_signal: "Value signals are weak.",
  weak_value_intelligence: "Value intelligence score is weak.",
  fake_discount_risk: "Fake discount risk detected.",
  value_intelligence_risk: "Value intelligence risk flags are present.",
  weak_buyer_fit: "Buyer-fit alignment is weak.",
  weak_brand_affinity: "Brand affinity is weak.",
  weak_attribute_affinity: "Product attribute affinity is weak.",
  weak_confidence_signal: "Confidence signal is weak.",
  low_confidence_tier: "Confidence tier is too low for strong ranking.",
  conflicting_signals: "Upstream intelligence reported conflicting signals.",
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

function includesAny(list: string[], tags: string[]): boolean {
  return tags.some((tag) => list.includes(tag));
}

function computeBlendWeights(signals: RankingSignalsMeta): {
  trustWeight: number;
  valueWeight: number;
  buyerFitWeight: number;
  confidenceWeight: number;
} {
  const weights = signals.signalWeights;
  const trustRaw =
    weights.trust + weights.reviewCredibility + weights.retailerTrust;
  const valueRaw =
    weights.value + weights.valueIntelligence + weights.realDiscount + weights.quality * 0.5;
  const buyerFitRaw =
    weights.buyerFit + weights.brandAffinity + weights.productAttributeAffinity;
  const confidenceRaw = weights.confidence;
  const total = trustRaw + valueRaw + buyerFitRaw + confidenceRaw;

  if (total <= 0) {
    return {
      trustWeight: 0.3,
      valueWeight: 0.3,
      buyerFitWeight: 0.2,
      confidenceWeight: 0.2,
    };
  }

  return {
    trustWeight: round4(trustRaw / total),
    valueWeight: round4(valueRaw / total),
    buyerFitWeight: round4(buyerFitRaw / total),
    confidenceWeight: round4(confidenceRaw / total),
  };
}

function dimensionScore(
  base: number,
  signals: RankingSignalsMeta,
  strengths: string[],
  weaknesses: string[],
  conflicts: string[] = []
): number {
  let score = base;
  if (includesAny(signals.signalStrengths, strengths)) score += 0.08;
  if (includesAny(signals.signalWeaknesses, weaknesses)) score -= 0.1;
  if (includesAny(signals.signalConflicts, conflicts)) score -= 0.08;
  return clamp01(score);
}

function computeRankingScore(
  signals: RankingSignalsMeta,
  blendWeights: {
    trustWeight: number;
    valueWeight: number;
    buyerFitWeight: number;
    confidenceWeight: number;
  }
): number {
  const primary = signals.rankingSignalScore;
  const trustScore = dimensionScore(primary, signals, TRUST_STRENGTHS, TRUST_WEAKNESSES, TRUST_CONFLICTS);
  const valueScore = dimensionScore(primary, signals, VALUE_STRENGTHS, VALUE_WEAKNESSES, VALUE_CONFLICTS);
  const buyerFitScore = dimensionScore(primary, signals, BUYER_FIT_STRENGTHS, BUYER_FIT_WEAKNESSES);
  const confidenceScore = dimensionScore(primary, signals, CONFIDENCE_STRENGTHS, CONFIDENCE_WEAKNESSES);

  let score =
    primary * PRIMARY_SIGNAL_WEIGHT +
    trustScore * blendWeights.trustWeight * TRUST_BLEND +
    valueScore * blendWeights.valueWeight * VALUE_BLEND +
    buyerFitScore * blendWeights.buyerFitWeight * BUYER_FIT_BLEND +
    confidenceScore * blendWeights.confidenceWeight * CONFIDENCE_BLEND;

  score -= Math.min(signals.signalConflicts.length * 0.04, 0.16);

  return clamp01(score);
}

function applyRankingOverrides(score: number, signals: RankingSignalsMeta): number {
  let out = score;

  if (signals.signalStrengths.includes("aligned_ranking_signal_stack")) {
    out = Math.max(out, 0.72);
  }

  if (
    signals.rankingSignalScore >= 0.65 &&
    includesAny(signals.signalStrengths, TRUST_STRENGTHS) &&
    includesAny(signals.signalStrengths, VALUE_STRENGTHS)
  ) {
    out = Math.max(Math.min(out, 0.9), 0.68);
  }

  if (
    signals.signalConflicts.includes("preparation_signal_conflict") ||
    signals.signalConflicts.length >= 3
  ) {
    out = Math.min(out, 0.32);
  }

  if (signals.rankingSignalScore <= 0.35) {
    out = Math.min(out, 0.38);
  }

  if (includesAny(signals.signalWeaknesses, TRUST_WEAKNESSES) && signals.rankingSignalScore <= 0.45) {
    out = Math.min(out, 0.35);
  }

  if (signals.signalStrengths.includes("strong_buyer_fit_signal") && signals.rankingSignalScore >= 0.45) {
    out = Math.max(out, 0.48);
  }

  return clamp01(out);
}

function rankingTierFor(score: number): RankingTier {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildRankingReasons(signals: RankingSignalsMeta): string[] {
  const reasons: string[] = [];
  for (const strength of signals.signalStrengths) {
    const reason = STRENGTH_REASONS[strength];
    if (reason && !reasons.includes(reason)) reasons.push(reason);
  }
  if (signals.rankingSignalScore >= 0.65 && reasons.length === 0) {
    reasons.push("Composite ranking signal score is strong.");
  }
  return reasons;
}

function buildRankingWarnings(signals: RankingSignalsMeta): string[] {
  const warnings: string[] = [];
  for (const conflict of signals.signalConflicts) {
    const warning = CONFLICT_WARNINGS[conflict];
    if (warning && !warnings.includes(warning)) warnings.push(warning);
  }
  for (const weakness of signals.signalWeaknesses) {
    const warning = WEAKNESS_WARNINGS[weakness];
    if (warning && !warnings.includes(warning)) warnings.push(warning);
  }
  return warnings;
}

/** Build deterministic ranking output from Phase 13.0 ranking signals only. */
export function buildDeterministicRanking(rankingSignals: RankingSignalsMeta): RankingEngineMeta {
  const blendWeights = computeBlendWeights(rankingSignals);
  const rawScore = computeRankingScore(rankingSignals, blendWeights);
  const rankingScore = round2(applyRankingOverrides(rawScore, rankingSignals));

  return {
    version: VERSION,
    rankingScore,
    rankingTier: rankingTierFor(rankingScore),
    trustWeight: blendWeights.trustWeight,
    valueWeight: blendWeights.valueWeight,
    buyerFitWeight: blendWeights.buyerFitWeight,
    confidenceWeight: blendWeights.confidenceWeight,
    rankingReasons: buildRankingReasons(rankingSignals),
    rankingWarnings: buildRankingWarnings(rankingSignals),
  };
}
