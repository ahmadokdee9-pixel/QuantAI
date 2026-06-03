/**
 * Phase 12.17 — Review Credibility Intelligence Engine.
 * Estimates review trustworthiness and manipulation signals from Phase 12.x pre-search context.
 * Meta-only, read-only — no persistence, tray, ranking, or review DB mutations.
 */

import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { ProductAttributeAffinityMeta } from "@/lib/intelligence/productAttributeAffinityEngine";
import type { RetailerTrustMeta } from "@/lib/intelligence/retailerTrustEngine";
import type { ShopperPsychologyMeta } from "@/lib/intelligence/shopperPsychologyEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";

export type ReviewCredibilityLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type ReviewCredibilityMeta = {
  version: "phase12.17-v1";
  credibilityLevel: ReviewCredibilityLevel;
  credibilityScore: number;
  ratingConsistencySignal: number;
  reviewVolumeSignal: number;
  sentimentConsistencySignal: number;
  suspiciousPatternSignal: number;
  verificationSignal: number;
  riskFlags: string[];
  confidenceTier: string;
  confidence: number;
};

export type ReviewCredibilityInput = {
  query: string;
  buyerModel: UniversalBuyerModelMeta;
  shopperPsychology: ShopperPsychologyMeta;
  contextIntelligence: ContextIntelligenceMeta;
  intentConfidence: IntentConfidenceMeta;
  productAttributeAffinity: ProductAttributeAffinityMeta;
  retailerTrust: RetailerTrustMeta;
};

const VERSION = "phase12.17-v1" as const;

const VERIFIED_PURCHASE_RX =
  /\b(verified\s+purchase|verified\s+buyer|confirmed\s+purchase|amazon\s+verified|vine\s+voice)\b/i;
const BALANCED_REVIEW_RX =
  /\b(balanced\s+reviews?|mixed\s+reviews?|honest\s+reviews?|detailed\s+reviews?|realistic\s+reviews?)\b/i;
const CONSISTENT_RATING_RX =
  /\b(consistent\s+ratings?|steady\s+ratings?|reliable\s+ratings?|rating\s+consistency)\b/i;
const REVIEW_VOLUME_RX =
  /\b(thousands?\s+of\s+reviews?|many\s+reviews?|long\s+review\s+history|years?\s+of\s+reviews?|high\s+review\s+count)\b/i;
const TOP_RATED_RX = /\b(top[\s-]?rated|highly[\s-]?rated|well[\s-]?reviewed|4\.5\s+stars?|four\s+star)\b/i;
const FAKE_REVIEW_RX =
  /\b(fake\s+reviews?|review\s+manipulation|bought\s+reviews?|paid\s+reviews?|incentivized\s+reviews?|bot\s+reviews?)\b/i;
const REVIEW_SPIKE_RX = /\b(review\s+spike|sudden\s+spike|suspicious\s+spike|burst\s+of\s+reviews?)\b/i;
const EXTREME_SENTIMENT_RX =
  /\b(all\s+5\s+star|perfect\s+rating\s+only|only\s+five\s+star|extreme\s+ratings?|everyone\s+loves)\b/i;
const REPETITIVE_RX =
  /\b(repetitive\s+reviews?|copy[\s-]?paste\s+reviews?|duplicate\s+reviews?|same\s+wording)\b/i;
const RATING_MISMATCH_RX =
  /\b(rating\s+mismatch|doesn'?t\s+match\s+reviews?|reviews?\s+don'?t\s+match\s+rating)\b/i;
const LOW_DIVERSITY_RX = /\b(low\s+review\s+diversity|same\s+reviewers?|limited\s+review\s+diversity)\b/i;
const TOO_GOOD_RX = /\b(too\s+good\s+to\s+be\s+true|suspiciously\s+perfect|sketchy\s+reviews?)\b/i;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scoreRatingConsistency(input: ReviewCredibilityInput): number {
  let score = 0.18;
  if (CONSISTENT_RATING_RX.test(input.query)) score += 0.44;
  if (BALANCED_REVIEW_RX.test(input.query)) score += 0.28;
  if (TOP_RATED_RX.test(input.query) && !EXTREME_SENTIMENT_RX.test(input.query)) score += 0.12;
  if (input.shopperPsychology.primaryPsychology === "research") score += 0.08;
  if (EXTREME_SENTIMENT_RX.test(input.query)) score -= 0.32;
  if (RATING_MISMATCH_RX.test(input.query)) score -= 0.28;
  return clamp01(score);
}

function scoreReviewVolume(input: ReviewCredibilityInput): number {
  let score = 0.16;
  if (REVIEW_VOLUME_RX.test(input.query)) score += 0.46;
  if (TOP_RATED_RX.test(input.query)) score += 0.14;
  if (input.retailerTrust.reviewSignal >= 0.45) score += 0.12;
  if (input.productAttributeAffinity.qualityAffinity >= 0.55) score += 0.08;
  if (LOW_DIVERSITY_RX.test(input.query)) score -= 0.22;
  return clamp01(score);
}

function scoreSentimentConsistency(input: ReviewCredibilityInput): number {
  let score = 0.16;
  if (BALANCED_REVIEW_RX.test(input.query)) score += 0.38;
  if (/\b(realistic|honest|detailed|helpful)\b/i.test(input.query)) score += 0.22;
  if (input.shopperPsychology.primaryPsychology === "rational") score += 0.1;
  if (EXTREME_SENTIMENT_RX.test(input.query)) score -= 0.34;
  if (TOO_GOOD_RX.test(input.query)) score -= 0.24;
  return clamp01(score);
}

function scoreSuspiciousPattern(input: ReviewCredibilityInput): number {
  let score = 0.1;
  if (FAKE_REVIEW_RX.test(input.query)) score += 0.48;
  if (REVIEW_SPIKE_RX.test(input.query)) score += 0.36;
  if (EXTREME_SENTIMENT_RX.test(input.query)) score += 0.28;
  if (REPETITIVE_RX.test(input.query)) score += 0.32;
  if (RATING_MISMATCH_RX.test(input.query)) score += 0.26;
  if (LOW_DIVERSITY_RX.test(input.query)) score += 0.18;
  if (TOO_GOOD_RX.test(input.query)) score += 0.22;
  if (input.retailerTrust.riskFlags.includes("unknown_seller_risk")) score += 0.12;
  if (VERIFIED_PURCHASE_RX.test(input.query)) score -= 0.18;
  if (BALANCED_REVIEW_RX.test(input.query)) score -= 0.12;
  return clamp01(score);
}

function scoreVerification(input: ReviewCredibilityInput): number {
  let score = 0.14;
  if (VERIFIED_PURCHASE_RX.test(input.query)) score += 0.48;
  if (input.retailerTrust.trustScore >= 0.7) score += 0.16;
  if (input.retailerTrust.retailerAgeSignal >= 0.5) score += 0.12;
  if (input.buyerModel.buyerType === "premium_buyer") score += 0.08;
  if (FAKE_REVIEW_RX.test(input.query)) score -= 0.28;
  return clamp01(score);
}

function scoreBaseCredibility(
  input: ReviewCredibilityInput,
  signals: {
    ratingConsistencySignal: number;
    reviewVolumeSignal: number;
    sentimentConsistencySignal: number;
    suspiciousPatternSignal: number;
    verificationSignal: number;
  }
): number {
  let score = 0.3;

  score += signals.ratingConsistencySignal * 0.16;
  score += signals.reviewVolumeSignal * 0.14;
  score += signals.sentimentConsistencySignal * 0.16;
  score += signals.verificationSignal * 0.18;
  score -= signals.suspiciousPatternSignal * 0.28;

  score += input.retailerTrust.trustScore * 0.12;
  score += input.retailerTrust.reviewSignal * 0.08;
  if (input.intentConfidence.confidenceTier === "VERY_HIGH") score += 0.04;
  if (input.contextIntelligence.purchaseContext === "gift") score += 0.06;

  return clamp01(score);
}

function applyCredibilityOverrides(score: number, input: ReviewCredibilityInput): number {
  let out = score;

  if (VERIFIED_PURCHASE_RX.test(input.query) && BALANCED_REVIEW_RX.test(input.query)) {
    out = Math.max(out, 0.86);
  }

  if (VERIFIED_PURCHASE_RX.test(input.query) && CONSISTENT_RATING_RX.test(input.query)) {
    out = Math.max(Math.min(out, 0.84), 0.68);
  }

  if (REVIEW_VOLUME_RX.test(input.query) && TOP_RATED_RX.test(input.query) && !FAKE_REVIEW_RX.test(input.query)) {
    out = Math.max(Math.min(out, 0.82), 0.62);
  }

  if (
    FAKE_REVIEW_RX.test(input.query) ||
    REVIEW_SPIKE_RX.test(input.query) ||
    (EXTREME_SENTIMENT_RX.test(input.query) && TOO_GOOD_RX.test(input.query))
  ) {
    out = Math.min(out, 0.18);
  }

  if (REPETITIVE_RX.test(input.query) || RATING_MISMATCH_RX.test(input.query)) {
    out = Math.min(out, 0.38);
  }

  if (input.retailerTrust.trustScore <= 0.35 && !VERIFIED_PURCHASE_RX.test(input.query)) {
    out = Math.min(out, 0.42);
  }

  return clamp01(out);
}

function credibilityLevelFor(score: number): ReviewCredibilityLevel {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildRiskFlags(input: ReviewCredibilityInput, suspiciousPatternSignal: number): string[] {
  const flags: string[] = [];

  if (FAKE_REVIEW_RX.test(input.query)) flags.push("fake_review_risk");
  if (REVIEW_SPIKE_RX.test(input.query)) flags.push("review_spike_risk");
  if (EXTREME_SENTIMENT_RX.test(input.query)) flags.push("extreme_sentiment_concentration");
  if (REPETITIVE_RX.test(input.query)) flags.push("repetitive_wording_risk");
  if (RATING_MISMATCH_RX.test(input.query)) flags.push("rating_review_mismatch");
  if (LOW_DIVERSITY_RX.test(input.query)) flags.push("low_review_diversity");
  if (suspiciousPatternSignal >= 0.55) flags.push("suspicious_review_pattern");
  if (input.retailerTrust.riskFlags.length > 0 && suspiciousPatternSignal >= 0.35) {
    flags.push("retailer_trust_review_tension");
  }

  return flags;
}

/** Build a normalized review credibility profile from Phase 12.x signals. */
export function buildReviewCredibility(input: ReviewCredibilityInput): ReviewCredibilityMeta {
  const signals = {
    ratingConsistencySignal: scoreRatingConsistency(input),
    reviewVolumeSignal: scoreReviewVolume(input),
    sentimentConsistencySignal: scoreSentimentConsistency(input),
    suspiciousPatternSignal: scoreSuspiciousPattern(input),
    verificationSignal: scoreVerification(input),
  };

  const raw = scoreBaseCredibility(input, signals);
  const credibilityScore = round2(applyCredibilityOverrides(raw, input));

  return {
    version: VERSION,
    credibilityLevel: credibilityLevelFor(credibilityScore),
    credibilityScore,
    ratingConsistencySignal: round2(signals.ratingConsistencySignal),
    reviewVolumeSignal: round2(signals.reviewVolumeSignal),
    sentimentConsistencySignal: round2(signals.sentimentConsistencySignal),
    suspiciousPatternSignal: round2(signals.suspiciousPatternSignal),
    verificationSignal: round2(signals.verificationSignal),
    riskFlags: buildRiskFlags(input, signals.suspiciousPatternSignal),
    confidenceTier: input.retailerTrust.confidenceTier,
    confidence: input.retailerTrust.confidence,
  };
}
