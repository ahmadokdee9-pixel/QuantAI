/**
 * Phase 12.9 — Shopper Psychology Engine.
 * Converts Phase 12.0–12.8 signals into a normalized shopper psychology profile.
 * Meta-only, read-only — no persistence, no tray or ranking mutations.
 */

import type { BuyerIntentVectorMeta } from "@/lib/intelligence/buyerIntentVectorEngine";
import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { MemoryPreparationMeta } from "@/lib/intelligence/memoryPreparationEngine";
import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";

export type ShopperPsychologyType =
  | "rational"
  | "emotional"
  | "premium"
  | "value"
  | "research"
  | "convenience"
  | "urgency";

export type ShopperPsychologyScores = {
  rational: number;
  emotional: number;
  premium: number;
  value: number;
  research: number;
  convenience: number;
  urgency: number;
};

export type ShopperPsychologyMeta = {
  version: "phase12.9-v1";
  primaryPsychology: ShopperPsychologyType;
  psychologyScores: ShopperPsychologyScores;
  confidenceTier: string;
  confidence: number;
};

export type ShopperPsychologyInput = {
  shoppingBrain: ShoppingBrainMeta;
  multiCategory: MultiCategoryMeta;
  tasteIntelligence: TasteIntelligenceMeta;
  lifestyleIntelligence: LifestyleIntelligenceMeta;
  contextIntelligence: ContextIntelligenceMeta;
  intentConfidence: IntentConfidenceMeta;
  memoryPreparation: MemoryPreparationMeta;
  buyerModel: UniversalBuyerModelMeta;
  buyerIntentVector: BuyerIntentVectorMeta;
};

const VERSION = "phase12.9-v1" as const;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scoreRational(input: ShopperPsychologyInput): number {
  let score = 0.18;

  if (input.contextIntelligence.purchaseContext === "comparison") score += 0.52;
  if (input.buyerIntentVector.researchIntent >= 0.3) {
    score += input.buyerIntentVector.researchIntent * 0.38;
  }
  if (input.shoppingBrain.budgetIntent.active) score += 0.22;
  if (
    input.buyerIntentVector.performanceIntent >= 0.75 &&
    input.buyerIntentVector.valueIntent >= 0.45
  ) {
    score += 0.28;
  }
  if (input.buyerModel.buyerType === "research_buyer") score += 0.12;
  if (input.contextIntelligence.lifecycleContext === "professional") score += 0.1;

  return clamp01(score);
}

function scoreEmotional(input: ShopperPsychologyInput): number {
  let score = 0.12;

  if (input.contextIntelligence.purchaseContext === "gift") score += 0.55;
  if (input.shoppingBrain.purchaseIntent === "gift") score += 0.42;
  if (input.lifestyleIntelligence.lifestyleIntent === "parent") score += 0.28;
  if (input.lifestyleIntelligence.useCaseIntent === "family") score += 0.22;
  if (input.buyerModel.buyerType === "family_buyer") score += 0.35;
  if (input.tasteIntelligence.styleIntent === "elegant") score += 0.12;

  return clamp01(score);
}

function scorePremium(input: ShopperPsychologyInput): number {
  let score = input.buyerIntentVector.premiumIntent * 0.72;
  score += input.tasteIntelligence.premiumAffinity * 0.28;

  if (input.tasteIntelligence.styleIntent === "premium" || input.tasteIntelligence.styleIntent === "luxury") {
    score += 0.22;
  }
  if (input.buyerModel.buyerType === "premium_buyer") score += 0.25;
  if (input.shoppingBrain.qualityIntent === "luxury" || input.shoppingBrain.qualityIntent === "high") {
    score += 0.12;
  }

  return clamp01(score);
}

function scoreValue(input: ShopperPsychologyInput): number {
  let score = input.buyerIntentVector.valueIntent * 0.78;

  if (input.shoppingBrain.valueIntent === "savings") score += 0.22;
  if (input.shoppingBrain.purchaseIntent === "best_value") score += 0.18;
  if (input.shoppingBrain.purchaseIntent === "compare") score += 0.05;
  if (input.buyerModel.buyerType === "value_buyer") score += 0.2;
  if (input.memoryPreparation.buyerProfile.contextProfile.includes("budget_constrained")) score += 0.12;

  return clamp01(score);
}

function scoreResearch(input: ShopperPsychologyInput): number {
  let score = input.buyerIntentVector.researchIntent * 0.62;

  if (input.contextIntelligence.purchaseContext === "research") score += 0.28;
  if (input.contextIntelligence.purchaseContext === "comparison") score += 0.18;
  if (input.shoppingBrain.purchaseIntent === "research") score += 0.2;
  if (input.shoppingBrain.purchaseIntent === "best_value") score += 0.15;
  if (input.shoppingBrain.budgetIntent.active) score += 0.12;
  if (input.buyerModel.buyerType === "research_buyer") score += 0.22;
  if (input.buyerModel.buyerType === "gamer_buyer") score += 0.08;

  return clamp01(score);
}

function scoreConvenience(input: ShopperPsychologyInput): number {
  let score = input.buyerIntentVector.convenienceIntent * 0.75;

  if (input.buyerIntentVector.dominantIntent === "convenience") score += 0.22;
  if (input.shoppingBrain.purchaseIntent === "buy_now") score += 0.25;
  if (input.contextIntelligence.purchaseContext === "first_purchase") score += 0.1;
  if (input.buyerModel.buyerType === "family_buyer") score += 0.12;

  return clamp01(score);
}

function scoreUrgency(input: ShopperPsychologyInput): number {
  let score = input.buyerIntentVector.urgencyIntent * 0.82;

  if (input.buyerIntentVector.dominantIntent === "urgency") score += 0.18;
  if (input.contextIntelligence.urgencyContext === "high") score += 0.15;
  if (input.contextIntelligence.urgencyContext === "emergency") score += 0.2;
  if (input.contextIntelligence.purchaseContext === "replacement") score += 0.12;

  return clamp01(score);
}

function applyPsychologyBoosts(
  scores: ShopperPsychologyScores,
  input: ShopperPsychologyInput
): ShopperPsychologyScores {
  const out = { ...scores };

  if (input.contextIntelligence.purchaseContext === "comparison") {
    out.rational = Math.max(out.rational, 0.72);
  }
  if (input.buyerModel.buyerType === "premium_buyer") {
    out.premium = Math.max(out.premium, 1);
  }
  if (input.contextIntelligence.purchaseContext === "gift") {
    out.emotional = Math.max(out.emotional, 0.91);
  }
  if (
    input.buyerModel.buyerType === "gamer_buyer" &&
    input.buyerIntentVector.dominantIntent === "performance"
  ) {
    out.research = Math.max(out.research, 0.92);
    out.rational = Math.max(out.rational, 0.94);
    // Budget-framed performance shopping is rational/research-led, not pure value hunting.
    out.value = Math.min(out.value, 0.88);
  }
  if (input.buyerIntentVector.dominantIntent === "urgency") {
    out.urgency = Math.max(out.urgency, 1);
  }
  const performanceLedValueShopping =
    (input.buyerModel.buyerType === "gamer_buyer" ||
      input.buyerModel.buyerType === "performance_buyer") &&
    input.buyerIntentVector.dominantIntent === "performance";
  if (
    !performanceLedValueShopping &&
    input.shoppingBrain.valueIntent === "savings" &&
    (input.shoppingBrain.purchaseIntent === "best_value" ||
      input.memoryPreparation.buyerProfile.contextProfile.includes("budget_constrained"))
  ) {
    out.value = Math.max(out.value, 0.95);
  }

  return out;
}

function resolvePrimaryPsychology(scores: ShopperPsychologyScores): ShopperPsychologyType {
  const ranked: { type: ShopperPsychologyType; score: number }[] = [
    { type: "rational", score: scores.rational },
    { type: "emotional", score: scores.emotional },
    { type: "premium", score: scores.premium },
    { type: "value", score: scores.value },
    { type: "research", score: scores.research },
    { type: "convenience", score: scores.convenience },
    { type: "urgency", score: scores.urgency },
  ];
  ranked.sort((a, b) => b.score - a.score);
  return ranked[0]?.type ?? "rational";
}

/** Build a normalized shopper psychology profile from Phase 12.x signals. */
export function buildShopperPsychology(input: ShopperPsychologyInput): ShopperPsychologyMeta {
  const raw: ShopperPsychologyScores = {
    rational: scoreRational(input),
    emotional: scoreEmotional(input),
    premium: scorePremium(input),
    value: scoreValue(input),
    research: scoreResearch(input),
    convenience: scoreConvenience(input),
    urgency: scoreUrgency(input),
  };

  const boosted = applyPsychologyBoosts(raw, input);
  const psychologyScores: ShopperPsychologyScores = {
    rational: round2(boosted.rational),
    emotional: round2(boosted.emotional),
    premium: round2(boosted.premium),
    value: round2(boosted.value),
    research: round2(boosted.research),
    convenience: round2(boosted.convenience),
    urgency: round2(boosted.urgency),
  };

  return {
    version: VERSION,
    primaryPsychology: resolvePrimaryPsychology(psychologyScores),
    psychologyScores,
    confidenceTier: input.buyerIntentVector.confidenceTier,
    confidence: input.buyerIntentVector.confidence,
  };
}
