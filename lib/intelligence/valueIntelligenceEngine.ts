/**
 * Phase 12.19 — Value Intelligence Engine.
 * Determines actual value-for-money quality independent of discount percentage.
 * Meta-only, read-only — no persistence, tray, ranking, or retailer DB mutations.
 */

import type { DealSensitivityMeta } from "@/lib/intelligence/dealSensitivityEngine";
import type { ProductAttributeAffinityMeta } from "@/lib/intelligence/productAttributeAffinityEngine";
import type { RealDiscountMeta } from "@/lib/intelligence/realDiscountEngine";
import type { RetailerTrustMeta } from "@/lib/intelligence/retailerTrustEngine";
import type { ReviewCredibilityMeta } from "@/lib/intelligence/reviewCredibilityEngine";
import type { ShopperPsychologyMeta } from "@/lib/intelligence/shopperPsychologyEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";

export type ValueIntelligenceLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type ValueIntelligenceMeta = {
  version: "phase12.19-v1";
  valueLevel: ValueIntelligenceLevel;
  valueScore: number;
  priceToQualitySignal: number;
  priceToPerformanceSignal: number;
  longTermValueSignal: number;
  ownershipCostSignal: number;
  replacementValueSignal: number;
  riskFlags: string[];
  confidenceTier: string;
  confidence: number;
};

export type ValueIntelligenceInput = {
  query: string;
  buyerModel: UniversalBuyerModelMeta;
  shopperPsychology: ShopperPsychologyMeta;
  dealSensitivity: DealSensitivityMeta;
  productAttributeAffinity: ProductAttributeAffinityMeta;
  retailerTrust: RetailerTrustMeta;
  reviewCredibility: ReviewCredibilityMeta;
  realDiscount: RealDiscountMeta;
};

const VERSION = "phase12.19-v1" as const;

const QUALITY_VALUE_RX =
  /\b(best\s+value\s+for\s+(the\s+)?money|great\s+quality\s+for\s+(the\s+)?price|strong\s+quality\s+relative\s+to\s+price|quality\s+for\s+the\s+price|worth\s+every\s+penny)\b/i;
const PERFORMANCE_VALUE_RX =
  /\b(performance\s+for\s+(the\s+)?price|high\s+performance\s+low\s+price|strong\s+performance\s+relative\s+to\s+price|power\s+for\s+the\s+money|specs\s+for\s+the\s+price)\b/i;
const LONG_TERM_RX =
  /\b(long[\s-]?lasting|built\s+to\s+last|long\s+(useful\s+)?lifespan|years?\s+of\s+use|long[\s-]?term\s+value|lasts\s+years?)\b/i;
const LOW_OWNERSHIP_RX =
  /\b(low\s+(ownership|maintenance|running)\s+cost|cheap\s+to\s+run|low\s+maintenance|energy\s+efficient|inexpensive\s+upkeep)\b/i;
const REPLACEMENT_RESISTANT_RX =
  /\b(buy\s+it\s+for\s+life|bifl|replacement[\s-]?resistant|won'?t\s+need\s+replacing|investment\s+purchase|keep\s+for\s+years?)\b/i;
const OVERPRICED_RX =
  /\b(overpriced|overpriced\s+for\s+what\s+you\s+get|not\s+worth\s+the\s+money|too\s+expensive\s+for\s+quality|price\s+too\s+high)\b/i;
const WEAK_QUALITY_RX =
  /\b(weak\s+quality\s+for\s+(the\s+)?price|cheap\s+quality|flimsy\s+build|poor\s+build\s+quality|low\s+quality\s+materials?)\b/i;
const SHORT_LIFECYCLE_RX =
  /\b(short\s+lifecycle|disposable\s+product|planned\s+obsolescence|breaks\s+quickly|won'?t\s+last|short[\s-]?lived)\b/i;
const HIGH_OWNERSHIP_RX =
  /\b(expensive\s+maintenance|high\s+running\s+cost|costly\s+repairs|high\s+ownership\s+cost|costly\s+upkeep)\b/i;
const POOR_DURABILITY_RX =
  /\b(poor\s+durability|falls\s+apart|low\s+durability|fragile\s+build|not\s+durable)\b/i;
const PREMIUM_VALUE_RX = /\b(premium\s+quality|flagship|professional\s+grade|pro\s+grade)\b/i;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scorePriceToQuality(input: ValueIntelligenceInput): number {
  let score = 0.18;
  if (QUALITY_VALUE_RX.test(input.query)) score += 0.44;
  if (input.productAttributeAffinity.qualityAffinity >= 0.55) score += 0.16;
  if (input.dealSensitivity.valueFocus >= 0.5) score += 0.1;
  if (input.shopperPsychology.primaryPsychology === "value") score += 0.08;
  if (OVERPRICED_RX.test(input.query)) score -= 0.34;
  if (WEAK_QUALITY_RX.test(input.query)) score -= 0.28;
  return clamp01(score);
}

function scorePriceToPerformance(input: ValueIntelligenceInput): number {
  let score = 0.16;
  if (PERFORMANCE_VALUE_RX.test(input.query)) score += 0.42;
  if (input.productAttributeAffinity.performanceAffinity >= 0.55) score += 0.18;
  if (input.buyerModel.buyerType === "performance_buyer" || input.buyerModel.buyerType === "gamer_buyer") {
    score += 0.1;
  }
  if (PREMIUM_VALUE_RX.test(input.query) && !OVERPRICED_RX.test(input.query)) score += 0.08;
  if (OVERPRICED_RX.test(input.query)) score -= 0.24;
  if (WEAK_QUALITY_RX.test(input.query)) score -= 0.18;
  return clamp01(score);
}

function scoreLongTermValue(input: ValueIntelligenceInput): number {
  let score = 0.16;
  if (LONG_TERM_RX.test(input.query)) score += 0.42;
  if (REPLACEMENT_RESISTANT_RX.test(input.query)) score += 0.2;
  if (input.productAttributeAffinity.durabilityAffinity >= 0.55) score += 0.14;
  if (input.reviewCredibility.credibilityScore >= 0.6) score += 0.08;
  if (SHORT_LIFECYCLE_RX.test(input.query)) score -= 0.36;
  if (POOR_DURABILITY_RX.test(input.query)) score -= 0.24;
  return clamp01(score);
}

function scoreOwnershipCost(input: ValueIntelligenceInput): number {
  let score = 0.18;
  if (LOW_OWNERSHIP_RX.test(input.query)) score += 0.44;
  if (input.dealSensitivity.sensitivityScore >= 0.5 && !HIGH_OWNERSHIP_RX.test(input.query)) score += 0.1;
  if (HIGH_OWNERSHIP_RX.test(input.query)) score -= 0.38;
  if (SHORT_LIFECYCLE_RX.test(input.query)) score -= 0.16;
  return clamp01(score);
}

function scoreReplacementValue(input: ValueIntelligenceInput): number {
  let score = 0.16;
  if (REPLACEMENT_RESISTANT_RX.test(input.query)) score += 0.46;
  if (LONG_TERM_RX.test(input.query)) score += 0.22;
  if (input.productAttributeAffinity.durabilityAffinity >= 0.6) score += 0.14;
  if (
    input.buyerModel.buyerType === "family_buyer" ||
    input.buyerModel.buyerType === "professional_buyer"
  ) {
    score += 0.08;
  }
  if (SHORT_LIFECYCLE_RX.test(input.query)) score -= 0.34;
  if (POOR_DURABILITY_RX.test(input.query)) score -= 0.22;
  return clamp01(score);
}

function scoreBaseValue(
  input: ValueIntelligenceInput,
  signals: {
    priceToQualitySignal: number;
    priceToPerformanceSignal: number;
    longTermValueSignal: number;
    ownershipCostSignal: number;
    replacementValueSignal: number;
  }
): number {
  let score = 0.28;

  score += signals.priceToQualitySignal * 0.2;
  score += signals.priceToPerformanceSignal * 0.18;
  score += signals.longTermValueSignal * 0.18;
  score += signals.ownershipCostSignal * 0.14;
  score += signals.replacementValueSignal * 0.14;

  score += input.realDiscount.discountScore * 0.04;
  score += input.retailerTrust.trustScore * 0.06;
  score += input.reviewCredibility.credibilityScore * 0.04;

  if (input.realDiscount.fakeDiscountRisk >= 0.55) score -= 0.08;

  return clamp01(score);
}

function applyValueOverrides(score: number, input: ValueIntelligenceInput): number {
  let out = score;

  if (
    (QUALITY_VALUE_RX.test(input.query) || PERFORMANCE_VALUE_RX.test(input.query)) &&
    (LONG_TERM_RX.test(input.query) || REPLACEMENT_RESISTANT_RX.test(input.query)) &&
    !OVERPRICED_RX.test(input.query)
  ) {
    out = Math.max(out, 0.78);
  }

  if (
    QUALITY_VALUE_RX.test(input.query) &&
    LOW_OWNERSHIP_RX.test(input.query) &&
    !WEAK_QUALITY_RX.test(input.query)
  ) {
    out = Math.max(Math.min(out, 0.9), 0.72);
  }

  if (OVERPRICED_RX.test(input.query) || WEAK_QUALITY_RX.test(input.query)) {
    out = Math.min(out, 0.38);
  }

  if (SHORT_LIFECYCLE_RX.test(input.query) && POOR_DURABILITY_RX.test(input.query)) {
    out = Math.min(out, 0.18);
  }

  if (HIGH_OWNERSHIP_RX.test(input.query) && !LOW_OWNERSHIP_RX.test(input.query)) {
    out = Math.min(out, 0.42);
  }

  if (PERFORMANCE_VALUE_RX.test(input.query) && !OVERPRICED_RX.test(input.query)) {
    out = Math.max(out, 0.62);
  }

  return clamp01(out);
}

function valueLevelFor(score: number): ValueIntelligenceLevel {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildRiskFlags(input: ValueIntelligenceInput, signals: {
  priceToQualitySignal: number;
  ownershipCostSignal: number;
  longTermValueSignal: number;
}): string[] {
  const flags: string[] = [];

  if (OVERPRICED_RX.test(input.query)) flags.push("overpriced_risk");
  if (WEAK_QUALITY_RX.test(input.query) || signals.priceToQualitySignal <= 0.25) {
    flags.push("weak_quality_for_price");
  }
  if (SHORT_LIFECYCLE_RX.test(input.query) || signals.longTermValueSignal <= 0.25) {
    flags.push("short_lifecycle_risk");
  }
  if (HIGH_OWNERSHIP_RX.test(input.query) || signals.ownershipCostSignal <= 0.25) {
    flags.push("high_ownership_cost");
  }
  if (POOR_DURABILITY_RX.test(input.query)) flags.push("poor_durability");

  return flags;
}

/** Build a normalized value-for-money profile from Phase 12.x signals. */
export function buildValueIntelligence(input: ValueIntelligenceInput): ValueIntelligenceMeta {
  const signals = {
    priceToQualitySignal: scorePriceToQuality(input),
    priceToPerformanceSignal: scorePriceToPerformance(input),
    longTermValueSignal: scoreLongTermValue(input),
    ownershipCostSignal: scoreOwnershipCost(input),
    replacementValueSignal: scoreReplacementValue(input),
  };

  const raw = scoreBaseValue(input, signals);
  const valueScore = round2(applyValueOverrides(raw, input));

  return {
    version: VERSION,
    valueLevel: valueLevelFor(valueScore),
    valueScore,
    priceToQualitySignal: round2(signals.priceToQualitySignal),
    priceToPerformanceSignal: round2(signals.priceToPerformanceSignal),
    longTermValueSignal: round2(signals.longTermValueSignal),
    ownershipCostSignal: round2(signals.ownershipCostSignal),
    replacementValueSignal: round2(signals.replacementValueSignal),
    riskFlags: buildRiskFlags(input, signals),
    confidenceTier: input.realDiscount.confidenceTier,
    confidence: input.realDiscount.confidence,
  };
}
