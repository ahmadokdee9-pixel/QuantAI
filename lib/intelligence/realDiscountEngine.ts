/**
 * Phase 12.18 — Real Discount Intelligence Engine.
 * Estimates whether a discount is genuinely valuable or artificially inflated.
 * Meta-only, read-only — no persistence, tray, ranking, or retailer DB mutations.
 */

import type { DealSensitivityMeta } from "@/lib/intelligence/dealSensitivityEngine";
import type { ProductAttributeAffinityMeta } from "@/lib/intelligence/productAttributeAffinityEngine";
import type { RetailerTrustMeta } from "@/lib/intelligence/retailerTrustEngine";
import type { ReviewCredibilityMeta } from "@/lib/intelligence/reviewCredibilityEngine";
import type { ShopperPsychologyMeta } from "@/lib/intelligence/shopperPsychologyEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";

export type RealDiscountLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type RealDiscountMeta = {
  version: "phase12.18-v1";
  discountLevel: RealDiscountLevel;
  discountScore: number;
  priceDropSignal: number;
  historicalPriceSignal: number;
  valueGainSignal: number;
  fakeDiscountRisk: number;
  urgencyDiscountSignal: number;
  riskFlags: string[];
  confidenceTier: string;
  confidence: number;
};

export type RealDiscountInput = {
  query: string;
  buyerModel: UniversalBuyerModelMeta;
  shopperPsychology: ShopperPsychologyMeta;
  dealSensitivity: DealSensitivityMeta;
  productAttributeAffinity: ProductAttributeAffinityMeta;
  retailerTrust: RetailerTrustMeta;
  reviewCredibility: ReviewCredibilityMeta;
};

const VERSION = "phase12.18-v1" as const;

const PRICE_DROP_RX =
  /\b(significant\s+price\s+(drop|reduction)|price\s+drop|deep\s+discount|50\s*%\s*off|half\s+off|major\s+markdown|lowest\s+price\s+ever)\b/i;
const HISTORICAL_PRICE_RX =
  /\b(historical\s+(low|price)|consistent\s+discount\s+history|price\s+history|track(ed)?\s+price|all[\s-]?time\s+low|regular\s+sale\s+price)\b/i;
const VALUE_GAIN_RX =
  /\b(strong\s+value\s+gain|great\s+value|best\s+value|real\s+savings|genuine\s+deal|true\s+bargain|worth\s+the\s+price)\b/i;
const TRUSTED_DEAL_RX =
  /\b(trusted\s+retailer|official\s+store|verified\s+seller|reputable\s+retailer)\b/i;
const FAKE_DISCOUNT_RX =
  /\b(fake\s+(sale|discount|deal)|phantom\s+discount|inflated\s+original\s+price|fake\s+original\s+price|msrp\s+inflation|sham\s+sale)\b/i;
const INFLATED_REFERENCE_RX =
  /\b(inflated\s+(original\s+)?(reference\s+)?price|artificially\s+high\s+(msrp|price)|was\s+never\s+that\s+price|fake\s+msrp)\b/i;
const SUSPICIOUS_SALE_RX =
  /\b(suspicious\s+(markdown|sale)|too\s+good\s+to\s+be\s+true\s+sale|fake\s+sale\s+pattern|perpetual\s+sale|always\s+on\s+sale)\b/i;
const WEAK_VALUE_RX =
  /\b(weak\s+value\s+(gain|improvement)|minimal\s+savings|tiny\s+discount|barely\s+cheaper|negligible\s+markdown)\b/i;
const URGENCY_RX =
  /\b(limited\s+time\s+only|hurry|ends\s+today|flash\s+sale|countdown|act\s+now|last\s+chance|today\s+only|urgency\s+marketing)\b/i;
const GENUINE_DEAL_RX =
  /\b(genuine\s+discount|real\s+deal|authentic\s+sale|legitimate\s+markdown|verified\s+price\s+drop)\b/i;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scorePriceDrop(input: RealDiscountInput): number {
  let score = 0.16;
  if (PRICE_DROP_RX.test(input.query)) score += 0.46;
  if (GENUINE_DEAL_RX.test(input.query)) score += 0.22;
  if (input.dealSensitivity.discountFocus >= 0.55) score += 0.1;
  if (input.dealSensitivity.priceFocus >= 0.5) score += 0.08;
  if (WEAK_VALUE_RX.test(input.query)) score -= 0.28;
  if (FAKE_DISCOUNT_RX.test(input.query)) score -= 0.24;
  return clamp01(score);
}

function scoreHistoricalPrice(input: RealDiscountInput): number {
  let score = 0.14;
  if (HISTORICAL_PRICE_RX.test(input.query)) score += 0.44;
  if (GENUINE_DEAL_RX.test(input.query)) score += 0.18;
  if (input.retailerTrust.trustScore >= 0.65) score += 0.12;
  if (input.reviewCredibility.credibilityScore >= 0.6) score += 0.1;
  if (SUSPICIOUS_SALE_RX.test(input.query)) score -= 0.26;
  if (INFLATED_REFERENCE_RX.test(input.query)) score -= 0.22;
  return clamp01(score);
}

function scoreValueGain(input: RealDiscountInput): number {
  let score = 0.16;
  if (VALUE_GAIN_RX.test(input.query)) score += 0.42;
  if (input.dealSensitivity.valueFocus >= 0.5) score += 0.18;
  if (input.productAttributeAffinity.qualityAffinity >= 0.55) score += 0.12;
  if (input.shopperPsychology.primaryPsychology === "value") score += 0.1;
  if (WEAK_VALUE_RX.test(input.query)) score -= 0.34;
  if (URGENCY_RX.test(input.query) && !VALUE_GAIN_RX.test(input.query)) score -= 0.16;
  return clamp01(score);
}

function scoreFakeDiscountRisk(input: RealDiscountInput): number {
  let score = 0.1;
  if (FAKE_DISCOUNT_RX.test(input.query)) score += 0.46;
  if (INFLATED_REFERENCE_RX.test(input.query)) score += 0.38;
  if (SUSPICIOUS_SALE_RX.test(input.query)) score += 0.32;
  if (input.retailerTrust.trustScore <= 0.35) score += 0.18;
  if (input.reviewCredibility.credibilityScore <= 0.35) score += 0.12;
  if (input.retailerTrust.riskFlags.includes("unknown_seller_risk")) score += 0.14;
  if (GENUINE_DEAL_RX.test(input.query)) score -= 0.2;
  if (TRUSTED_DEAL_RX.test(input.query)) score -= 0.14;
  if (HISTORICAL_PRICE_RX.test(input.query)) score -= 0.12;
  return clamp01(score);
}

function scoreUrgencyDiscount(input: RealDiscountInput): number {
  let score = 0.08;
  if (URGENCY_RX.test(input.query)) score += 0.48;
  if (/\b(deal|discount|sale)\b/i.test(input.query) && URGENCY_RX.test(input.query) && !VALUE_GAIN_RX.test(input.query)) {
    score += 0.18;
  }
  if (input.shopperPsychology.primaryPsychology === "urgency") score += 0.1;
  if (PRICE_DROP_RX.test(input.query) && !URGENCY_RX.test(input.query)) score -= 0.14;
  if (HISTORICAL_PRICE_RX.test(input.query)) score -= 0.12;
  if (GENUINE_DEAL_RX.test(input.query)) score -= 0.1;
  return clamp01(score);
}

function scoreBaseDiscount(
  input: RealDiscountInput,
  signals: {
    priceDropSignal: number;
    historicalPriceSignal: number;
    valueGainSignal: number;
    fakeDiscountRisk: number;
    urgencyDiscountSignal: number;
  }
): number {
  let score = 0.28;

  score += signals.priceDropSignal * 0.18;
  score += signals.historicalPriceSignal * 0.16;
  score += signals.valueGainSignal * 0.2;
  score -= signals.fakeDiscountRisk * 0.28;
  score -= signals.urgencyDiscountSignal * 0.14;

  score += input.retailerTrust.trustScore * 0.1;
  score += input.dealSensitivity.sensitivityScore * 0.08;
  score += input.reviewCredibility.credibilityScore * 0.06;

  if (input.buyerModel.buyerType === "value_buyer") score += 0.04;

  return clamp01(score);
}

function applyDiscountOverrides(score: number, input: RealDiscountInput): number {
  let out = score;

  if (
    (PRICE_DROP_RX.test(input.query) || VALUE_GAIN_RX.test(input.query)) &&
    (TRUSTED_DEAL_RX.test(input.query) || input.retailerTrust.trustScore >= 0.7) &&
    !FAKE_DISCOUNT_RX.test(input.query)
  ) {
    out = Math.max(out, 0.72);
  }

  if (
    HISTORICAL_PRICE_RX.test(input.query) &&
    GENUINE_DEAL_RX.test(input.query) &&
    !SUSPICIOUS_SALE_RX.test(input.query)
  ) {
    out = Math.max(Math.min(out, 0.88), 0.68);
  }

  if (
    FAKE_DISCOUNT_RX.test(input.query) ||
    INFLATED_REFERENCE_RX.test(input.query) ||
    (SUSPICIOUS_SALE_RX.test(input.query) && FAKE_DISCOUNT_RX.test(input.query))
  ) {
    out = Math.min(out, 0.18);
  }

  if (URGENCY_RX.test(input.query) && !PRICE_DROP_RX.test(input.query) && !VALUE_GAIN_RX.test(input.query)) {
    out = Math.min(out, 0.38);
  }

  if (WEAK_VALUE_RX.test(input.query)) {
    out = Math.min(out, 0.42);
  }

  if (input.retailerTrust.trustScore <= 0.35 && input.dealSensitivity.discountFocus >= 0.6) {
    out = Math.min(out, 0.45);
  }

  return clamp01(out);
}

function discountLevelFor(score: number): RealDiscountLevel {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildRiskFlags(input: RealDiscountInput, signals: { fakeDiscountRisk: number; urgencyDiscountSignal: number; valueGainSignal: number }): string[] {
  const flags: string[] = [];

  if (FAKE_DISCOUNT_RX.test(input.query) || signals.fakeDiscountRisk >= 0.55) {
    flags.push("fake_discount_risk");
  }
  if (INFLATED_REFERENCE_RX.test(input.query)) flags.push("inflated_reference_price");
  if (WEAK_VALUE_RX.test(input.query) || signals.valueGainSignal <= 0.25) flags.push("weak_value_gain");
  if (URGENCY_RX.test(input.query) && signals.urgencyDiscountSignal >= 0.45) flags.push("artificial_urgency");
  if (SUSPICIOUS_SALE_RX.test(input.query) || signals.fakeDiscountRisk >= 0.4) {
    flags.push("suspicious_sale_pattern");
  }

  return flags;
}

/** Build a normalized real-discount profile from Phase 12.x signals. */
export function buildRealDiscount(input: RealDiscountInput): RealDiscountMeta {
  const signals = {
    priceDropSignal: scorePriceDrop(input),
    historicalPriceSignal: scoreHistoricalPrice(input),
    valueGainSignal: scoreValueGain(input),
    fakeDiscountRisk: scoreFakeDiscountRisk(input),
    urgencyDiscountSignal: scoreUrgencyDiscount(input),
  };

  const raw = scoreBaseDiscount(input, signals);
  const discountScore = round2(applyDiscountOverrides(raw, input));

  return {
    version: VERSION,
    discountLevel: discountLevelFor(discountScore),
    discountScore,
    priceDropSignal: round2(signals.priceDropSignal),
    historicalPriceSignal: round2(signals.historicalPriceSignal),
    valueGainSignal: round2(signals.valueGainSignal),
    fakeDiscountRisk: round2(signals.fakeDiscountRisk),
    urgencyDiscountSignal: round2(signals.urgencyDiscountSignal),
    riskFlags: buildRiskFlags(input, signals),
    confidenceTier: input.reviewCredibility.confidenceTier,
    confidence: input.reviewCredibility.confidence,
  };
}
