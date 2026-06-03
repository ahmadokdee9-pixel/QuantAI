/**
 * Phase 12.13 — Deal Sensitivity Engine.
 * Converts Phase 12.0–12.12 pre-search signals into a deal sensitivity profile.
 * Meta-only, read-only — no persistence, tray, or ranking mutations.
 */

import type { BuyerIntentVectorMeta } from "@/lib/intelligence/buyerIntentVectorEngine";
import type { ConversionProbabilityMeta } from "@/lib/intelligence/conversionProbabilityEngine";
import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { DecisionReadinessMeta } from "@/lib/intelligence/decisionReadinessEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { MemoryPreparationMeta } from "@/lib/intelligence/memoryPreparationEngine";
import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { PurchaseFrictionMeta } from "@/lib/intelligence/purchaseFrictionEngine";
import type { ShopperPsychologyMeta } from "@/lib/intelligence/shopperPsychologyEngine";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";

export type DealSensitivityLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type DealSensitivityMeta = {
  version: "phase12.13-v1";
  sensitivityLevel: DealSensitivityLevel;
  sensitivityScore: number;
  priceFocus: number;
  discountFocus: number;
  valueFocus: number;
  premiumTolerance: number;
  signals: string[];
  confidenceTier: string;
  confidence: number;
};

export type DealSensitivityInput = {
  query: string;
  shoppingBrain: ShoppingBrainMeta;
  multiCategory: MultiCategoryMeta;
  tasteIntelligence: TasteIntelligenceMeta;
  lifestyleIntelligence: LifestyleIntelligenceMeta;
  contextIntelligence: ContextIntelligenceMeta;
  intentConfidence: IntentConfidenceMeta;
  memoryPreparation: MemoryPreparationMeta;
  buyerModel: UniversalBuyerModelMeta;
  buyerIntentVector: BuyerIntentVectorMeta;
  shopperPsychology: ShopperPsychologyMeta;
  decisionReadiness: DecisionReadinessMeta;
  purchaseFriction: PurchaseFrictionMeta;
  conversionProbability: ConversionProbabilityMeta;
};

const VERSION = "phase12.13-v1" as const;

const HIGH_DEAL_RX =
  /\b(cheap|cheapest|budget|affordable|under\s+\$?\d|best\s+value|deal|deals|discount|sale|coupon|lowest\s+price|save\s+money|value\s+buyer|bargain|on\s+sale)\b/i;
const DISCOUNT_RX = /\b(deal|deals|discount|sale|coupon|on\s+sale|lowest\s+price|save\s+money|bargain)\b/i;
const PRICE_RX = /\b(cheap|cheapest|budget|affordable|under\s+\$?\d|lowest\s+price)\b/i;
const VALUE_RX = /\b(best\s+value|value\s+buyer|save\s+money|budget|affordable)\b/i;
const LOW_DEAL_RX =
  /\b(premium|luxury|professional|flagship|best\s+quality|no\s+budget\s+constraint|performance\s+first|high[\s-]?end|designer)\b/i;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scorePriceFocus(input: DealSensitivityInput): number {
  let score = 0.18;
  if (PRICE_RX.test(input.query)) score += 0.52;
  if (input.shoppingBrain.budgetIntent.active) score += 0.28;
  if (input.shoppingBrain.valueIntent === "savings") score += 0.16;
  if (input.buyerIntentVector.dominantIntent === "value") score += 0.12;
  if (input.shopperPsychology.primaryPsychology === "value") score += 0.1;
  if (input.shoppingBrain.qualityIntent === "basic") score += 0.08;
  if (input.shopperPsychology.primaryPsychology === "premium") score -= 0.18;
  return clamp01(score);
}

function scoreDiscountFocus(input: DealSensitivityInput): number {
  let score = 0.14;
  if (DISCOUNT_RX.test(input.query)) score += 0.48;
  if (input.shoppingBrain.purchaseIntent === "best_value") score += 0.18;
  if (input.decisionReadiness.readinessStatus === "WAIT_FOR_BETTER_DEAL") score += 0.22;
  if (input.shopperPsychology.primaryPsychology === "value") {
    score += input.shopperPsychology.psychologyScores.value * 0.16;
  }
  if (input.buyerModel.buyerType === "value_buyer") score += 0.14;
  if (input.shopperPsychology.primaryPsychology === "premium") score -= 0.16;
  return clamp01(score);
}

function scoreValueFocus(input: DealSensitivityInput): number {
  let score = 0.16;
  if (VALUE_RX.test(input.query)) score += 0.42;
  if (input.shopperPsychology.primaryPsychology === "value") {
    score += input.shopperPsychology.psychologyScores.value * 0.34;
  }
  if (input.buyerIntentVector.valueIntent >= 0.55) score += 0.18;
  if (input.buyerModel.buyerType === "value_buyer") score += 0.2;
  if (input.shoppingBrain.purchaseIntent === "best_value") score += 0.16;
  if (input.memoryPreparation.buyerProfile.contextProfile.includes("budget_constrained")) score += 0.1;
  if (input.shopperPsychology.primaryPsychology === "premium") score -= 0.2;
  return clamp01(score);
}

function scorePremiumTolerance(input: DealSensitivityInput): number {
  let score = 0.22;
  if (LOW_DEAL_RX.test(input.query)) score += 0.38;
  if (input.shopperPsychology.primaryPsychology === "premium") {
    score += input.shopperPsychology.psychologyScores.premium * 0.28;
  }
  if (input.buyerModel.buyerType === "premium_buyer") score += 0.24;
  if (input.shoppingBrain.valueIntent === "premium") score += 0.18;
  if (input.shoppingBrain.qualityIntent === "luxury" || input.shoppingBrain.qualityIntent === "high") {
    score += 0.12;
  }
  if (input.tasteIntelligence.styleIntent === "premium" || input.tasteIntelligence.styleIntent === "luxury") {
    score += 0.1;
  }
  if (HIGH_DEAL_RX.test(input.query)) score -= 0.28;
  if (input.buyerModel.buyerType === "value_buyer") score -= 0.18;
  return clamp01(score);
}

function scoreBaseSensitivity(input: DealSensitivityInput): number {
  let score = 0.34;

  score += scorePriceFocus(input) * 0.22;
  score += scoreDiscountFocus(input) * 0.2;
  score += scoreValueFocus(input) * 0.24;
  score -= scorePremiumTolerance(input) * 0.18;

  if (HIGH_DEAL_RX.test(input.query)) score += 0.22;
  if (LOW_DEAL_RX.test(input.query)) score -= 0.24;
  if (input.shopperPsychology.primaryPsychology === "value") score += 0.16;
  if (input.shoppingBrain.budgetIntent.active) score += 0.14;
  if (input.shoppingBrain.valueIntent === "savings") score += 0.12;
  if (input.buyerModel.buyerType === "value_buyer") score += 0.14;
  if (input.decisionReadiness.readinessStatus === "WAIT_FOR_BETTER_DEAL") score += 0.18;
  if (
    input.shoppingBrain.urgencyIntent === "low" &&
    input.buyerIntentVector.dominantIntent !== "urgency"
  ) {
    score += 0.08;
  }

  if (input.buyerModel.buyerType === "premium_buyer") score -= 0.22;
  if (input.buyerModel.buyerType === "business_buyer") score -= 0.14;
  if (input.shopperPsychology.primaryPsychology === "premium") score -= 0.18;
  if (input.contextIntelligence.lifecycleContext === "professional") score -= 0.12;
  if (
    input.contextIntelligence.purchaseContext === "replacement" &&
    input.buyerIntentVector.dominantIntent === "urgency"
  ) {
    score -= 0.28;
  }
  if (
    input.decisionReadiness.readinessStatus === "READY_TO_BUY" &&
    input.shopperPsychology.primaryPsychology === "premium"
  ) {
    score -= 0.16;
  }

  return clamp01(score);
}

function applySensitivityOverrides(score: number, input: DealSensitivityInput): number {
  let out = score;

  if (PRICE_RX.test(input.query) && input.shoppingBrain.budgetIntent.active) {
    out = Math.max(out, 0.86);
  }

  if (/\bcheap\b/i.test(input.query)) {
    out = Math.max(out, 0.88);
  }

  if (/\bbest\s+value\b/i.test(input.query)) {
    out = Math.max(Math.min(out, 0.82), 0.62);
  }

  if (
    input.shopperPsychology.primaryPsychology === "premium" &&
    input.intentConfidence.confidenceTier === "VERY_HIGH"
  ) {
    out = Math.max(Math.min(out, 0.38), 0.22);
  }

  if (
    /\bprofessional\b/i.test(input.query) &&
    (input.contextIntelligence.lifecycleContext === "professional" ||
      input.buyerModel.buyerType === "business_buyer")
  ) {
    out = Math.min(out, 0.18);
  }

  if (
    input.contextIntelligence.purchaseContext === "replacement" &&
    (input.buyerIntentVector.dominantIntent === "urgency" || /\bnow\b/i.test(input.query))
  ) {
    out = Math.min(out, 0.18);
  }

  return clamp01(out);
}

function sensitivityLevelFor(score: number): DealSensitivityLevel {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildSignals(input: DealSensitivityInput): string[] {
  const signals: string[] = [];

  if (HIGH_DEAL_RX.test(input.query)) signals.push("high_deal_language");
  if (LOW_DEAL_RX.test(input.query)) signals.push("low_deal_language");
  if (input.shopperPsychology.primaryPsychology === "value") signals.push("value_psychology");
  if (input.shopperPsychology.primaryPsychology === "premium") signals.push("premium_psychology");
  if (input.shoppingBrain.budgetIntent.active) signals.push("budget_constrained");
  if (input.shoppingBrain.valueIntent === "savings") signals.push("savings_intent");
  if (input.buyerModel.buyerType === "value_buyer") signals.push("value_buyer_profile");
  if (input.buyerModel.buyerType === "premium_buyer") signals.push("premium_buyer_profile");
  if (input.decisionReadiness.readinessStatus === "WAIT_FOR_BETTER_DEAL") {
    signals.push("wait_for_better_deal_readiness");
  }
  if (input.buyerIntentVector.dominantIntent === "urgency") signals.push("urgency_reduces_deal_focus");
  if (input.contextIntelligence.lifecycleContext === "professional") {
    signals.push("professional_purchase_context");
  }

  return signals;
}

/** Build a normalized deal sensitivity profile from Phase 12.x signals. */
export function buildDealSensitivity(input: DealSensitivityInput): DealSensitivityMeta {
  const priceFocus = round2(scorePriceFocus(input));
  const discountFocus = round2(scoreDiscountFocus(input));
  const valueFocus = round2(scoreValueFocus(input));
  const premiumTolerance = round2(scorePremiumTolerance(input));
  const raw = scoreBaseSensitivity(input);
  const sensitivityScore = round2(applySensitivityOverrides(raw, input));

  return {
    version: VERSION,
    sensitivityLevel: sensitivityLevelFor(sensitivityScore),
    sensitivityScore,
    priceFocus,
    discountFocus,
    valueFocus,
    premiumTolerance,
    signals: buildSignals(input),
    confidenceTier: input.conversionProbability.confidenceTier,
    confidence: input.conversionProbability.confidence,
  };
}
