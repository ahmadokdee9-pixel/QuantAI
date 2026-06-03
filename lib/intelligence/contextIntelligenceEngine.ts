/**
 * Phase 12.4 — Context Intelligence Engine.
 * Deterministic situational buying context from natural-language queries.
 * Extends Phase 12.0–12.3 pre-search signals — meta-only, read-only.
 */

import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";
import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";

export type PurchaseContext =
  | "first_purchase"
  | "upgrade"
  | "replacement"
  | "research"
  | "gift"
  | "comparison"
  | "bulk_purchase"
  | "subscription"
  | "general";

export type UrgencyContext = "low" | "medium" | "high" | "emergency";

export type LifecycleContext =
  | "new_user"
  | "active_user"
  | "power_user"
  | "professional"
  | "enterprise"
  | "general";

export type ContextIntelligenceMeta = {
  version: "phase12.4-v1";
  purchaseContext: PurchaseContext;
  urgencyContext: UrgencyContext;
  lifecycleContext: LifecycleContext;
  confidence: number;
};

export type ContextIntelligenceInput = {
  query: string;
  shoppingBrain: ShoppingBrainMeta;
  queryIntelligence: QueryIntelligenceMeta;
  multiCategory: MultiCategoryMeta;
  tasteIntelligence: TasteIntelligenceMeta;
  lifestyleIntelligence: LifestyleIntelligenceMeta;
};

const VERSION = "phase12.4-v1" as const;

type PurchaseRule = { context: PurchaseContext; rx: RegExp; weight: number };
type UrgencyRule = { context: UrgencyContext; rx: RegExp; weight: number };
type LifecycleRule = { context: LifecycleContext; rx: RegExp; weight: number };

const PURCHASE_RULES: PurchaseRule[] = [
  { context: "first_purchase", rx: /\b(first|my\s+first|starter|beginner|new\s+to|getting\s+started|first\s+time)\b/i, weight: 1.25 },
  { context: "first_purchase", rx: /\b(for\s+college|for\s+school|for\s+university|for\s+students?)\b/i, weight: 0.95 },
  { context: "upgrade", rx: /\b(upgrade|upgrading|step\s+up|better\s+than|newer\s+model|next\s+gen)\b/i, weight: 1.25 },
  { context: "replacement", rx: /\b(replace|replacement|instead\s+of|broken|dead|worn\s+out|failed|stopped\s+working)\b/i, weight: 1.25 },
  { context: "research", rx: /\b(best|top|recommend|recommended|which|what\s+is\s+the|review|reviews|compare\s+options)\b/i, weight: 0.9 },
  { context: "gift", rx: /\b(gift|present|for\s+(?:my\s+)?(?:father|dad|mother|mom|wife|husband|friend|brother|sister|son|daughter|birthday))\b/i, weight: 1.2 },
  { context: "comparison", rx: /\b(compare|comparison|versus|vs\.?|which\s+is\s+better|difference\s+between)\b/i, weight: 1.25 },
  { context: "bulk_purchase", rx: /\b(bulk|wholesale|for\s+company|for\s+office|for\s+team|for\s+staff|for\s+employees|multiple\s+units|dozen|pack\s+of\s+\d+)\b/i, weight: 1.2 },
  { context: "bulk_purchase", rx: /\b(buy\s+.+\s+for\s+company|office\s+chairs?\s+for\s+company)\b/i, weight: 1.05 },
  { context: "subscription", rx: /\b(subscription|subscribe|monthly\s+plan|annual\s+plan|membership|refill)\b/i, weight: 1.15 },
];

const URGENCY_RULES: UrgencyRule[] = [
  { context: "emergency", rx: /\b(emergency|asap|immediately|right\s+now|urgent\s+need|critical)\b/i, weight: 1.3 },
  { context: "high", rx: /\b(urgent|today|tonight|need\s+now|ship\s+fast|fast\s+delivery|same\s+day)\b/i, weight: 1.15 },
  { context: "medium", rx: /\b(soon|this\s+week|quickly|replace\s+broken|broken)\b/i, weight: 0.85 },
  { context: "low", rx: /\b(whenever|no\s+rush|research|compare|best|review)\b/i, weight: 0.75 },
];

const LIFECYCLE_RULES: LifecycleRule[] = [
  { context: "new_user", rx: /\b(first|my\s+first|starter|beginner|new\s+to|getting\s+started|college|school|student)\b/i, weight: 1.15 },
  { context: "active_user", rx: /\b(upgrade|replacement|daily\s+use|everyday|regular\s+use)\b/i, weight: 0.85 },
  { context: "power_user", rx: /\b(power\s+user|enthusiast|pro\s+user|advanced|high[\s-]?end|gaming|competitive)\b/i, weight: 1.1 },
  { context: "professional", rx: /\b(professional|work|office|business\s+use|creator|content\s+creator|filmmaker)\b/i, weight: 1.1 },
  { context: "enterprise", rx: /\b(company|corporate|enterprise|team|staff|employees|office\s+chairs?\s+for\s+company|bulk)\b/i, weight: 1.2 },
];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildEnvelope(input: ContextIntelligenceInput): string {
  const qi = input.queryIntelligence;
  return [
    input.query,
    qi.originalQuery,
    qi.detectedIntent.useCase?.replace(/_/g, " "),
    qi.detectedIntent.performanceIntent?.replace(/_/g, " "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scorePurchase(envelope: string, input: ContextIntelligenceInput): Map<PurchaseContext, number> {
  const scores = new Map<PurchaseContext, number>();

  for (const rule of PURCHASE_RULES) {
    if (rule.rx.test(envelope)) {
      scores.set(rule.context, (scores.get(rule.context) ?? 0) + rule.weight);
    }
  }

  const brain = input.shoppingBrain;
  if (brain.purchaseIntent === "gift") scores.set("gift", (scores.get("gift") ?? 0) + 1.1);
  if (brain.purchaseIntent === "replacement") scores.set("replacement", (scores.get("replacement") ?? 0) + 1.05);
  if (brain.purchaseIntent === "compare") scores.set("comparison", (scores.get("comparison") ?? 0) + 1.05);
  if (brain.purchaseIntent === "research") scores.set("research", (scores.get("research") ?? 0) + 0.75);
  if (
    brain.purchaseIntent === "compare" ||
    input.queryIntelligence.detectedIntent.comparisonIntent ||
    (input.queryIntelligence.compareEntities != null && input.queryIntelligence.compareEntities.length >= 2)
  ) {
    scores.set("comparison", (scores.get("comparison") ?? 0) + 1.1);
  }
  if (input.lifestyleIntelligence.useCaseIntent === "upgrade") {
    scores.set("upgrade", (scores.get("upgrade") ?? 0) + 1.05);
  }
  if (input.lifestyleIntelligence.useCaseIntent === "replacement") {
    scores.set("replacement", (scores.get("replacement") ?? 0) + 1.05);
  }
  if (input.lifestyleIntelligence.useCaseIntent === "gift") {
    scores.set("gift", (scores.get("gift") ?? 0) + 1.05);
  }

  return scores;
}

function scoreUrgency(envelope: string, input: ContextIntelligenceInput): Map<UrgencyContext, number> {
  const scores = new Map<UrgencyContext, number>();

  for (const rule of URGENCY_RULES) {
    if (rule.rx.test(envelope)) {
      scores.set(rule.context, (scores.get(rule.context) ?? 0) + rule.weight);
    }
  }

  if (input.shoppingBrain.urgencyIntent === "high") {
    scores.set("high", (scores.get("high") ?? 0) + 0.85);
    scores.set("emergency", (scores.get("emergency") ?? 0) + 0.35);
  } else if (input.shoppingBrain.urgencyIntent === "medium") {
    scores.set("medium", (scores.get("medium") ?? 0) + 0.75);
  } else {
    scores.set("low", (scores.get("low") ?? 0) + 0.45);
  }

  if (/\burgent\b/i.test(envelope) && !/\bemergency\b/i.test(envelope)) {
    scores.set("high", (scores.get("high") ?? 0) + 0.95);
  }

  return scores;
}

function scoreLifecycle(envelope: string, input: ContextIntelligenceInput): Map<LifecycleContext, number> {
  const scores = new Map<LifecycleContext, number>();

  for (const rule of LIFECYCLE_RULES) {
    if (rule.rx.test(envelope)) {
      scores.set(rule.context, (scores.get(rule.context) ?? 0) + rule.weight);
    }
  }

  if (input.lifestyleIntelligence.lifestyleIntent === "student") {
    scores.set("new_user", (scores.get("new_user") ?? 0) + 0.75);
  }
  if (input.lifestyleIntelligence.lifestyleIntent === "business") {
    scores.set("professional", (scores.get("professional") ?? 0) + 0.55);
    scores.set("enterprise", (scores.get("enterprise") ?? 0) + 0.35);
  }
  if (input.lifestyleIntelligence.lifestyleIntent === "professional") {
    scores.set("professional", (scores.get("professional") ?? 0) + 0.65);
  }
  if (input.lifestyleIntelligence.lifestyleIntent === "gamer") {
    scores.set("power_user", (scores.get("power_user") ?? 0) + 0.65);
  }
  if (input.lifestyleIntelligence.lifestyleIntent === "creator") {
    scores.set("professional", (scores.get("professional") ?? 0) + 0.55);
    scores.set("power_user", (scores.get("power_user") ?? 0) + 0.35);
  }
  if (input.tasteIntelligence.personalityIntent === "performance") {
    scores.set("power_user", (scores.get("power_user") ?? 0) + 0.45);
  }
  if (/\b(for\s+company|corporate|enterprise|employees|staff|team)\b/i.test(envelope)) {
    scores.set("enterprise", (scores.get("enterprise") ?? 0) + 0.95);
    scores.set("professional", Math.max(0, (scores.get("professional") ?? 0) - 0.4));
  }

  return scores;
}

function topContext<T extends string>(scores: Map<T, number>, fallback: T): { context: T; score: number } {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted[0] && sorted[0][1] > 0) return { context: sorted[0][0], score: sorted[0][1] };
  return { context: fallback, score: 0.2 };
}

function computeConfidence(
  purchaseScore: number,
  urgencyScore: number,
  lifecycleScore: number,
  purchaseContext: PurchaseContext,
  lifecycleContext: LifecycleContext
): number {
  let score = 0.38;
  score += Math.min(0.24, purchaseScore * 0.14);
  score += Math.min(0.18, urgencyScore * 0.12);
  score += Math.min(0.18, lifecycleScore * 0.12);
  if (purchaseScore >= 1.1) score = Math.max(score, 0.88);
  if (purchaseScore >= 1.2 && lifecycleScore >= 0.9) score = Math.max(score, 0.93);
  if (lifecycleContext === "professional" && lifecycleScore >= 1.0) score = Math.max(score, 0.85);
  if (purchaseContext === "general") score = Math.min(score, 0.65);
  return round2(clamp01(score));
}

/** Infer situational buying context from query + Phase 12.0–12.3 signals. */
export function buildContextIntelligence(input: ContextIntelligenceInput): ContextIntelligenceMeta {
  const envelope = buildEnvelope(input);
  const purchase = topContext(scorePurchase(envelope, input), "general");
  const urgency = topContext(scoreUrgency(envelope, input), "low");
  const lifecycle = topContext(scoreLifecycle(envelope, input), "general");
  const confidence = computeConfidence(
    purchase.score,
    urgency.score,
    lifecycle.score,
    purchase.context,
    lifecycle.context
  );

  return {
    version: VERSION,
    purchaseContext: purchase.context,
    urgencyContext: urgency.context,
    lifecycleContext: lifecycle.context,
    confidence,
  };
}
