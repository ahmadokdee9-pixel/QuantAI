/**
 * Phase 12.2 — Taste Intelligence Engine.
 * Deterministic aesthetic and style preference detection from natural-language queries.
 * Extends Phase 12.0/12.1 pre-search signals — meta-only, read-only.
 */

import type { MultiCategoryMeta } from "@/lib/intelligence/multiCategoryIntelligence";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";
import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";

export type TasteStyleSignal =
  | "minimal"
  | "modern"
  | "professional"
  | "executive"
  | "luxury"
  | "premium"
  | "gaming"
  | "sporty"
  | "family"
  | "creative"
  | "elegant"
  | "performance"
  | "business"
  | "casual";

export type TasteAestheticSignal =
  | "modern"
  | "luxury"
  | "sporty"
  | "casual"
  | "creative"
  | "minimal"
  | "professional";

export type TastePersonalitySignal =
  | "business"
  | "performance"
  | "family"
  | "creative"
  | "casual"
  | "executive";

export type TasteIntelligenceMeta = {
  version: "phase12.2-v1";
  styleIntent: TasteStyleSignal;
  aestheticIntent: TasteAestheticSignal;
  personalityIntent: TastePersonalitySignal;
  premiumAffinity: number;
  confidence: number;
};

export type TasteIntelligenceInput = {
  query: string;
  shoppingBrain: ShoppingBrainMeta;
  queryIntelligence: QueryIntelligenceMeta;
  multiCategory: MultiCategoryMeta;
};

const VERSION = "phase12.2-v1" as const;

type StyleRule = { style: TasteStyleSignal; rx: RegExp; weight: number };

const STYLE_RULES: StyleRule[] = [
  { style: "minimal", rx: /\b(minimal|minimalist|clean\s+lines|simple\s+design|bare\s+bones|uncluttered)\b/i, weight: 1.25 },
  { style: "modern", rx: /\b(modern|contemporary|sleek|streamlined|mid[\s-]?century)\b/i, weight: 1.1 },
  { style: "professional", rx: /\b(professional|pro[\s-]?grade|workplace|office[\s-]?grade)\b/i, weight: 1.15 },
  { style: "executive", rx: /\b(executive|c[\s-]?suite|boardroom|corner\s+office)\b/i, weight: 1.2 },
  { style: "luxury", rx: /\b(luxury|luxurious|designer|haute|high[\s-]?fashion|bespoke)\b/i, weight: 1.25 },
  { style: "premium", rx: /\b(premium|high[\s-]?end|top[\s-]?tier|flagship|upscale)\b/i, weight: 1.1 },
  { style: "gaming", rx: /\b(gaming|gamer|rgb|esports|mechanical\s+gaming)\b/i, weight: 1.2 },
  { style: "sporty", rx: /\b(sporty|athletic|sport|activewear|performance\s+wear)\b/i, weight: 1.1 },
  { style: "family", rx: /\b(family|kid[\s-]?friendly|children|parenting|nursery)\b/i, weight: 1.1 },
  { style: "creative", rx: /\b(creative|artistic|creator|designer|studio|maker)\b/i, weight: 1.1 },
  { style: "elegant", rx: /\b(elegant|elegance|sophisticated|classy|refined|chic)\b/i, weight: 1.2 },
  { style: "performance", rx: /\b(performance|high[\s-]?performance|power\s+user|enthusiast)\b/i, weight: 1.05 },
  { style: "business", rx: /\b(business|corporate|enterprise|commercial)\b/i, weight: 1.05 },
  { style: "casual", rx: /\b(casual|everyday|relaxed|laid[\s-]?back|basic)\b/i, weight: 0.85 },
];

const AESTHETIC_BY_STYLE: Partial<Record<TasteStyleSignal, TasteAestheticSignal>> = {
  minimal: "minimal",
  modern: "modern",
  professional: "professional",
  executive: "professional",
  luxury: "luxury",
  premium: "luxury",
  gaming: "modern",
  sporty: "sporty",
  family: "casual",
  creative: "creative",
  elegant: "luxury",
  performance: "modern",
  business: "professional",
  casual: "casual",
};

const PERSONALITY_BY_STYLE: Partial<Record<TasteStyleSignal, TastePersonalitySignal>> = {
  professional: "business",
  executive: "executive",
  business: "business",
  gaming: "performance",
  sporty: "performance",
  performance: "performance",
  family: "family",
  creative: "creative",
  casual: "casual",
  luxury: "executive",
  elegant: "executive",
  premium: "business",
  minimal: "business",
  modern: "casual",
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildEnvelope(input: TasteIntelligenceInput): string {
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

function scoreStyles(envelope: string, input: TasteIntelligenceInput): Map<TasteStyleSignal, number> {
  const scores = new Map<TasteStyleSignal, number>();

  for (const rule of STYLE_RULES) {
    if (rule.rx.test(envelope)) {
      scores.set(rule.style, (scores.get(rule.style) ?? 0) + rule.weight);
    }
  }

  if (input.shoppingBrain.purchaseIntent === "premium" || input.shoppingBrain.valueIntent === "premium") {
    scores.set("premium", (scores.get("premium") ?? 0) + 0.55);
    scores.set("luxury", (scores.get("luxury") ?? 0) + 0.35);
  }
  if (input.shoppingBrain.qualityIntent === "luxury") {
    scores.set("luxury", (scores.get("luxury") ?? 0) + 0.65);
  }
  if (input.multiCategory.category === "office") {
    scores.set("professional", (scores.get("professional") ?? 0) + 0.35);
    scores.set("business", (scores.get("business") ?? 0) + 0.25);
  }
  if (input.multiCategory.category === "sports") {
    scores.set("sporty", (scores.get("sporty") ?? 0) + 0.45);
  }

  return scores;
}

function topStyle(scores: Map<TasteStyleSignal, number>): { style: TasteStyleSignal; score: number } {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted[0]) return { style: sorted[0][0], score: sorted[0][1] };
  return { style: "casual", score: 0.2 };
}

function inferAestheticIntent(
  envelope: string,
  styleIntent: TasteStyleSignal
): TasteAestheticSignal {
  if (styleIntent === "minimal") return "modern";
  if (/\b(luxury|luxurious|designer|elegant|premium|haute)\b/i.test(envelope)) return "luxury";
  if (/\b(modern|contemporary|sleek)\b/i.test(envelope)) return "modern";
  if (/\b(sporty|athletic|sport)\b/i.test(envelope)) return "sporty";
  if (/\b(creative|artistic|creator)\b/i.test(envelope)) return "creative";
  if (/\b(professional|business|office)\b/i.test(envelope)) return "professional";
  return AESTHETIC_BY_STYLE[styleIntent] ?? "casual";
}

function inferPersonalityIntent(
  envelope: string,
  styleIntent: TasteStyleSignal
): TastePersonalitySignal {
  if (/\b(business|corporate|professional|office)\b/i.test(envelope)) return "business";
  if (/\b(executive|boardroom)\b/i.test(envelope)) return "executive";
  if (/\b(gaming|performance|sporty|athletic|esports)\b/i.test(envelope)) return "performance";
  if (/\b(family|kid|children)\b/i.test(envelope)) return "family";
  if (/\b(creative|artistic|creator|designer)\b/i.test(envelope)) return "creative";
  return PERSONALITY_BY_STYLE[styleIntent] ?? "casual";
}

function inferPremiumAffinity(
  envelope: string,
  styleIntent: TasteStyleSignal,
  input: TasteIntelligenceInput
): number {
  let score = input.shoppingBrain.premiumIntent;

  if (styleIntent === "luxury") score = Math.max(score, 1);
  else if (styleIntent === "premium" || styleIntent === "elegant" || styleIntent === "executive") {
    score = Math.max(score, 0.88);
  } else if (/\b(luxury|designer|haute|bespoke)\b/i.test(envelope)) {
    score = Math.max(score, 0.95);
  } else if (/\b(premium|high[\s-]?end|flagship)\b/i.test(envelope)) {
    score = Math.max(score, 0.82);
  }

  if (/\b(cheap|budget|affordable)\b/i.test(envelope) && styleIntent !== "luxury") {
    score = Math.min(score, 0.35);
  }
  if (input.shoppingBrain.valueIntent === "savings") {
    score = Math.min(score, 0.45);
  }

  return round2(clamp01(score));
}

function computeConfidence(styleScore: number, envelope: string, styleIntent: TasteStyleSignal): number {
  let score = 0.42 + Math.min(0.35, styleScore * 0.18);
  if (new RegExp(`\\b${styleIntent}\\b`, "i").test(envelope)) score += 0.18;
  if (styleScore >= 1.15) score = Math.max(score, 0.92);
  if (styleScore >= 1.25) score = Math.max(score, 1);
  return round2(clamp01(score));
}

/** Detect aesthetic and style preferences from query + Phase 12.0/12.1 signals. */
export function buildTasteIntelligence(input: TasteIntelligenceInput): TasteIntelligenceMeta {
  const envelope = buildEnvelope(input);
  const styleScores = scoreStyles(envelope, input);
  const { style: styleIntent, score: styleScore } = topStyle(styleScores);
  const aestheticIntent = inferAestheticIntent(envelope, styleIntent);
  const personalityIntent = inferPersonalityIntent(envelope, styleIntent);
  const premiumAffinity = inferPremiumAffinity(envelope, styleIntent, input);
  const confidence = computeConfidence(styleScore, envelope, styleIntent);

  return {
    version: VERSION,
    styleIntent,
    aestheticIntent,
    personalityIntent,
    premiumAffinity,
    confidence,
  };
}
