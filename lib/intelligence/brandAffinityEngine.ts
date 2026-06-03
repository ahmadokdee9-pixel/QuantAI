/**
 * Phase 12.14 — Brand Affinity Engine.
 * Estimates shopper brand affinity from Phase 12.x pre-search signals.
 * Meta-only, read-only — no persistence, tray, or ranking mutations.
 */

import type { BuyerIntentVectorMeta } from "@/lib/intelligence/buyerIntentVectorEngine";
import type { ConversionProbabilityMeta } from "@/lib/intelligence/conversionProbabilityEngine";
import type { DealSensitivityMeta } from "@/lib/intelligence/dealSensitivityEngine";
import type { DecisionReadinessMeta } from "@/lib/intelligence/decisionReadinessEngine";
import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { PurchaseFrictionMeta } from "@/lib/intelligence/purchaseFrictionEngine";
import type { ShopperPsychologyMeta } from "@/lib/intelligence/shopperPsychologyEngine";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";

export type BrandAffinityLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type BrandAffinityMeta = {
  version: "phase12.14-v1";
  affinityLevel: BrandAffinityLevel;
  affinityScore: number;
  preferredBrandSignals: string[];
  brandLoyaltyScore: number;
  premiumBrandBias: number;
  valueBrandBias: number;
  confidenceTier: string;
  confidence: number;
};

export type BrandAffinityInput = {
  query: string;
  buyerModel: UniversalBuyerModelMeta;
  buyerIntentVector: BuyerIntentVectorMeta;
  shopperPsychology: ShopperPsychologyMeta;
  decisionReadiness: DecisionReadinessMeta;
  purchaseFriction: PurchaseFrictionMeta;
  conversionProbability: ConversionProbabilityMeta;
  dealSensitivity: DealSensitivityMeta;
  tasteIntelligence: TasteIntelligenceMeta;
  lifestyleIntelligence: LifestyleIntelligenceMeta;
};

const VERSION = "phase12.14-v1" as const;

const KNOWN_BRAND_RX =
  /\b(apple|samsung|sony|bose|dyson|google|pixel|nike|adidas|lg|dell|hp|lenovo|asus|xiaomi|oneplus|philips|bosch|ikea|hermes|rolex|gucci|prada|microsoft|logitech|razer|corsair|canon|nikon)\b/gi;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function extractPreferredBrands(query: string): string[] {
  const matches = query.match(KNOWN_BRAND_RX) ?? [];
  const out: string[] = [];
  for (const match of matches) {
    const brand = match.toLowerCase();
    if (!out.includes(brand)) out.push(brand);
  }
  return out;
}

function scorePremiumBrandBias(input: BrandAffinityInput): number {
  let score = 0.16;

  if (input.shopperPsychology.primaryPsychology === "premium") {
    score += input.shopperPsychology.psychologyScores.premium * 0.34;
  }
  if (input.buyerModel.buyerType === "premium_buyer") score += 0.24;
  if (input.tasteIntelligence.premiumAffinity >= 0.7) score += 0.18;
  if (
    input.tasteIntelligence.styleIntent === "premium" ||
    input.tasteIntelligence.styleIntent === "luxury"
  ) {
    score += 0.14;
  }
  if (input.lifestyleIntelligence.lifestyleIntent === "luxury_buyer") score += 0.12;
  if (/\b(premium|luxury|flagship|designer)\b/i.test(input.query)) score += 0.12;
  if (input.dealSensitivity.sensitivityLevel === "VERY_HIGH") score -= 0.16;

  return clamp01(score);
}

function scoreValueBrandBias(input: BrandAffinityInput): number {
  let score = 0.14;

  if (input.shopperPsychology.primaryPsychology === "value") {
    score += input.shopperPsychology.psychologyScores.value * 0.32;
  }
  if (input.buyerModel.buyerType === "value_buyer") score += 0.22;
  if (input.dealSensitivity.sensitivityScore >= 0.6) score += 0.18;
  if (input.dealSensitivity.valueFocus >= 0.5) score += 0.12;
  if (input.buyerIntentVector.dominantIntent === "value") score += 0.1;
  if (input.shopperPsychology.primaryPsychology === "premium") score -= 0.18;

  return clamp01(score);
}

function scoreBrandLoyalty(input: BrandAffinityInput, preferredBrands: string[]): number {
  let score = 0.12;

  if (preferredBrands.length > 0) score += 0.28;
  if (preferredBrands.length === 1) score += 0.12;
  if (input.buyerModel.buyerType === "premium_buyer" && preferredBrands.length > 0) score += 0.18;
  if (
    input.decisionReadiness.readinessStatus === "READY_TO_BUY" &&
    preferredBrands.length > 0
  ) {
    score += 0.14;
  }
  if (input.decisionReadiness.readinessStatus === "NEEDS_COMPARE") score -= 0.22;
  if (preferredBrands.length >= 2) score -= 0.1;
  if (input.buyerIntentVector.dominantIntent === "urgency") score -= 0.16;

  return clamp01(score);
}

function scoreBaseAffinity(
  input: BrandAffinityInput,
  preferredBrands: string[],
  premiumBrandBias: number,
  valueBrandBias: number,
  brandLoyaltyScore: number
): number {
  let score = 0.34;

  score += brandLoyaltyScore * 0.28;
  score += premiumBrandBias * 0.22;
  score -= valueBrandBias * 0.18;

  if (preferredBrands.length > 0) score += 0.16;
  if (input.shopperPsychology.primaryPsychology === "premium") score += 0.12;
  if (input.buyerModel.buyerType === "premium_buyer") score += 0.1;
  if (input.tasteIntelligence.premiumAffinity >= 0.75) score += 0.08;
  if (input.conversionProbability.probabilityScore >= 0.65) score += 0.06;

  if (input.buyerModel.buyerType === "value_buyer") score -= 0.14;
  if (input.dealSensitivity.sensitivityScore >= 0.75) score -= 0.12;
  if (input.decisionReadiness.readinessStatus === "NEEDS_COMPARE") score -= 0.08;
  if (input.purchaseFriction.frictionLevel === "HIGH") score -= 0.06;
  if (
    input.buyerIntentVector.dominantIntent === "urgency" ||
    input.shopperPsychology.primaryPsychology === "urgency" ||
    /\b(replace|broken)\b/i.test(input.query)
  ) {
    score -= 0.2;
  }

  return clamp01(score);
}

function applyAffinityOverrides(
  score: number,
  input: BrandAffinityInput,
  preferredBrands: string[],
  premiumBrandBias: number,
  valueBrandBias: number
): number {
  let out = score;

  if (
    preferredBrands.includes("apple") &&
    (input.shopperPsychology.primaryPsychology === "premium" ||
      input.buyerModel.buyerType === "premium_buyer" ||
      /\bpremium\b/i.test(input.query))
  ) {
    out = Math.max(Math.min(out, 0.78), 0.66);
  }

  if (
    input.buyerModel.buyerType === "value_buyer" ||
    (/\b(budget|cheap|affordable)\b/i.test(input.query) && /\blaptop\b/i.test(input.query))
  ) {
    out = Math.max(Math.min(out, 0.38), 0.22);
  }

  if (input.decisionReadiness.readinessStatus === "NEEDS_COMPARE") {
    out = Math.max(Math.min(out, 0.58), 0.42);
  }

  if (premiumBrandBias >= 0.55 && valueBrandBias <= 0.35) {
    out = Math.max(out, 0.58);
  }

  if (valueBrandBias >= 0.55 && premiumBrandBias <= 0.35) {
    out = Math.min(out, 0.4);
  }

  if (
    input.buyerIntentVector.dominantIntent === "urgency" ||
    input.shopperPsychology.primaryPsychology === "urgency" ||
    /\b(replace|broken)\b/i.test(input.query)
  ) {
    out = Math.min(out, 0.35);
  }

  return clamp01(out);
}

function affinityLevelFor(score: number): BrandAffinityLevel {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildPreferredBrandSignals(
  input: BrandAffinityInput,
  preferredBrands: string[]
): string[] {
  const signals: string[] = [];

  for (const brand of preferredBrands) {
    signals.push(`brand_${brand}`);
  }
  if (input.tasteIntelligence.styleIntent === "premium" || input.tasteIntelligence.styleIntent === "luxury") {
    signals.push(`taste_${input.tasteIntelligence.styleIntent}`);
  }
  if (input.lifestyleIntelligence.lifestyleIntent !== "general") {
    signals.push(`lifestyle_${input.lifestyleIntelligence.lifestyleIntent}`);
  }
  if (input.shopperPsychology.primaryPsychology === "premium") {
    signals.push("psychology_premium");
  }
  if (input.buyerModel.buyerType === "premium_buyer") {
    signals.push("buyer_premium");
  }
  if (input.buyerModel.buyerType === "value_buyer") {
    signals.push("buyer_value");
  }
  if (input.decisionReadiness.readinessStatus === "NEEDS_COMPARE") {
    signals.push("comparison_mode");
  }
  if (input.buyerIntentVector.dominantIntent === "urgency") {
    signals.push("urgency_reduced_loyalty");
  }
  if (
    input.decisionReadiness.readinessStatus === "READY_TO_BUY" &&
    /\b(replace|broken)\b/i.test(input.query)
  ) {
    signals.push("urgency_reduced_loyalty");
  }

  return signals;
}

/** Build a normalized brand affinity profile from Phase 12.x signals. */
export function buildBrandAffinity(input: BrandAffinityInput): BrandAffinityMeta {
  const preferredBrands = extractPreferredBrands(input.query);
  const premiumBrandBias = round2(scorePremiumBrandBias(input));
  const valueBrandBias = round2(scoreValueBrandBias(input));
  const brandLoyaltyScore = round2(scoreBrandLoyalty(input, preferredBrands));
  const raw = scoreBaseAffinity(
    input,
    preferredBrands,
    premiumBrandBias,
    valueBrandBias,
    brandLoyaltyScore
  );
  const affinityScore = round2(
    applyAffinityOverrides(raw, input, preferredBrands, premiumBrandBias, valueBrandBias)
  );

  return {
    version: VERSION,
    affinityLevel: affinityLevelFor(affinityScore),
    affinityScore,
    preferredBrandSignals: buildPreferredBrandSignals(input, preferredBrands),
    brandLoyaltyScore,
    premiumBrandBias,
    valueBrandBias,
    confidenceTier: input.dealSensitivity.confidenceTier,
    confidence: input.dealSensitivity.confidence,
  };
}
