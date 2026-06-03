/**
 * Phase 12.8 — Buyer Intent Vector Engine.
 * Converts Phase 12.7 buyer model into a normalized machine-readable intent vector.
 * Meta-only, read-only — no persistence, no tray or ranking mutations.
 */

import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { MemoryPreparationMeta } from "@/lib/intelligence/memoryPreparationEngine";
import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type {
  UniversalBuyerModelMeta,
  UniversalBuyerType,
} from "@/lib/intelligence/universalBuyerModelEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";

export type DominantBuyerIntent =
  | "value"
  | "premium"
  | "performance"
  | "convenience"
  | "research"
  | "urgency";

export type BuyerIntentVectorMeta = {
  version: "phase12.8-v1";
  valueIntent: number;
  premiumIntent: number;
  performanceIntent: number;
  convenienceIntent: number;
  researchIntent: number;
  urgencyIntent: number;
  dominantIntent: DominantBuyerIntent;
  confidenceTier: string;
  confidence: number;
};

export type BuyerIntentVectorInput = {
  shoppingBrain: ShoppingBrainMeta;
  multiCategory: MultiCategoryMeta;
  tasteIntelligence: TasteIntelligenceMeta;
  lifestyleIntelligence: LifestyleIntelligenceMeta;
  contextIntelligence: ContextIntelligenceMeta;
  intentConfidence: IntentConfidenceMeta;
  memoryPreparation: MemoryPreparationMeta;
  buyerModel: UniversalBuyerModelMeta;
};

const VERSION = "phase12.8-v1" as const;

const URGENCY_WEIGHT: Record<ContextIntelligenceMeta["urgencyContext"], number> = {
  low: 0.12,
  medium: 0.52,
  high: 0.82,
  emergency: 0.95,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function affinityIncludes(model: UniversalBuyerModelMeta, token: string): boolean {
  const haystack = [
    ...model.categoryAffinity,
    ...model.tasteAffinity,
    ...model.lifestyleAffinity,
    ...model.contextAffinity,
  ];
  return haystack.includes(token);
}

function scoreValueIntent(input: BuyerIntentVectorInput): number {
  let score = 0.12;
  const brain = input.shoppingBrain;

  if (brain.valueIntent === "savings") score += 0.42;
  if (brain.purchaseIntent === "best_value") score += 0.28;
  if (brain.budgetIntent.active) score += 0.22;
  if (input.buyerModel.buyerType === "value_buyer") score += 0.18;
  if (affinityIncludes(input.buyerModel, "budget_constrained")) score += 0.12;
  if (affinityIncludes(input.buyerModel, "savings")) score += 0.1;
  if (brain.qualityIntent === "basic") score += 0.08;

  return clamp01(score);
}

function scorePremiumIntent(input: BuyerIntentVectorInput): number {
  let score = input.shoppingBrain.premiumIntent * 0.55;
  score += input.tasteIntelligence.premiumAffinity * 0.35;

  if (input.shoppingBrain.valueIntent === "premium") score += 0.35;
  if (input.shoppingBrain.purchaseIntent === "premium") score += 0.28;
  if (input.tasteIntelligence.styleIntent === "premium" || input.tasteIntelligence.styleIntent === "luxury") {
    score += 0.32;
  }
  if (input.buyerModel.buyerType === "premium_buyer") score += 0.25;
  if (affinityIncludes(input.buyerModel, "premium") || affinityIncludes(input.buyerModel, "luxury")) {
    score += 0.15;
  }

  return clamp01(score);
}

function scorePerformanceIntent(input: BuyerIntentVectorInput): number {
  let score = 0.1;

  if (input.tasteIntelligence.styleIntent === "gaming" || input.tasteIntelligence.styleIntent === "performance") {
    score += 0.38;
  }
  if (input.tasteIntelligence.personalityIntent === "performance") score += 0.32;
  if (input.lifestyleIntelligence.lifestyleIntent === "gamer" || input.lifestyleIntelligence.lifestyleIntent === "fitness") {
    score += 0.28;
  }
  if (input.lifestyleIntelligence.useCaseIntent === "gaming" || input.lifestyleIntelligence.useCaseIntent === "sport") {
    score += 0.22;
  }
  if (input.buyerModel.buyerType === "gamer_buyer" || input.buyerModel.buyerType === "performance_buyer") {
    score += 0.35;
  }
  if (affinityIncludes(input.buyerModel, "gaming") || affinityIncludes(input.buyerModel, "performance")) {
    score += 0.18;
  }
  if (input.contextIntelligence.lifecycleContext === "power_user") score += 0.12;

  return clamp01(score);
}

function scoreConvenienceIntent(input: BuyerIntentVectorInput): number {
  let score = 0.1;

  if (input.shoppingBrain.purchaseIntent === "buy_now") score += 0.45;
  if (input.contextIntelligence.purchaseContext === "replacement") score += 0.42;
  if (input.contextIntelligence.purchaseContext === "first_purchase") score += 0.18;
  if (input.lifestyleIntelligence.useCaseIntent === "family" || input.lifestyleIntelligence.useCaseIntent === "daily_use") {
    score += 0.15;
  }
  if (input.buyerModel.buyerType === "family_buyer") score += 0.12;
  if (affinityIncludes(input.buyerModel, "replacement")) score += 0.35;
  if (input.contextIntelligence.lifecycleContext === "new_user") score += 0.1;

  return clamp01(score);
}

function scoreResearchIntent(input: BuyerIntentVectorInput): number {
  let score = 0.1;

  if (input.shoppingBrain.purchaseIntent === "research") score += 0.35;
  if (input.shoppingBrain.purchaseIntent === "compare") score += 0.28;
  if (input.contextIntelligence.purchaseContext === "research") score += 0.32;
  if (input.contextIntelligence.purchaseContext === "comparison") score += 0.38;
  if (input.buyerModel.buyerType === "research_buyer") score += 0.3;
  if (affinityIncludes(input.buyerModel, "comparison") || affinityIncludes(input.buyerModel, "compare")) {
    score += 0.22;
  }
  if (input.contextIntelligence.purchaseContext === "bulk_purchase") score += 0.12;

  return clamp01(score);
}

function scoreUrgencyIntent(input: BuyerIntentVectorInput): number {
  let score = URGENCY_WEIGHT[input.contextIntelligence.urgencyContext] ?? 0.12;

  if (input.shoppingBrain.urgencyIntent === "high") score += 0.28;
  else if (input.shoppingBrain.urgencyIntent === "medium") score += 0.18;

  if (input.contextIntelligence.purchaseContext === "replacement") score += 0.22;
  if (input.contextIntelligence.urgencyContext === "emergency") score += 0.15;
  if (affinityIncludes(input.buyerModel, "replacement")) score += 0.12;

  return clamp01(score);
}

function applyBuyerTypeBoosts(
  vector: Omit<BuyerIntentVectorMeta, "version" | "dominantIntent" | "confidenceTier" | "confidence">,
  buyerType: UniversalBuyerType
): typeof vector {
  const out = { ...vector };

  if (buyerType === "gamer_buyer" || buyerType === "performance_buyer") {
    out.performanceIntent = Math.max(out.performanceIntent, 0.92);
    out.valueIntent = Math.min(out.valueIntent, 0.72);
  }
  if (buyerType === "premium_buyer") {
    out.premiumIntent = Math.max(out.premiumIntent, 0.95);
  }
  if (buyerType === "value_buyer") {
    out.valueIntent = Math.max(out.valueIntent, 0.68);
  }
  if (buyerType === "research_buyer") {
    out.researchIntent = Math.max(out.researchIntent, 0.55);
  }
  if (buyerType === "family_buyer") {
    out.convenienceIntent = Math.max(out.convenienceIntent, 0.35);
  }

  return out;
}

function resolveDominantIntent(
  vector: Omit<BuyerIntentVectorMeta, "version" | "dominantIntent" | "confidenceTier" | "confidence">,
  buyerType: UniversalBuyerType
): DominantBuyerIntent {
  if (
    (buyerType === "gamer_buyer" || buyerType === "performance_buyer") &&
    vector.performanceIntent >= vector.valueIntent
  ) {
    return "performance";
  }

  const ranked: { intent: DominantBuyerIntent; score: number }[] = [
    { intent: "value", score: vector.valueIntent },
    { intent: "premium", score: vector.premiumIntent },
    { intent: "performance", score: vector.performanceIntent },
    { intent: "convenience", score: vector.convenienceIntent },
    { intent: "research", score: vector.researchIntent },
    { intent: "urgency", score: vector.urgencyIntent },
  ];
  ranked.sort((a, b) => b.score - a.score);
  return ranked[0]?.intent ?? "research";
}

/** Build a normalized buyer intent vector from Phase 12.x signals. */
export function buildBuyerIntentVector(input: BuyerIntentVectorInput): BuyerIntentVectorMeta {
  const boosted = applyBuyerTypeBoosts(
    {
      valueIntent: scoreValueIntent(input),
      premiumIntent: scorePremiumIntent(input),
      performanceIntent: scorePerformanceIntent(input),
      convenienceIntent: scoreConvenienceIntent(input),
      researchIntent: scoreResearchIntent(input),
      urgencyIntent: scoreUrgencyIntent(input),
    },
    input.buyerModel.buyerType
  );

  const vector = {
    valueIntent: round2(boosted.valueIntent),
    premiumIntent: round2(boosted.premiumIntent),
    performanceIntent: round2(boosted.performanceIntent),
    convenienceIntent: round2(boosted.convenienceIntent),
    researchIntent: round2(boosted.researchIntent),
    urgencyIntent: round2(boosted.urgencyIntent),
  };

  return {
    version: VERSION,
    ...vector,
    dominantIntent: resolveDominantIntent(vector, input.buyerModel.buyerType),
    confidenceTier: input.buyerModel.confidenceTier,
    confidence: input.buyerModel.confidence,
  };
}
