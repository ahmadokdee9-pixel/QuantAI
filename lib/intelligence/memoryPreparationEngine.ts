/**
 * Phase 12.6 — Memory Preparation Engine.
 * Builds a normalized buyer-profile snapshot from Phase 12.x signals for the current query only.
 * No persistence, no storage, no user history — meta-only, read-only.
 */

import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";

export type MemoryPreparationBuyerProfile = {
  categoryAffinity: string[];
  tasteProfile: string[];
  lifestyleProfile: string[];
  contextProfile: string[];
  confidenceTier: string;
};

export type MemoryPreparationMeta = {
  version: "phase12.6-v1";
  buyerProfile: MemoryPreparationBuyerProfile;
  readinessScore: number;
};

export type MemoryPreparationInput = {
  shoppingBrain: ShoppingBrainMeta;
  multiCategory: MultiCategoryMeta;
  tasteIntelligence: TasteIntelligenceMeta;
  lifestyleIntelligence: LifestyleIntelligenceMeta;
  contextIntelligence: ContextIntelligenceMeta;
  intentConfidence: IntentConfidenceMeta;
};

const VERSION = "phase12.6-v1" as const;

const GENERIC_TOKENS = new Set(["general", "other", "casual", "daily_use"]);

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pushUnique(out: string[], value: string | null | undefined): void {
  if (!value) return;
  const token = value.trim().toLowerCase();
  if (!token) return;
  if (!out.includes(token)) out.push(token);
}

function buildCategoryAffinity(
  shoppingBrain: ShoppingBrainMeta,
  multiCategory: MultiCategoryMeta
): string[] {
  const out: string[] = [];
  pushUnique(out, multiCategory.category);
  if (multiCategory.subcategory && multiCategory.subcategory !== multiCategory.category) {
    pushUnique(out, multiCategory.subcategory);
  }
  if (
    shoppingBrain.categoryIntent !== "general" &&
    shoppingBrain.categoryIntent !== multiCategory.category
  ) {
    pushUnique(out, shoppingBrain.categoryIntent);
  }
  return out.length ? out : ["general"];
}

function buildTasteProfile(
  shoppingBrain: ShoppingBrainMeta,
  tasteIntelligence: TasteIntelligenceMeta
): string[] {
  const out: string[] = [];
  pushUnique(out, tasteIntelligence.styleIntent);
  pushUnique(out, tasteIntelligence.aestheticIntent);
  pushUnique(out, tasteIntelligence.personalityIntent);
  if (shoppingBrain.valueIntent !== "balanced") pushUnique(out, shoppingBrain.valueIntent);
  if (shoppingBrain.qualityIntent !== "standard") pushUnique(out, shoppingBrain.qualityIntent);
  if (shoppingBrain.premiumIntent >= 0.55) pushUnique(out, "premium_affinity");
  return out.length ? out : ["casual"];
}

function buildLifestyleProfile(lifestyleIntelligence: LifestyleIntelligenceMeta): string[] {
  const out: string[] = [];
  pushUnique(out, lifestyleIntelligence.lifestyleIntent);
  pushUnique(out, lifestyleIntelligence.useCaseIntent);
  return out.length ? out : ["general"];
}

function buildContextProfile(
  shoppingBrain: ShoppingBrainMeta,
  contextIntelligence: ContextIntelligenceMeta
): string[] {
  const out: string[] = [];
  pushUnique(out, contextIntelligence.purchaseContext);
  pushUnique(out, contextIntelligence.urgencyContext);
  pushUnique(out, contextIntelligence.lifecycleContext);
  if (shoppingBrain.purchaseIntent !== "research") {
    pushUnique(out, shoppingBrain.purchaseIntent);
  }
  if (shoppingBrain.budgetIntent.active) pushUnique(out, "budget_constrained");
  return out.length ? out : ["general"];
}

function profileSpecificityScore(buyerProfile: MemoryPreparationBuyerProfile): number {
  const all = [
    ...buyerProfile.categoryAffinity,
    ...buyerProfile.tasteProfile,
    ...buyerProfile.lifestyleProfile,
    ...buyerProfile.contextProfile,
  ];
  if (all.length === 0) return 0;
  const specific = all.filter((token) => !GENERIC_TOKENS.has(token)).length;
  return clamp01(specific / Math.max(all.length, 1));
}

function computeReadinessScore(
  intentConfidence: IntentConfidenceMeta,
  buyerProfile: MemoryPreparationBuyerProfile
): number {
  const specificity = profileSpecificityScore(buyerProfile);
  let score = intentConfidence.overallConfidence * 0.72 + specificity * 0.28;

  if (intentConfidence.confidenceTier === "VERY_HIGH") score = Math.max(score, 0.9);
  if (intentConfidence.confidenceTier === "HIGH") score = Math.max(score, 0.78);
  if (intentConfidence.confidenceTier === "UNCERTAIN") score = Math.min(score, 0.35);

  return round2(clamp01(score));
}

/** Produce a deterministic buyer-profile snapshot for the current query only. */
export function buildMemoryPreparation(input: MemoryPreparationInput): MemoryPreparationMeta {
  const buyerProfile: MemoryPreparationBuyerProfile = {
    categoryAffinity: buildCategoryAffinity(input.shoppingBrain, input.multiCategory),
    tasteProfile: buildTasteProfile(input.shoppingBrain, input.tasteIntelligence),
    lifestyleProfile: buildLifestyleProfile(input.lifestyleIntelligence),
    contextProfile: buildContextProfile(input.shoppingBrain, input.contextIntelligence),
    confidenceTier: input.intentConfidence.confidenceTier,
  };

  return {
    version: VERSION,
    buyerProfile,
    readinessScore: computeReadinessScore(input.intentConfidence, buyerProfile),
  };
}
