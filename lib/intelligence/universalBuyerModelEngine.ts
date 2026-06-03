/**
 * Phase 12.7 — Universal Buyer Model Engine.
 * Synthesizes Phase 12.1–12.6 signals into a single normalized buyer model snapshot.
 * Meta-only, read-only — no persistence, no tray or ranking mutations.
 */

import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { IntentConfidenceMeta } from "@/lib/intelligence/intentConfidenceEngine";
import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { MemoryPreparationMeta } from "@/lib/intelligence/memoryPreparationEngine";
import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";

export type UniversalBuyerType =
  | "performance_buyer"
  | "premium_buyer"
  | "value_buyer"
  | "business_buyer"
  | "creator_buyer"
  | "family_buyer"
  | "student_buyer"
  | "professional_buyer"
  | "gamer_buyer"
  | "research_buyer"
  | "general_buyer";

export type UniversalBuyerModelMeta = {
  version: "phase12.7-v1";
  buyerType: UniversalBuyerType;
  categoryAffinity: string[];
  tasteAffinity: string[];
  lifestyleAffinity: string[];
  contextAffinity: string[];
  confidenceTier: string;
  readinessScore: number;
  confidence: number;
};

export type UniversalBuyerModelInput = {
  shoppingBrain: ShoppingBrainMeta;
  multiCategory: MultiCategoryMeta;
  tasteIntelligence: TasteIntelligenceMeta;
  lifestyleIntelligence: LifestyleIntelligenceMeta;
  contextIntelligence: ContextIntelligenceMeta;
  intentConfidence: IntentConfidenceMeta;
  memoryPreparation: MemoryPreparationMeta;
};

const VERSION = "phase12.7-v1" as const;

const GENERIC_AFFINITY = new Set([
  "general",
  "other",
  "casual",
  "daily_use",
  "low",
  "balanced",
  "standard",
  "medium",
]);

const CONTEXT_NOISE = new Set(["low", "medium", "high", "emergency", "general", "active_user"]);

type BuyerTypeRule = { type: UniversalBuyerType; score: (input: UniversalBuyerModelInput) => number };

const BUYER_TYPE_RULES: BuyerTypeRule[] = [
  {
    type: "gamer_buyer",
    score: (input) => {
      let s = 0;
      if (input.lifestyleIntelligence.lifestyleIntent === "gamer") s += 1.2;
      if (input.tasteIntelligence.styleIntent === "gaming") s += 1.1;
      if (input.tasteIntelligence.personalityIntent === "performance") s += 0.55;
      if (input.memoryPreparation.buyerProfile.lifestyleProfile.includes("gamer")) s += 0.45;
      if (/\bgaming\b/i.test(input.memoryPreparation.buyerProfile.tasteProfile.join(" "))) s += 0.35;
      return s;
    },
  },
  {
    type: "student_buyer",
    score: (input) => {
      let s = 0;
      if (input.lifestyleIntelligence.lifestyleIntent === "student") s += 1.2;
      if (input.lifestyleIntelligence.useCaseIntent === "study") s += 1.0;
      if (input.contextIntelligence.lifecycleContext === "new_user") s += 0.45;
      return s;
    },
  },
  {
    type: "premium_buyer",
    score: (input) => {
      let s = 0;
      if (input.shoppingBrain.valueIntent === "premium" || input.shoppingBrain.purchaseIntent === "premium") s += 1.0;
      if (input.tasteIntelligence.styleIntent === "premium" || input.tasteIntelligence.styleIntent === "luxury") {
        s += 1.05;
      }
      if (input.tasteIntelligence.premiumAffinity >= 0.75) s += 0.65;
      if (input.lifestyleIntelligence.lifestyleIntent === "luxury_buyer") s += 0.55;
      return s;
    },
  },
  {
    type: "value_buyer",
    score: (input) => {
      let s = 0;
      if (input.shoppingBrain.valueIntent === "savings" || input.shoppingBrain.purchaseIntent === "best_value") {
        s += 1.05;
      }
      if (input.lifestyleIntelligence.lifestyleIntent === "budget_buyer") s += 0.95;
      if (input.shoppingBrain.budgetIntent.active) s += 0.55;
      if (input.memoryPreparation.buyerProfile.contextProfile.includes("budget_constrained")) s += 0.35;
      return s;
    },
  },
  {
    type: "business_buyer",
    score: (input) => {
      let s = 0;
      if (input.lifestyleIntelligence.lifestyleIntent === "business") s += 1.05;
      if (input.multiCategory.category === "office") s += 0.85;
      if (input.tasteIntelligence.personalityIntent === "business") s += 0.65;
      if (input.contextIntelligence.lifecycleContext === "enterprise") s += 0.75;
      if (input.contextIntelligence.purchaseContext === "bulk_purchase") s += 0.55;
      return s;
    },
  },
  {
    type: "creator_buyer",
    score: (input) => {
      let s = 0;
      if (input.lifestyleIntelligence.lifestyleIntent === "creator") s += 1.2;
      if (input.lifestyleIntelligence.useCaseIntent === "creative_work") s += 1.0;
      if (input.tasteIntelligence.personalityIntent === "creative") s += 0.55;
      return s;
    },
  },
  {
    type: "family_buyer",
    score: (input) => {
      let s = 0;
      if (input.lifestyleIntelligence.lifestyleIntent === "parent") s += 1.1;
      if (input.lifestyleIntelligence.useCaseIntent === "family") s += 1.0;
      if (input.contextIntelligence.purchaseContext === "gift") s += 0.85;
      if (input.shoppingBrain.purchaseIntent === "gift") s += 0.75;
      return s;
    },
  },
  {
    type: "professional_buyer",
    score: (input) => {
      let s = 0;
      if (input.lifestyleIntelligence.lifestyleIntent === "professional") s += 1.0;
      if (input.contextIntelligence.lifecycleContext === "professional") s += 0.85;
      if (input.tasteIntelligence.styleIntent === "professional") s += 0.75;
      if (input.lifestyleIntelligence.useCaseIntent === "work") s += 0.65;
      return s;
    },
  },
  {
    type: "performance_buyer",
    score: (input) => {
      let s = 0;
      if (input.tasteIntelligence.styleIntent === "performance") s += 1.0;
      if (input.tasteIntelligence.personalityIntent === "performance") s += 0.85;
      if (input.contextIntelligence.lifecycleContext === "power_user") s += 0.65;
      if (input.lifestyleIntelligence.lifestyleIntent === "fitness") s += 0.45;
      return s;
    },
  },
  {
    type: "research_buyer",
    score: (input) => {
      let s = 0;
      if (input.contextIntelligence.purchaseContext === "comparison") s += 1.15;
      if (input.contextIntelligence.purchaseContext === "research") s += 0.95;
      if (input.shoppingBrain.purchaseIntent === "compare") s += 0.85;
      if (input.shoppingBrain.purchaseIntent === "research") s += 0.55;
      return s;
    },
  },
];

function extractAffinity(tokens: string[], limit = 4, exclude = GENERIC_AFFINITY): string[] {
  const out: string[] = [];
  for (const token of tokens) {
    const t = token.trim().toLowerCase();
    if (!t || out.includes(t)) continue;
    if (exclude.has(t)) continue;
    out.push(t);
    if (out.length >= limit) break;
  }
  if (out.length === 0) {
    const fallback = tokens.find((token) => token.trim().length > 0);
    if (fallback) out.push(fallback.trim().toLowerCase());
  }
  return out;
}

function buildTasteAffinity(input: UniversalBuyerModelInput): string[] {
  const candidates = [
    input.tasteIntelligence.styleIntent,
    input.tasteIntelligence.personalityIntent,
    ...input.memoryPreparation.buyerProfile.tasteProfile,
  ];
  const filtered = extractAffinity(candidates, 4);
  if (input.tasteIntelligence.styleIntent === "gaming" && !filtered.includes("performance")) {
    if (input.tasteIntelligence.personalityIntent === "performance") {
      filtered.push("performance");
    }
  }
  return [...new Set(filtered)].slice(0, 4);
}

function buildContextAffinity(input: UniversalBuyerModelInput): string[] {
  const candidates = [
    input.contextIntelligence.purchaseContext,
    input.contextIntelligence.lifecycleContext,
    input.shoppingBrain.purchaseIntent,
    ...input.memoryPreparation.buyerProfile.contextProfile,
  ];
  return extractAffinity(candidates, 4, new Set([...GENERIC_AFFINITY, ...CONTEXT_NOISE]));
}

function buildLifestyleAffinity(input: UniversalBuyerModelInput): string[] {
  return extractAffinity(
    [
      input.lifestyleIntelligence.lifestyleIntent,
      input.lifestyleIntelligence.useCaseIntent,
      ...input.memoryPreparation.buyerProfile.lifestyleProfile,
    ],
    3
  );
}

function inferBuyerType(input: UniversalBuyerModelInput): UniversalBuyerType {
  const scored = BUYER_TYPE_RULES.map(({ type, score }) => ({ type, score: score(input) }));
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  if (!winner || winner.score < 0.55) return "general_buyer";
  return winner.type;
}

/** Synthesize a universal buyer model from Phase 12.1–12.6 intelligence signals. */
export function buildUniversalBuyerModel(input: UniversalBuyerModelInput): UniversalBuyerModelMeta {
  const profile = input.memoryPreparation.buyerProfile;

  return {
    version: VERSION,
    buyerType: inferBuyerType(input),
    categoryAffinity: extractAffinity(profile.categoryAffinity, 4, new Set(["general", "other"])),
    tasteAffinity: buildTasteAffinity(input),
    lifestyleAffinity: buildLifestyleAffinity(input),
    contextAffinity: buildContextAffinity(input),
    confidenceTier: profile.confidenceTier,
    readinessScore: input.memoryPreparation.readinessScore,
    confidence: input.intentConfidence.overallConfidence,
  };
}
