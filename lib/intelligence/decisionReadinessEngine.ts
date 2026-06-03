/**
 * Phase 12.10 — Decision Readiness Engine.
 * Converts Phase 12.0–12.9 pre-search signals into a decision readiness profile.
 * Meta-only, read-only — no persistence, tray, or ranking mutations.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { BuyerIntentVectorMeta } from "@/lib/intelligence/buyerIntentVectorEngine";
import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { MemoryPreparationMeta } from "@/lib/intelligence/memoryPreparationEngine";
import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { ShopperPsychologyMeta } from "@/lib/intelligence/shopperPsychologyEngine";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";

export type DecisionReadinessStatus =
  | "READY_TO_BUY"
  | "NEEDS_COMPARE"
  | "NEEDS_RESEARCH"
  | "WAIT_FOR_BETTER_DEAL"
  | "LOW_CONFIDENCE"
  | "UNCERTAIN";

export type DecisionReadinessMeta = {
  version: "phase12.10-v1";
  readinessStatus: DecisionReadinessStatus;
  readinessScore: number;
  blockers: string[];
  supportingSignals: string[];
  confidenceTier: string;
  confidence: number;
};

export type DecisionReadinessInput = {
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
};

const VERSION = "phase12.10-v1" as const;

const STATUS_PRIORITY: DecisionReadinessStatus[] = [
  "UNCERTAIN",
  "LOW_CONFIDENCE",
  "NEEDS_COMPARE",
  "NEEDS_RESEARCH",
  "WAIT_FOR_BETTER_DEAL",
  "READY_TO_BUY",
];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scoreReadyToBuy(input: DecisionReadinessInput): number {
  let score = 0.14;

  if (input.buyerIntentVector.dominantIntent === "urgency") score += 0.52;
  if (input.contextIntelligence.purchaseContext === "replacement") score += 0.38;
  if (
    input.contextIntelligence.urgencyContext === "high" ||
    input.contextIntelligence.urgencyContext === "emergency"
  ) {
    score += 0.28;
  }
  if (input.shoppingBrain.purchaseIntent === "buy_now") score += 0.32;
  if (input.shopperPsychology.primaryPsychology === "convenience") score += 0.22;
  if (
    input.shopperPsychology.primaryPsychology === "premium" &&
    input.intentConfidence.confidenceTier === "VERY_HIGH"
  ) {
    score += 0.3;
  }
  if (input.intentConfidence.confidenceTier === "VERY_HIGH") score += 0.12;
  if (input.contextIntelligence.purchaseContext === "comparison") score -= 0.28;
  if (input.shopperPsychology.primaryPsychology === "research") score -= 0.18;
  if (input.shopperPsychology.primaryPsychology === "value") score -= 0.12;

  return clamp01(score);
}

function scoreNeedsCompare(input: DecisionReadinessInput): number {
  let score = 0.1;

  if (input.contextIntelligence.purchaseContext === "comparison") score += 0.58;
  if (input.shoppingBrain.purchaseIntent === "compare") score += 0.42;
  if (input.shopperPsychology.primaryPsychology === "rational") {
    score += input.shopperPsychology.psychologyScores.rational * 0.28;
  }
  if (input.buyerIntentVector.researchIntent >= 0.35) score += 0.12;

  return clamp01(score);
}

function scoreNeedsResearch(input: DecisionReadinessInput): number {
  let score = 0.12;

  if (input.shopperPsychology.primaryPsychology === "research") {
    score += input.shopperPsychology.psychologyScores.research * 0.42;
  }
  if (input.shopperPsychology.primaryPsychology === "rational") {
    score += input.shopperPsychology.psychologyScores.rational * 0.32;
  }
  if (input.buyerIntentVector.researchIntent >= 0.35) {
    score += input.buyerIntentVector.researchIntent * 0.35;
  }
  if (input.contextIntelligence.purchaseContext === "research") score += 0.22;
  if (
    input.shoppingBrain.purchaseIntent === "research" ||
    input.shoppingBrain.purchaseIntent === "best_value"
  ) {
    score += 0.18;
  }
  if (input.shoppingBrain.budgetIntent.active) score += 0.1;
  if (input.buyerModel.buyerType === "research_buyer" || input.buyerModel.buyerType === "gamer_buyer") {
    score += 0.08;
  }

  return clamp01(score);
}

function scoreWaitForBetterDeal(input: DecisionReadinessInput): number {
  let score = 0.1;

  if (input.shopperPsychology.primaryPsychology === "value") {
    score += input.shopperPsychology.psychologyScores.value * 0.48;
  }
  if (input.buyerIntentVector.dominantIntent === "value") score += 0.28;
  if (input.shoppingBrain.valueIntent === "savings") score += 0.22;
  if (input.shoppingBrain.purchaseIntent === "best_value") score += 0.12;
  if (input.buyerModel.buyerType === "value_buyer") score += 0.18;
  if (input.buyerIntentVector.dominantIntent === "urgency") score -= 0.35;
  if (input.contextIntelligence.purchaseContext === "replacement") score -= 0.25;

  return clamp01(score);
}

function scoreLowConfidence(input: DecisionReadinessInput): number {
  let score = 0.08;

  if (input.intentConfidence.confidenceTier === "LOW") score += 0.78;
  if (input.intentConfidence.confidenceTier === "MEDIUM") score += 0.42;
  if (input.intentConfidence.overallConfidence < 0.68) score += 0.18;
  if (input.contextIntelligence.purchaseContext === "gift") score += 0.22;
  if (input.multiCategory.confidence < 0.55) score += 0.12;
  if (input.intentConfidence.confidenceTier === "VERY_HIGH") score -= 0.35;
  if (input.intentConfidence.confidenceTier === "HIGH") score -= 0.2;

  return clamp01(score);
}

function scoreUncertain(input: DecisionReadinessInput): number {
  let score = 0.05;

  if (input.intentConfidence.confidenceTier === "UNCERTAIN") score += 0.88;
  if (input.intentConfidence.overallConfidence < 0.45) score += 0.35;
  if (input.multiCategory.category === "general" && input.multiCategory.confidence < 0.52) {
    score += 0.28;
  }
  if (input.contextIntelligence.purchaseContext === "general" && input.intentConfidence.overallConfidence < 0.55) {
    score += 0.15;
  }

  return clamp01(score);
}

function applyReadinessOverrides(
  scores: Record<DecisionReadinessStatus, number>,
  input: DecisionReadinessInput
): Record<DecisionReadinessStatus, number> {
  const out = { ...scores };

  if (input.intentConfidence.confidenceTier === "UNCERTAIN") {
    out.UNCERTAIN = Math.max(out.UNCERTAIN, 0.92);
  }

  if (input.contextIntelligence.purchaseContext === "comparison") {
    out.NEEDS_COMPARE = Math.max(out.NEEDS_COMPARE, 0.82);
  }

  if (
    input.buyerIntentVector.dominantIntent === "urgency" ||
    (input.contextIntelligence.purchaseContext === "replacement" &&
      input.intentConfidence.confidenceTier === "VERY_HIGH")
  ) {
    out.READY_TO_BUY = Math.max(out.READY_TO_BUY, 0.88);
    out.WAIT_FOR_BETTER_DEAL = Math.min(out.WAIT_FOR_BETTER_DEAL, 0.45);
  }

  if (
    (input.buyerModel.buyerType === "gamer_buyer" || input.buyerModel.buyerType === "research_buyer") &&
    input.shopperPsychology.primaryPsychology === "rational"
  ) {
    out.NEEDS_RESEARCH = Math.max(out.NEEDS_RESEARCH, 0.86);
    out.READY_TO_BUY = Math.min(out.READY_TO_BUY, 0.72);
  }

  if (
    input.shopperPsychology.primaryPsychology === "value" &&
    input.buyerModel.buyerType === "value_buyer" &&
    input.buyerIntentVector.dominantIntent !== "urgency"
  ) {
    out.WAIT_FOR_BETTER_DEAL = Math.max(out.WAIT_FOR_BETTER_DEAL, 0.9);
  }

  if (
    input.shopperPsychology.primaryPsychology === "premium" &&
    input.intentConfidence.confidenceTier === "VERY_HIGH"
  ) {
    out.READY_TO_BUY = Math.max(out.READY_TO_BUY, 0.84);
    out.NEEDS_RESEARCH = Math.min(out.NEEDS_RESEARCH, 0.55);
  }

  if (
    input.contextIntelligence.purchaseContext === "gift" &&
    input.intentConfidence.confidenceTier === "MEDIUM"
  ) {
    out.LOW_CONFIDENCE = Math.max(out.LOW_CONFIDENCE, 0.78);
    out.READY_TO_BUY = Math.min(out.READY_TO_BUY, 0.55);
  }

  return out;
}

function resolveReadinessStatus(
  scores: Record<DecisionReadinessStatus, number>
): { status: DecisionReadinessStatus; score: number } {
  let best: DecisionReadinessStatus = "UNCERTAIN";
  let bestScore = -1;

  for (const status of STATUS_PRIORITY) {
    const score = scores[status];
    if (score > bestScore) {
      bestScore = score;
      best = status;
    }
  }

  return { status: best, score: clamp01(bestScore) };
}

function buildBlockers(status: DecisionReadinessStatus, input: DecisionReadinessInput): string[] {
  const blockers: string[] = [];

  if (status === "READY_TO_BUY") return blockers;

  if (status === "NEEDS_COMPARE") {
    blockers.push("comparison_context_active");
    if (input.shoppingBrain.purchaseIntent === "compare") blockers.push("explicit_compare_intent");
  }

  if (status === "NEEDS_RESEARCH") {
    if (input.buyerIntentVector.researchIntent >= 0.35) blockers.push("research_intent_active");
    if (input.shoppingBrain.budgetIntent.active) blockers.push("budget_evaluation_pending");
    if (input.shopperPsychology.primaryPsychology === "rational") {
      blockers.push("rational_evaluation_in_progress");
    }
  }

  if (status === "WAIT_FOR_BETTER_DEAL") {
    blockers.push("value_optimization_pending");
    if (input.shoppingBrain.valueIntent === "savings") blockers.push("deal_seeking_mode");
  }

  if (status === "LOW_CONFIDENCE") {
    if (input.intentConfidence.confidenceTier === "MEDIUM") blockers.push("medium_intent_confidence");
    if (input.intentConfidence.confidenceTier === "LOW") blockers.push("low_intent_confidence");
    if (input.contextIntelligence.purchaseContext === "gift") blockers.push("gift_context_ambiguity");
  }

  if (status === "UNCERTAIN") {
    blockers.push("ambiguous_shopping_intent");
    if (input.multiCategory.category === "general") blockers.push("general_category_signal");
  }

  return blockers;
}

function buildSupportingSignals(
  status: DecisionReadinessStatus,
  input: DecisionReadinessInput
): string[] {
  const signals: string[] = [];

  signals.push(`intent_confidence_${input.intentConfidence.confidenceTier.toLowerCase()}`);
  signals.push(`purchase_context_${input.contextIntelligence.purchaseContext}`);
  signals.push(`psychology_${input.shopperPsychology.primaryPsychology}`);
  signals.push(`dominant_intent_${input.buyerIntentVector.dominantIntent}`);
  signals.push(`buyer_type_${input.buyerModel.buyerType}`);

  if (status === "READY_TO_BUY") {
    if (input.contextIntelligence.purchaseContext === "replacement") {
      signals.push("replacement_purchase_context");
    }
    if (input.buyerIntentVector.dominantIntent === "urgency") {
      signals.push("urgency_dominant_intent");
    }
    if (input.shopperPsychology.primaryPsychology === "premium") {
      signals.push("premium_buyer_clarity");
    }
  }

  if (status === "NEEDS_COMPARE" && input.contextIntelligence.purchaseContext === "comparison") {
    signals.push("comparison_purchase_context");
  }

  if (status === "NEEDS_RESEARCH" && input.buyerIntentVector.researchIntent >= 0.35) {
    signals.push("elevated_research_intent");
  }

  if (status === "WAIT_FOR_BETTER_DEAL" && input.shopperPsychology.primaryPsychology === "value") {
    signals.push("value_psychology_dominant");
  }

  return signals;
}

function buildReadinessSummary(meta: DecisionReadinessMeta): string {
  switch (meta.readinessStatus) {
    case "READY_TO_BUY":
      return `Decision readiness: ready to buy (${Math.round(meta.readinessScore * 100)}% readiness).`;
    case "NEEDS_COMPARE":
      return `Decision readiness: compare options before buying (${Math.round(meta.readinessScore * 100)}% readiness).`;
    case "NEEDS_RESEARCH":
      return `Decision readiness: more research recommended (${Math.round(meta.readinessScore * 100)}% readiness).`;
    case "WAIT_FOR_BETTER_DEAL":
      return `Decision readiness: wait for a stronger deal (${Math.round(meta.readinessScore * 100)}% readiness).`;
    case "LOW_CONFIDENCE":
      return `Decision readiness: low confidence — clarify intent first (${Math.round(meta.readinessScore * 100)}% readiness).`;
    case "UNCERTAIN":
      return `Decision readiness: uncertain — refine the query (${Math.round(meta.readinessScore * 100)}% readiness).`;
  }
}

/** Build a normalized decision readiness profile from Phase 12.x signals. */
export function buildDecisionReadiness(input: DecisionReadinessInput): DecisionReadinessMeta {
  const rawScores: Record<DecisionReadinessStatus, number> = {
    READY_TO_BUY: scoreReadyToBuy(input),
    NEEDS_COMPARE: scoreNeedsCompare(input),
    NEEDS_RESEARCH: scoreNeedsResearch(input),
    WAIT_FOR_BETTER_DEAL: scoreWaitForBetterDeal(input),
    LOW_CONFIDENCE: scoreLowConfidence(input),
    UNCERTAIN: scoreUncertain(input),
  };

  const scores = applyReadinessOverrides(rawScores, input);
  const resolved = resolveReadinessStatus(scores);

  return {
    version: VERSION,
    readinessStatus: resolved.status,
    readinessScore: round2(resolved.score),
    blockers: buildBlockers(resolved.status, input),
    supportingSignals: buildSupportingSignals(resolved.status, input),
    confidenceTier: input.shopperPsychology.confidenceTier,
    confidence: input.shopperPsychology.confidence,
  };
}

/** Enrich decision brief with readiness summary — meta-only, preserves existing fields. */
export function applyDecisionReadinessToBrief(
  decisionBrief: DecisionBriefDTO | null,
  readiness: DecisionReadinessMeta
): DecisionBriefDTO | null {
  if (!decisionBrief) return null;

  return {
    ...decisionBrief,
    decisionReadinessSummary: buildReadinessSummary(readiness),
  };
}
