/**
 * Phase 12.16 — Retailer Trust Intelligence Engine.
 * Evaluates retailer trust posture from Phase 12.x pre-search signals.
 * Meta-only, read-only — no persistence, tray, ranking, or retailer DB mutations.
 */

import type { BrandAffinityMeta } from "@/lib/intelligence/brandAffinityEngine";
import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { DealSensitivityMeta } from "@/lib/intelligence/dealSensitivityEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { ProductAttributeAffinityMeta } from "@/lib/intelligence/productAttributeAffinityEngine";
import type { ShopperPsychologyMeta } from "@/lib/intelligence/shopperPsychologyEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";

export type RetailerTrustLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type RetailerTrustMeta = {
  version: "phase12.16-v1";
  trustLevel: RetailerTrustLevel;
  trustScore: number;
  retailerAgeSignal: number;
  reviewSignal: number;
  reputationSignal: number;
  fulfillmentSignal: number;
  returnPolicySignal: number;
  riskFlags: string[];
  confidenceTier: string;
  confidence: number;
};

export type RetailerTrustInput = {
  query: string;
  buyerModel: UniversalBuyerModelMeta;
  shopperPsychology: ShopperPsychologyMeta;
  contextIntelligence: ContextIntelligenceMeta;
  intentConfidence: IntentConfidenceMeta;
  dealSensitivity: DealSensitivityMeta;
  brandAffinity: BrandAffinityMeta;
  productAttributeAffinity: ProductAttributeAffinityMeta;
};

const VERSION = "phase12.16-v1" as const;

const VERIFIED_RETAILER_RX =
  /\b(official\s+store|official|verified|authorized|authorised|manufacturer\s+store|brand\s+store)\b/i;
const KNOWN_RETAILER_RX =
  /\b(amazon|best\s+buy|walmart|target|costco|apple\s+store|microsoft\s+store|samsung\s+store|bh\s*photo|newegg|home\s+depot|lowes|ikea|nike|adidas)\b/i;
const REVIEW_RX =
  /\b(reviews?|ratings?|top[\s-]?rated|highly[\s-]?rated|customer\s+reviews?|trusted\s+reviews?)\b/i;
const RETURN_POLICY_RX =
  /\b(return\s+policy|easy\s+returns?|free\s+returns?|hassle[\s-]?free\s+returns?|money[\s-]?back\s+guarantee)\b/i;
const FULFILLMENT_RX =
  /\b(fast\s+(?:shipping|delivery)|reliable\s+shipping|fulfillment|ships?\s+fast|same[\s-]?day|next[\s-]?day)\b/i;
const ESTABLISHED_RX =
  /\b(established|long[\s-]?standing|reputable|well[\s-]?known|major\s+retailer|large\s+retailer)\b/i;
const TRUSTED_RX = /\b(trusted\s+retailer|trusted\s+seller|reputable\s+seller|reliable\s+seller)\b/i;
const UNKNOWN_SELLER_RX =
  /\b(unknown\s+seller|third[\s-]?party\s+seller|random\s+seller|unverified\s+seller|marketplace\s+only)\b/i;
const SUSPICIOUS_PRICE_RX =
  /\b(too\s+good\s+to\s+be\s+true|suspicious\s+price|sketchy\s+deal|rock[\s-]?bottom|lowest\s+price\s+anywhere)\b/i;
const WEAK_POLICY_RX = /\b(no\s+returns?|final\s+sale|all\s+sales\s+final|non[\s-]?returnable)\b/i;
const MISSING_INFO_RX = /\b(no\s+reviews?|unrated|missing\s+information|unknown\s+store)\b/i;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scoreRetailerAgeSignal(input: RetailerTrustInput): number {
  let score = 0.18;
  if (ESTABLISHED_RX.test(input.query)) score += 0.42;
  if (KNOWN_RETAILER_RX.test(input.query)) score += 0.34;
  if (VERIFIED_RETAILER_RX.test(input.query)) score += 0.28;
  if (input.buyerModel.buyerType === "premium_buyer") score += 0.12;
  if (input.brandAffinity.premiumBrandBias >= 0.5) score += 0.08;
  if (UNKNOWN_SELLER_RX.test(input.query)) score -= 0.28;
  return clamp01(score);
}

function scoreReviewSignal(input: RetailerTrustInput): number {
  let score = 0.16;
  if (REVIEW_RX.test(input.query)) score += 0.46;
  if (input.productAttributeAffinity.qualityAffinity >= 0.55) score += 0.12;
  if (input.shopperPsychology.primaryPsychology === "research") score += 0.1;
  if (MISSING_INFO_RX.test(input.query)) score -= 0.32;
  if (SUSPICIOUS_PRICE_RX.test(input.query)) score -= 0.18;
  return clamp01(score);
}

function scoreReputationSignal(input: RetailerTrustInput): number {
  let score = 0.18;
  if (TRUSTED_RX.test(input.query)) score += 0.44;
  if (KNOWN_RETAILER_RX.test(input.query)) score += 0.24;
  if (input.brandAffinity.affinityScore >= 0.55) score += 0.1;
  if (input.contextIntelligence.purchaseContext === "gift") score += 0.12;
  if (input.buyerModel.buyerType === "premium_buyer" || input.buyerModel.buyerType === "business_buyer") {
    score += 0.14;
  }
  if (UNKNOWN_SELLER_RX.test(input.query)) score -= 0.3;
  return clamp01(score);
}

function scoreFulfillmentSignal(input: RetailerTrustInput): number {
  let score = 0.16;
  if (FULFILLMENT_RX.test(input.query)) score += 0.44;
  if (input.contextIntelligence.purchaseContext === "replacement") score += 0.18;
  if (input.shopperPsychology.primaryPsychology === "urgency") score += 0.16;
  if (input.contextIntelligence.urgencyContext === "high" || input.contextIntelligence.urgencyContext === "emergency") {
    score += 0.12;
  }
  if (input.productAttributeAffinity.durabilityAffinity >= 0.55) score += 0.08;
  return clamp01(score);
}

function scoreReturnPolicySignal(input: RetailerTrustInput): number {
  let score = 0.16;
  if (RETURN_POLICY_RX.test(input.query)) score += 0.46;
  if (input.contextIntelligence.purchaseContext === "gift") score += 0.14;
  if (input.contextIntelligence.purchaseContext === "comparison") score += 0.1;
  if (input.shopperPsychology.primaryPsychology === "rational") score += 0.08;
  if (WEAK_POLICY_RX.test(input.query)) score -= 0.34;
  return clamp01(score);
}

function scoreBaseTrust(input: RetailerTrustInput, signals: {
  retailerAgeSignal: number;
  reviewSignal: number;
  reputationSignal: number;
  fulfillmentSignal: number;
  returnPolicySignal: number;
}): number {
  let score = 0.28;
  score += signals.retailerAgeSignal * 0.18;
  score += signals.reviewSignal * 0.16;
  score += signals.reputationSignal * 0.2;
  score += signals.fulfillmentSignal * 0.14;
  score += signals.returnPolicySignal * 0.16;

  if (VERIFIED_RETAILER_RX.test(input.query) && KNOWN_RETAILER_RX.test(input.query)) score += 0.12;
  if (TRUSTED_RX.test(input.query)) score += 0.1;
  if (input.intentConfidence.confidenceTier === "VERY_HIGH") score += 0.06;
  if (input.dealSensitivity.sensitivityScore >= 0.75 && SUSPICIOUS_PRICE_RX.test(input.query)) score -= 0.18;
  if (UNKNOWN_SELLER_RX.test(input.query)) score -= 0.22;
  if (WEAK_POLICY_RX.test(input.query)) score -= 0.14;
  if (MISSING_INFO_RX.test(input.query)) score -= 0.12;
  if (input.dealSensitivity.sensitivityLevel === "VERY_HIGH" && UNKNOWN_SELLER_RX.test(input.query)) score -= 0.1;

  return clamp01(score);
}

function applyTrustOverrides(score: number, input: RetailerTrustInput): number {
  let out = score;

  if (VERIFIED_RETAILER_RX.test(input.query) && /\bapple\b/i.test(input.query)) {
    out = Math.max(out, 0.86);
  }

  if (TRUSTED_RX.test(input.query) && RETURN_POLICY_RX.test(input.query)) {
    out = Math.max(Math.min(out, 0.82), 0.68);
  }

  if (UNKNOWN_SELLER_RX.test(input.query) || SUSPICIOUS_PRICE_RX.test(input.query)) {
    out = Math.min(out, 0.38);
  }

  if (
    input.contextIntelligence.purchaseContext === "replacement" &&
    FULFILLMENT_RX.test(input.query)
  ) {
    out = Math.max(Math.min(out, 0.72), 0.52);
  }

  if (input.buyerModel.buyerType === "premium_buyer" && KNOWN_RETAILER_RX.test(input.query)) {
    out = Math.max(out, 0.7);
  }

  return clamp01(out);
}

function trustLevelFor(score: number): RetailerTrustLevel {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildRiskFlags(input: RetailerTrustInput, trustScore: number): string[] {
  const flags: string[] = [];

  if (UNKNOWN_SELLER_RX.test(input.query)) flags.push("unknown_seller_risk");
  if (SUSPICIOUS_PRICE_RX.test(input.query)) flags.push("suspicious_pricing_risk");
  if (WEAK_POLICY_RX.test(input.query)) flags.push("weak_return_policy_risk");
  if (MISSING_INFO_RX.test(input.query)) flags.push("missing_retailer_information");
  if (input.dealSensitivity.sensitivityScore >= 0.8 && trustScore <= 0.45) {
    flags.push("deal_seeking_trust_tension");
  }
  if (input.contextIntelligence.purchaseContext === "gift" && trustScore < 0.55) {
    flags.push("gift_context_trust_gap");
  }

  return flags;
}

/** Build a normalized retailer trust profile from Phase 12.x signals. */
export function buildRetailerTrust(input: RetailerTrustInput): RetailerTrustMeta {
  const signalScores = {
    retailerAgeSignal: scoreRetailerAgeSignal(input),
    reviewSignal: scoreReviewSignal(input),
    reputationSignal: scoreReputationSignal(input),
    fulfillmentSignal: scoreFulfillmentSignal(input),
    returnPolicySignal: scoreReturnPolicySignal(input),
  };

  if (
    input.contextIntelligence.purchaseContext === "replacement" &&
    FULFILLMENT_RX.test(input.query)
  ) {
    signalScores.fulfillmentSignal = Math.max(signalScores.fulfillmentSignal, 0.78);
  }

  const raw = scoreBaseTrust(input, signalScores);
  const trustScore = round2(applyTrustOverrides(raw, input));

  return {
    version: VERSION,
    trustLevel: trustLevelFor(trustScore),
    trustScore,
    retailerAgeSignal: round2(signalScores.retailerAgeSignal),
    reviewSignal: round2(signalScores.reviewSignal),
    reputationSignal: round2(signalScores.reputationSignal),
    fulfillmentSignal: round2(signalScores.fulfillmentSignal),
    returnPolicySignal: round2(signalScores.returnPolicySignal),
    riskFlags: buildRiskFlags(input, trustScore),
    confidenceTier: input.productAttributeAffinity.confidenceTier,
    confidence: input.productAttributeAffinity.confidence,
  };
}
