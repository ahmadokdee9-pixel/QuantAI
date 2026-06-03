/**
 * Phase 12.11 — Purchase Friction Engine.
 * Converts Phase 12.0–12.10 pre-search signals into a purchase friction profile.
 * Meta-only, read-only — no persistence, tray, or ranking mutations.
 */

import type { BuyerIntentVectorMeta } from "@/lib/intelligence/buyerIntentVectorEngine";
import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { DecisionReadinessMeta } from "@/lib/intelligence/decisionReadinessEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { MemoryPreparationMeta } from "@/lib/intelligence/memoryPreparationEngine";
import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { ShopperPsychologyMeta } from "@/lib/intelligence/shopperPsychologyEngine";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";

export type PurchaseFrictionLevel =
  | "VERY_LOW"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "VERY_HIGH";

export type PurchaseFrictionMeta = {
  version: "phase12.11-v1";
  frictionLevel: PurchaseFrictionLevel;
  frictionScore: number;
  blockers: string[];
  hesitationSignals: string[];
  confidenceTier: string;
  confidence: number;
};

export type PurchaseFrictionInput = {
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
};

const VERSION = "phase12.11-v1" as const;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scoreBaseFriction(input: PurchaseFrictionInput): number {
  let score = 0.38;

  // Lower friction — clear purchase path
  if (input.decisionReadiness.readinessStatus === "READY_TO_BUY") score -= 0.24;
  if (input.contextIntelligence.purchaseContext === "replacement") score -= 0.2;
  if (
    input.buyerIntentVector.dominantIntent === "urgency" ||
    input.contextIntelligence.urgencyContext === "high" ||
    input.contextIntelligence.urgencyContext === "emergency"
  ) {
    score -= 0.18;
  }
  if (
    input.shopperPsychology.primaryPsychology === "premium" &&
    input.intentConfidence.confidenceTier === "VERY_HIGH"
  ) {
    score -= 0.22;
  }
  if (input.intentConfidence.confidenceTier === "VERY_HIGH") score -= 0.12;
  if (input.intentConfidence.confidenceTier === "HIGH") score -= 0.08;

  // Higher friction — hesitation and ambiguity
  if (input.decisionReadiness.readinessStatus === "NEEDS_COMPARE") score += 0.28;
  if (input.decisionReadiness.readinessStatus === "NEEDS_RESEARCH") score += 0.14;
  if (input.decisionReadiness.readinessStatus === "WAIT_FOR_BETTER_DEAL") score += 0.1;
  if (input.decisionReadiness.readinessStatus === "LOW_CONFIDENCE") score += 0.22;
  if (input.decisionReadiness.readinessStatus === "UNCERTAIN") score += 0.34;

  if (input.contextIntelligence.purchaseContext === "comparison") score += 0.24;
  if (
    input.shopperPsychology.primaryPsychology === "research" ||
    input.shopperPsychology.primaryPsychology === "rational"
  ) {
    score += input.shopperPsychology.psychologyScores.research * 0.12;
    score += input.shopperPsychology.psychologyScores.rational * 0.08;
  }
  if (input.contextIntelligence.purchaseContext === "gift") score += 0.16;
  if (
    input.shoppingBrain.budgetIntent.active &&
    input.shopperPsychology.primaryPsychology === "value"
  ) {
    score += 0.12;
  }
  if (input.intentConfidence.confidenceTier === "LOW") score += 0.18;
  if (input.intentConfidence.confidenceTier === "UNCERTAIN") score += 0.28;
  if (input.multiCategory.category === "general" && input.multiCategory.confidence < 0.55) {
    score += 0.14;
  }

  return clamp01(score);
}

function applyFrictionOverrides(score: number, input: PurchaseFrictionInput): number {
  let out = score;

  if (
    input.contextIntelligence.purchaseContext === "replacement" &&
    input.decisionReadiness.readinessStatus === "READY_TO_BUY"
  ) {
    out = Math.max(Math.min(out, 0.35), 0.25);
  }

  if (
    input.shopperPsychology.primaryPsychology === "premium" &&
    input.intentConfidence.confidenceTier === "VERY_HIGH"
  ) {
    out = Math.max(Math.min(out, 0.34), 0.24);
  }

  if (
    input.contextIntelligence.purchaseContext === "comparison" ||
    input.decisionReadiness.readinessStatus === "NEEDS_COMPARE"
  ) {
    out = Math.max(Math.min(out, 0.78), 0.62);
  }

  if (
    input.decisionReadiness.readinessStatus === "NEEDS_RESEARCH" &&
    (input.buyerModel.buyerType === "gamer_buyer" || input.buyerModel.buyerType === "research_buyer")
  ) {
    out = Math.max(Math.min(out, 0.58), 0.42);
  }

  if (
    input.decisionReadiness.readinessStatus === "UNCERTAIN" ||
    input.intentConfidence.confidenceTier === "UNCERTAIN"
  ) {
    out = Math.max(out, 0.86);
  }

  if (input.decisionReadiness.readinessStatus === "LOW_CONFIDENCE") {
    out = Math.max(out, 0.48);
  }

  return clamp01(out);
}

function frictionLevelFor(score: number): PurchaseFrictionLevel {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildBlockers(input: PurchaseFrictionInput): string[] {
  const blockers: string[] = [];

  if (input.decisionReadiness.readinessStatus === "NEEDS_COMPARE") {
    blockers.push("comparison_decision_pending");
  }
  if (input.decisionReadiness.readinessStatus === "NEEDS_RESEARCH") {
    blockers.push("research_phase_active");
  }
  if (input.decisionReadiness.readinessStatus === "LOW_CONFIDENCE") {
    blockers.push("low_intent_confidence");
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
  if (input.contextIntelligence.purchaseContext === "comparison") {
    blockers.push("comparison_context_active");
  }

  return blockers;
}

function buildHesitationSignals(input: PurchaseFrictionInput): string[] {
  const signals: string[] = [];

  signals.push(`readiness_${input.decisionReadiness.readinessStatus.toLowerCase()}`);
  signals.push(`psychology_${input.shopperPsychology.primaryPsychology}`);
  signals.push(`confidence_${input.intentConfidence.confidenceTier.toLowerCase()}`);

  if (input.buyerIntentVector.researchIntent >= 0.35) {
    signals.push("elevated_research_intent");
  }
  if (input.shopperPsychology.primaryPsychology === "rational") {
    signals.push("rational_evaluation_mode");
  }
  if (input.contextIntelligence.purchaseContext === "gift") {
    signals.push("gift_purchase_hesitation");
  }
  if (input.intentConfidence.confidenceTier === "UNCERTAIN") {
    signals.push("vague_query_language");
  }
  if (
    input.decisionReadiness.readinessStatus === "READY_TO_BUY" &&
    input.buyerIntentVector.dominantIntent === "urgency"
  ) {
    signals.push("urgency_reduces_hesitation");
  }
  if (
    input.shopperPsychology.primaryPsychology === "premium" &&
    input.intentConfidence.confidenceTier === "VERY_HIGH"
  ) {
    signals.push("premium_certainty");
  }

  return signals;
}

/** Build a normalized purchase friction profile from Phase 12.x signals. */
export function buildPurchaseFriction(input: PurchaseFrictionInput): PurchaseFrictionMeta {
  const raw = scoreBaseFriction(input);
  const frictionScore = round2(applyFrictionOverrides(raw, input));

  return {
    version: VERSION,
    frictionLevel: frictionLevelFor(frictionScore),
    frictionScore,
    blockers: buildBlockers(input),
    hesitationSignals: buildHesitationSignals(input),
    confidenceTier: input.decisionReadiness.confidenceTier,
    confidence: input.decisionReadiness.confidence,
  };
}
