/**
 * Phase 12.12 — Conversion Probability Engine.
 * Converts Phase 12.0–12.11 pre-search signals into a conversion probability profile.
 * Meta-only, read-only — no persistence, tray, or ranking mutations.
 */

import type { BuyerIntentVectorMeta } from "@/lib/intelligence/buyerIntentVectorEngine";
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

export type ConversionProbabilityBand =
  | "VERY_LOW"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "VERY_HIGH";

export type ConversionProbabilityMeta = {
  version: "phase12.12-v1";
  probabilityBand: ConversionProbabilityBand;
  probabilityScore: number;
  drivers: string[];
  blockers: string[];
  readinessStatus: string;
  frictionLevel: string;
  confidenceTier: string;
  confidence: number;
};

export type ConversionProbabilityInput = {
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
};

const VERSION = "phase12.12-v1" as const;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scoreBaseProbability(input: ConversionProbabilityInput): number {
  let score = 0.36;

  score += input.decisionReadiness.readinessScore * 0.3;
  score += (1 - input.purchaseFriction.frictionScore) * 0.34;
  score += input.intentConfidence.overallConfidence * 0.16;

  if (input.decisionReadiness.readinessStatus === "READY_TO_BUY") score += 0.16;
  if (input.decisionReadiness.readinessStatus === "NEEDS_COMPARE") score -= 0.2;
  if (input.decisionReadiness.readinessStatus === "NEEDS_RESEARCH") score -= 0.1;
  if (input.decisionReadiness.readinessStatus === "WAIT_FOR_BETTER_DEAL") score -= 0.08;
  if (input.decisionReadiness.readinessStatus === "LOW_CONFIDENCE") score -= 0.16;
  if (input.decisionReadiness.readinessStatus === "UNCERTAIN") score -= 0.32;

  if (
    input.purchaseFriction.frictionLevel === "VERY_LOW" ||
    input.purchaseFriction.frictionLevel === "LOW"
  ) {
    score += 0.14;
  }
  if (input.purchaseFriction.frictionLevel === "HIGH") score -= 0.14;
  if (input.purchaseFriction.frictionLevel === "VERY_HIGH") score -= 0.26;

  if (input.contextIntelligence.purchaseContext === "replacement") score += 0.14;
  if (
    input.buyerIntentVector.dominantIntent === "urgency" ||
    input.contextIntelligence.urgencyContext === "high" ||
    input.contextIntelligence.urgencyContext === "emergency"
  ) {
    score += 0.1;
  }
  if (
    input.shopperPsychology.primaryPsychology === "premium" &&
    input.intentConfidence.confidenceTier === "VERY_HIGH"
  ) {
    score += 0.12;
  }
  if (input.intentConfidence.confidenceTier === "VERY_HIGH") score += 0.08;
  if (input.intentConfidence.confidenceTier === "HIGH") score += 0.05;
  if (input.intentConfidence.confidenceTier === "LOW") score -= 0.12;
  if (input.intentConfidence.confidenceTier === "UNCERTAIN") score -= 0.22;

  if (input.multiCategory.confidence >= 0.85 && input.multiCategory.category !== "general") {
    score += 0.08;
  }
  if (input.contextIntelligence.purchaseContext === "gift") score -= 0.1;
  if (
    input.shoppingBrain.budgetIntent.active &&
    input.shopperPsychology.primaryPsychology === "value"
  ) {
    score -= 0.08;
  }

  return clamp01(score);
}

function applyProbabilityOverrides(
  score: number,
  input: ConversionProbabilityInput
): number {
  let out = score;

  if (
    input.contextIntelligence.purchaseContext === "replacement" &&
    input.decisionReadiness.readinessStatus === "READY_TO_BUY" &&
    (input.purchaseFriction.frictionLevel === "LOW" ||
      input.purchaseFriction.frictionLevel === "VERY_LOW")
  ) {
    out = Math.max(out, 0.86);
  }

  if (
    input.shopperPsychology.primaryPsychology === "premium" &&
    input.intentConfidence.confidenceTier === "VERY_HIGH" &&
    input.decisionReadiness.readinessStatus === "READY_TO_BUY"
  ) {
    out = Math.max(Math.min(out, 0.78), 0.68);
  }

  if (
    input.decisionReadiness.readinessStatus === "NEEDS_RESEARCH" &&
    (input.buyerModel.buyerType === "gamer_buyer" || input.buyerModel.buyerType === "research_buyer")
  ) {
    out = Math.max(Math.min(out, 0.58), 0.42);
  }

  if (
    input.contextIntelligence.purchaseContext === "comparison" ||
    input.decisionReadiness.readinessStatus === "NEEDS_COMPARE"
  ) {
    out = Math.max(Math.min(out, 0.38), 0.22);
  }

  if (
    input.decisionReadiness.readinessStatus === "UNCERTAIN" ||
    input.intentConfidence.confidenceTier === "UNCERTAIN"
  ) {
    out = Math.min(out, 0.18);
  }

  return clamp01(out);
}

function probabilityBandFor(score: number): ConversionProbabilityBand {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildDrivers(input: ConversionProbabilityInput): string[] {
  const drivers: string[] = [];

  if (input.decisionReadiness.readinessStatus === "READY_TO_BUY") {
    drivers.push("ready_to_buy_readiness");
  }
  if (
    input.purchaseFriction.frictionLevel === "LOW" ||
    input.purchaseFriction.frictionLevel === "VERY_LOW"
  ) {
    drivers.push("low_purchase_friction");
  }
  if (input.contextIntelligence.purchaseContext === "replacement") {
    drivers.push("replacement_purchase_context");
  }
  if (input.buyerIntentVector.dominantIntent === "urgency") {
    drivers.push("urgency_dominant_intent");
  }
  if (
    input.shopperPsychology.primaryPsychology === "premium" &&
    input.intentConfidence.confidenceTier === "VERY_HIGH"
  ) {
    drivers.push("premium_certainty");
  }
  if (input.intentConfidence.confidenceTier === "VERY_HIGH") {
    drivers.push("very_high_intent_confidence");
  }
  if (input.multiCategory.confidence >= 0.85 && input.multiCategory.category !== "general") {
    drivers.push("strong_category_affinity");
  }
  if (input.decisionReadiness.readinessScore >= 0.8) {
    drivers.push("high_readiness_score");
  }

  return drivers;
}

function buildBlockers(input: ConversionProbabilityInput): string[] {
  const blockers: string[] = [];

  if (input.purchaseFriction.frictionLevel === "HIGH") {
    blockers.push("high_purchase_friction");
  }
  if (input.purchaseFriction.frictionLevel === "VERY_HIGH") {
    blockers.push("very_high_purchase_friction");
  }
  if (input.decisionReadiness.readinessStatus === "NEEDS_COMPARE") {
    blockers.push("comparison_decision_pending");
  }
  if (input.decisionReadiness.readinessStatus === "NEEDS_RESEARCH") {
    blockers.push("research_phase_active");
  }
  if (input.decisionReadiness.readinessStatus === "UNCERTAIN") {
    blockers.push("uncertain_shopping_intent");
  }
  if (input.contextIntelligence.purchaseContext === "gift") {
    blockers.push("gift_recipient_ambiguity");
  }
  if (
    input.shoppingBrain.budgetIntent.active &&
    input.shopperPsychology.primaryPsychology === "value"
  ) {
    blockers.push("budget_value_tension");
  }
  if (
    input.intentConfidence.confidenceTier === "LOW" ||
    input.intentConfidence.confidenceTier === "UNCERTAIN"
  ) {
    blockers.push("weak_intent_confidence");
  }

  return blockers;
}

/** Build a normalized conversion probability profile from Phase 12.x signals. */
export function buildConversionProbability(
  input: ConversionProbabilityInput
): ConversionProbabilityMeta {
  const raw = scoreBaseProbability(input);
  const probabilityScore = round2(applyProbabilityOverrides(raw, input));

  return {
    version: VERSION,
    probabilityBand: probabilityBandFor(probabilityScore),
    probabilityScore,
    drivers: buildDrivers(input),
    blockers: buildBlockers(input),
    readinessStatus: input.decisionReadiness.readinessStatus,
    frictionLevel: input.purchaseFriction.frictionLevel,
    confidenceTier: input.purchaseFriction.confidenceTier,
    confidence: input.purchaseFriction.confidence,
  };
}
