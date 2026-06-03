/**
 * Phase 12.5 — Intent Confidence Engine.
 * Aggregates confidence quality across the Phase 12.x pre-search intelligence stack.
 * Meta-only, read-only — no tray, ranking, or upstream mutations.
 */

import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";

export type IntentConfidenceTier = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "UNCERTAIN";

export type IntentConfidenceMeta = {
  version: "phase12.5-v1";
  overallConfidence: number;
  categoryConfidence: number;
  tasteConfidence: number;
  lifestyleConfidence: number;
  contextConfidence: number;
  confidenceTier: IntentConfidenceTier;
};

export type IntentConfidenceInput = {
  query: string;
  shoppingBrain: ShoppingBrainMeta;
  multiCategory: MultiCategoryMeta;
  tasteIntelligence: TasteIntelligenceMeta;
  lifestyleIntelligence: LifestyleIntelligenceMeta;
  contextIntelligence: ContextIntelligenceMeta;
};

const VERSION = "phase12.5-v1" as const;

const VAGUE_QUERY_RX =
  /\b(something|anything|stuff|nice|good|decent|recommend\s+something|not\s+sure|whatever)\b/i;
const UNCERTAIN_QUERY_RX =
  /\b(help\s+me\s+(?:choose|decide|pick)|what\s+should\s+i\s+buy|no\s+idea|don't\s+know|dont\s+know|confused)\b/i;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function tokenCount(query: string): number {
  return query.trim().split(/\s+/).filter(Boolean).length;
}

function vaguenessPenalty(query: string): number {
  let penalty = 0;
  const tokens = tokenCount(query);

  if (tokens <= 2) penalty += 0.12;
  if (tokens <= 3 && VAGUE_QUERY_RX.test(query)) penalty += 0.22;
  if (/^something\s+nice$/i.test(query.trim())) penalty += 0.28;
  if (UNCERTAIN_QUERY_RX.test(query)) penalty += 0.38;

  return clamp01(penalty);
}

function generalIntentPenalty(input: IntentConfidenceInput): number {
  let penalty = 0;
  if (input.multiCategory.category === "general") penalty += 0.08;
  if (input.multiCategory.subcategory === "general") penalty += 0.05;
  if (input.multiCategory.subcategory === "gift") penalty += 0.02;
  if (input.shoppingBrain.categoryIntent === "general") penalty += 0.06;
  if (input.contextIntelligence.purchaseContext === "general") penalty += 0.07;
  if (input.lifestyleIntelligence.lifestyleIntent === "general") penalty += 0.05;
  return clamp01(penalty);
}

function giftBoost(input: IntentConfidenceInput): number {
  if (input.contextIntelligence.purchaseContext !== "gift") return 0;
  if (input.shoppingBrain.purchaseIntent === "gift") return 0.16;
  return 0.1;
}

function applyVagueFloors(query: string, overallConfidence: number): number {
  if (UNCERTAIN_QUERY_RX.test(query)) {
    return Math.min(overallConfidence, 0.35);
  }
  if (/^something\s+nice$/i.test(query.trim())) {
    return Math.max(0.44, Math.min(overallConfidence, 0.52));
  }
  if (VAGUE_QUERY_RX.test(query) && tokenCount(query) <= 3) {
    return Math.max(0.42, overallConfidence);
  }
  return overallConfidence;
}

function alignmentBoost(input: IntentConfidenceInput): number {
  let boost = 0;
  if (input.multiCategory.category !== "general" && input.multiCategory.confidence >= 0.88) {
    boost += 0.06;
  }
  if (input.shoppingBrain.categoryIntent !== "general" && input.multiCategory.category !== "general") {
    boost += 0.04;
  }
  if (
    input.contextIntelligence.purchaseContext !== "general" &&
    input.contextIntelligence.confidence >= 0.85
  ) {
    boost += 0.05;
  }
  if (input.lifestyleIntelligence.useCaseIntent !== "daily_use") {
    boost += 0.03;
  }
  return boost;
}

function tierFor(score: number, query: string): IntentConfidenceTier {
  if (UNCERTAIN_QUERY_RX.test(query)) return "UNCERTAIN";
  if (score >= 0.9) return "VERY_HIGH";
  if (score >= 0.76) return "HIGH";
  if (score >= 0.58) return "MEDIUM";
  if (score >= 0.42) return "LOW";
  return "UNCERTAIN";
}

/** Evaluate deterministic confidence across the Phase 12.x intelligence stack. */
export function buildIntentConfidence(input: IntentConfidenceInput): IntentConfidenceMeta {
  const categoryConfidence = round2(clamp01(input.multiCategory.confidence));
  const tasteConfidence = round2(clamp01(input.tasteIntelligence.confidence));
  const lifestyleConfidence = round2(clamp01(input.lifestyleIntelligence.confidence));
  const contextConfidence = round2(clamp01(input.contextIntelligence.confidence));
  const brainConfidence = round2(clamp01(input.shoppingBrain.confidence));

  let overallConfidence =
    brainConfidence * 0.14 +
    categoryConfidence * 0.26 +
    tasteConfidence * 0.14 +
    lifestyleConfidence * 0.2 +
    contextConfidence * 0.26;

  overallConfidence += alignmentBoost(input);
  overallConfidence += giftBoost(input);
  overallConfidence -= vaguenessPenalty(input.query);
  overallConfidence -= generalIntentPenalty(input);

  if (
    input.multiCategory.category === "electronics" &&
    input.multiCategory.confidence >= 0.9 &&
    input.contextIntelligence.confidence >= 0.85 &&
    vaguenessPenalty(input.query) < 0.1
  ) {
    overallConfidence = Math.max(overallConfidence, 0.9);
  }

  overallConfidence = applyVagueFloors(input.query, overallConfidence);
  overallConfidence = round2(clamp01(overallConfidence));
  const confidenceTier = tierFor(overallConfidence, input.query);

  return {
    version: VERSION,
    overallConfidence,
    categoryConfidence,
    tasteConfidence,
    lifestyleConfidence,
    contextConfidence,
    confidenceTier,
  };
}
