/**
 * Phase 12.3 — Lifestyle Intelligence Engine.
 * Deterministic lifestyle persona and use-case detection from natural-language queries.
 * Extends Phase 12.0–12.2 pre-search signals — meta-only, read-only.
 */

import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";
import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";

export type LifestyleIntent =
  | "student"
  | "professional"
  | "business"
  | "creator"
  | "gamer"
  | "traveler"
  | "parent"
  | "fitness"
  | "home_owner"
  | "outdoor"
  | "luxury_buyer"
  | "budget_buyer"
  | "general";

export type UseCaseIntent =
  | "work"
  | "study"
  | "gaming"
  | "travel"
  | "home"
  | "sport"
  | "creative_work"
  | "family"
  | "daily_use"
  | "gift"
  | "upgrade"
  | "replacement";

export type LifestyleIntelligenceMeta = {
  version: "phase12.3-v1";
  lifestyleIntent: LifestyleIntent;
  useCaseIntent: UseCaseIntent;
  confidence: number;
};

export type LifestyleIntelligenceInput = {
  query: string;
  shoppingBrain: ShoppingBrainMeta;
  queryIntelligence: QueryIntelligenceMeta;
  multiCategory: MultiCategoryMeta;
  tasteIntelligence: TasteIntelligenceMeta;
};

const VERSION = "phase12.3-v1" as const;

type LifestyleRule = { intent: LifestyleIntent; rx: RegExp; weight: number };
type UseCaseRule = { intent: UseCaseIntent; rx: RegExp; weight: number };

const LIFESTYLE_RULES: LifestyleRule[] = [
  { intent: "student", rx: /\b(student|students|college|university|school|campus|dorm|undergrad|high\s+school|for\s+students?)\b/i, weight: 1.25 },
  { intent: "gamer", rx: /\b(gamer|gaming|esports|competitive\s+fps|fps\s+gaming|rgb\s+setup)\b/i, weight: 1.25 },
  { intent: "creator", rx: /\b(content\s+creator|creator|youtuber|streamer|vlogger|influencer|filmmaker|photography\s+work)\b/i, weight: 1.2 },
  { intent: "traveler", rx: /\b(travel|traveler|traveller|digital\s+nomad|backpacking|commute|carry[\s-]?on|luggage)\b/i, weight: 1.2 },
  { intent: "parent", rx: /\b(parent|parents|kids|kid|children|child|toddler|baby|family\s+safe|child[\s-]?safe)\b/i, weight: 1.2 },
  { intent: "fitness", rx: /\b(fitness|marathon|training|gym|workout|running|yoga|crossfit|athlete|sport)\b/i, weight: 1.15 },
  { intent: "outdoor", rx: /\b(outdoor|camping|hiking|trail|backcountry|climbing|fishing|hunting)\b/i, weight: 1.1 },
  { intent: "business", rx: /\b(business|corporate|enterprise|workspace|office\s+workspace|startup)\b/i, weight: 1.15 },
  { intent: "professional", rx: /\b(professional|work\s+from\s+home|remote\s+work|office\s+worker|executive)\b/i, weight: 1.05 },
  { intent: "home_owner", rx: /\b(home\s+owner|apartment|condo|house|small\s+apartment|living\s+room|household)\b/i, weight: 1.1 },
  { intent: "luxury_buyer", rx: /\b(luxury|premium|designer|high[\s-]?end|flagship|bespoke)\b/i, weight: 1.1 },
  { intent: "budget_buyer", rx: /\b(cheap|budget|affordable|under\s+\$?\d|best\s+value|low\s+cost|inexpensive)\b/i, weight: 1.05 },
];

const USE_CASE_RULES: UseCaseRule[] = [
  { intent: "study", rx: /\b(study|studying|student|students|school|college|university|homework|coursework|exam|for\s+students?)\b/i, weight: 1.2 },
  { intent: "gaming", rx: /\b(gaming|gamer|fps|esports|gameplay|steam|xbox|playstation|ps5)\b/i, weight: 1.25 },
  { intent: "travel", rx: /\b(travel|backpack|digital\s+nomad|commute|trip|flight|carry[\s-]?on|luggage)\b/i, weight: 1.2 },
  { intent: "work", rx: /\b(work|office|business|workspace|professional|remote\s+work|productivity)\b/i, weight: 1.15 },
  { intent: "sport", rx: /\b(marathon|running|training|fitness|gym|workout|sport|athletic|soccer|tennis)\b/i, weight: 1.15 },
  { intent: "family", rx: /\b(kids|kid|children|child|family|parent|toddler|baby|child[\s-]?safe|safe\s+for\s+kids)\b/i, weight: 1.2 },
  { intent: "creative_work", rx: /\b(content\s+creator|creator|youtube|streaming|vlog|photo|video\s+edit|filmmaker)\b/i, weight: 1.2 },
  { intent: "home", rx: /\b(home|apartment|house|household|cleaning|vacuum|kitchen|living\s+room|small\s+apartment)\b/i, weight: 1.05 },
  { intent: "gift", rx: /\b(gift|present|for\s+(?:my\s+)?(?:father|dad|mother|mom|wife|husband|friend))\b/i, weight: 1.15 },
  { intent: "upgrade", rx: /\b(upgrade|upgrading|better\s+than|step\s+up|newer\s+model)\b/i, weight: 1.05 },
  { intent: "replacement", rx: /\b(replace|replacement|instead\s+of|old\s+\w+|broken|worn\s+out)\b/i, weight: 1.1 },
  { intent: "daily_use", rx: /\b(everyday|daily|general\s+use|all[\s-]?purpose|basic\s+use)\b/i, weight: 0.85 },
];

const LIFESTYLE_BY_USE_CASE: Partial<Record<UseCaseIntent, LifestyleIntent>> = {
  study: "student",
  gaming: "gamer",
  travel: "traveler",
  family: "parent",
  creative_work: "creator",
  sport: "fitness",
  work: "professional",
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildEnvelope(input: LifestyleIntelligenceInput): string {
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

function scoreLifestyles(envelope: string, input: LifestyleIntelligenceInput): Map<LifestyleIntent, number> {
  const scores = new Map<LifestyleIntent, number>();

  for (const rule of LIFESTYLE_RULES) {
    if (rule.rx.test(envelope)) {
      scores.set(rule.intent, (scores.get(rule.intent) ?? 0) + rule.weight);
    }
  }

  if (input.shoppingBrain.purchaseIntent === "gift") {
    scores.set("general", (scores.get("general") ?? 0) + 0.35);
  }
  if (input.shoppingBrain.purchaseIntent === "replacement") {
    scores.set("home_owner", (scores.get("home_owner") ?? 0) + 0.25);
  }
  if (input.shoppingBrain.valueIntent === "savings" || input.shoppingBrain.purchaseIntent === "best_value") {
    scores.set("budget_buyer", (scores.get("budget_buyer") ?? 0) + 0.55);
  }
  if (input.shoppingBrain.valueIntent === "premium" || input.tasteIntelligence.premiumAffinity >= 0.75) {
    scores.set("luxury_buyer", (scores.get("luxury_buyer") ?? 0) + 0.55);
  }
  if (/\bpremium\b/i.test(envelope) && /\b(business|office|workspace|professional)\b/i.test(envelope)) {
    scores.set("business", (scores.get("business") ?? 0) + 0.75);
    scores.set("luxury_buyer", Math.max(0, (scores.get("luxury_buyer") ?? 0) - 0.35));
  }
  if (input.tasteIntelligence.styleIntent === "gaming") {
    scores.set("gamer", (scores.get("gamer") ?? 0) + 0.65);
  }
  if (input.tasteIntelligence.personalityIntent === "family") {
    scores.set("parent", (scores.get("parent") ?? 0) + 0.55);
  }
  if (input.tasteIntelligence.personalityIntent === "business" || input.tasteIntelligence.personalityIntent === "executive") {
    scores.set("business", (scores.get("business") ?? 0) + 0.45);
    scores.set("professional", (scores.get("professional") ?? 0) + 0.35);
  }
  if (input.multiCategory.category === "sports") {
    scores.set("fitness", (scores.get("fitness") ?? 0) + 0.45);
  }

  return scores;
}

function scoreUseCases(envelope: string, input: LifestyleIntelligenceInput): Map<UseCaseIntent, number> {
  const scores = new Map<UseCaseIntent, number>();

  for (const rule of USE_CASE_RULES) {
    if (rule.rx.test(envelope)) {
      scores.set(rule.intent, (scores.get(rule.intent) ?? 0) + rule.weight);
    }
  }

  if (input.shoppingBrain.purchaseIntent === "gift") {
    scores.set("gift", (scores.get("gift") ?? 0) + 1.1);
  }
  if (input.shoppingBrain.purchaseIntent === "replacement") {
    scores.set("replacement", (scores.get("replacement") ?? 0) + 1.05);
  }
  if (input.shoppingBrain.purchaseIntent === "premium") {
    scores.set("work", (scores.get("work") ?? 0) + 0.25);
  }

  const useCase = input.queryIntelligence.detectedIntent.useCase?.replace(/_/g, " ");
  if (useCase) {
    if (/study|school|student/.test(useCase)) scores.set("study", (scores.get("study") ?? 0) + 0.55);
    if (/gaming|game/.test(useCase)) scores.set("gaming", (scores.get("gaming") ?? 0) + 0.55);
    if (/travel/.test(useCase)) scores.set("travel", (scores.get("travel") ?? 0) + 0.55);
    if (/work|office|business/.test(useCase)) scores.set("work", (scores.get("work") ?? 0) + 0.55);
    if (/fitness|sport|running/.test(useCase)) scores.set("sport", (scores.get("sport") ?? 0) + 0.55);
    if (/family|kids/.test(useCase)) scores.set("family", (scores.get("family") ?? 0) + 0.55);
    if (/creator|creative/.test(useCase)) scores.set("creative_work", (scores.get("creative_work") ?? 0) + 0.55);
  }

  return scores;
}

function topIntent<T extends string>(scores: Map<T, number>, fallback: T): { intent: T; score: number } {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted[0]) return { intent: sorted[0][0], score: sorted[0][1] };
  return { intent: fallback, score: 0.2 };
}

function alignLifestyleWithUseCase(
  lifestyle: LifestyleIntent,
  lifestyleScore: number,
  useCase: UseCaseIntent,
  lifestyleScores: Map<LifestyleIntent, number>
): { lifestyle: LifestyleIntent; score: number } {
  const mapped = LIFESTYLE_BY_USE_CASE[useCase];
  if (!mapped) return { lifestyle, score: lifestyleScore };

  const mappedScore = lifestyleScores.get(mapped) ?? 0;
  if (mappedScore + 0.15 >= lifestyleScore || lifestyle === "general") {
    return { lifestyle: mapped, score: Math.max(mappedScore, lifestyleScore) };
  }
  return { lifestyle, score: lifestyleScore };
}

function computeConfidence(
  lifestyleScore: number,
  useCaseScore: number,
  envelope: string,
  lifestyle: LifestyleIntent,
  useCase: UseCaseIntent
): number {
  let score = 0.4;
  score += Math.min(0.28, lifestyleScore * 0.16);
  score += Math.min(0.24, useCaseScore * 0.14);
  if (new RegExp(`\\b${lifestyle.replace(/_/g, "[\\s_-]")}\\b`, "i").test(envelope)) score += 0.06;
  if (lifestyleScore >= 1.1 && useCaseScore >= 1.0) score = Math.max(score, 0.88);
  if (lifestyleScore >= 1.2 && useCaseScore >= 1.15) score = Math.max(score, 0.93);
  if (lifestyle === "student" && useCase === "study") score = Math.max(score, 0.9);
  if (lifestyle === "general" && useCase === "daily_use") score = Math.min(score, 0.62);
  return round2(clamp01(score));
}

/** Detect lifestyle persona and use-case intent from query + Phase 12.0–12.2 signals. */
export function buildLifestyleIntelligence(input: LifestyleIntelligenceInput): LifestyleIntelligenceMeta {
  const envelope = buildEnvelope(input);
  const lifestyleScores = scoreLifestyles(envelope, input);
  const useCaseScores = scoreUseCases(envelope, input);
  const topUseCase = topIntent(useCaseScores, "daily_use");
  const topLifestyle = topIntent(lifestyleScores, "general");
  const aligned = alignLifestyleWithUseCase(
    topLifestyle.intent,
    topLifestyle.score,
    topUseCase.intent,
    lifestyleScores
  );
  const confidence = computeConfidence(
    aligned.score,
    topUseCase.score,
    envelope,
    aligned.lifestyle,
    topUseCase.intent
  );

  return {
    version: VERSION,
    lifestyleIntent: aligned.lifestyle,
    useCaseIntent: topUseCase.intent,
    confidence,
  };
}
