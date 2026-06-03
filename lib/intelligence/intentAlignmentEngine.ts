/**
 * Phase 10.6 — Intent Alignment Intelligence Engine.
 * Measures how well the primary recommendation matches interpreted shopping intent.
 * Read-only meta layer — no tray, verdict, or ranking mutations.
 */

import type { AlternativeIntelligenceMeta } from "@/lib/intelligence/alternativeIntelligenceEngine";
import type { CompetitiveIntelligenceMeta } from "@/lib/intelligence/competitiveIntelligenceEngine";
import type { ConfidenceIntelligenceMeta } from "@/lib/intelligence/confidenceEngine";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { ExplainabilityMeta } from "@/lib/intelligence/explainabilityEngine";
import type { MarketContextMeta } from "@/lib/intelligence/marketContextEngine";
import type { Phase95CommerceMemoryMeta } from "@/lib/intelligence/phase95CommerceMemory";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";
import type { QuantProduct } from "@/lib/shoppingScore";

export type IntentCategory =
  | "best_value"
  | "premium_quality"
  | "lowest_price"
  | "performance"
  | "gaming"
  | "business"
  | "professional"
  | "daily_use"
  | "travel"
  | "creator"
  | "photography"
  | "productivity";

export type IntentTier = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";

export type IntentAlignmentMeta = {
  version: "phase10.6-v1";
  intentScore: number;
  intentTier: IntentTier;
  primaryIntent: IntentCategory;
  supportingSignals: string[];
  conflicts: string[];
  summary: string;
};

export type IntentAlignmentInput = {
  products: QuantProduct[];
  decisionBrief: DecisionBriefDTO | null;
  queryIntelligence: QueryIntelligenceMeta;
  commerceMemory: Phase95CommerceMemoryMeta;
  verdictIntelligence: VerdictIntelligenceMeta;
  explainability: ExplainabilityMeta;
  alternativeIntelligence: AlternativeIntelligenceMeta;
  marketContext: MarketContextMeta;
  competitiveIntelligence: CompetitiveIntelligenceMeta;
  confidenceIntelligence: ConfidenceIntelligenceMeta;
};

const VERSION = "phase10.6-v1" as const;

const INTENT_LABELS: Record<IntentCategory, string> = {
  best_value: "Best value shopping intent",
  premium_quality: "Premium quality shopping intent",
  lowest_price: "Lowest price shopping intent",
  performance: "Performance-focused shopping intent",
  gaming: "Gaming shopping intent",
  business: "Business use shopping intent",
  professional: "Professional-grade shopping intent",
  daily_use: "Daily use shopping intent",
  travel: "Travel-friendly shopping intent",
  creator: "Creator workflow shopping intent",
  photography: "Photography shopping intent",
  productivity: "Productivity shopping intent",
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function tierFor(score: number): IntentTier {
  if (score >= 90) return "VERY_HIGH";
  if (score >= 75) return "HIGH";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "LOW";
  return "VERY_LOW";
}

function queryEnvelope(input: IntentAlignmentInput): string {
  return `${input.queryIntelligence.originalQuery} ${input.queryIntelligence.canonicalQuery}`.toLowerCase();
}

function detectPrimaryIntent(input: IntentAlignmentInput): IntentCategory {
  const qi = input.queryIntelligence.detectedIntent;
  const mem = input.commerceMemory.preferenceSignals;
  const env = queryEnvelope(input);
  const perf = (qi.performanceIntent ?? "").toLowerCase();

  if (/\bbest\s+value\b/i.test(env) || qi.priceIntent === "value" || qi.priceIntent === "discount") {
    return "best_value";
  }
  if (qi.priceIntent === "budget" || mem.priceTier === "budget" || mem.budgetIntent01 >= 0.55) {
    return "lowest_price";
  }
  if (qi.priceIntent === "premium" || mem.priceTier === "premium" || mem.premiumIntent01 >= 0.55) {
    return "premium_quality";
  }

  if (/\b(gaming|game|ps5|xbox|steam|esports)\b/i.test(env) || perf.includes("gaming")) {
    return "gaming";
  }
  if (/\b(photo|photography|camera|vlog|mirrorless|dslr)\b/i.test(env)) return "photography";
  if (/\b(creator|content\s+creat|youtube|streamer|streaming\s+setup)\b/i.test(env) || perf.includes("ai_training")) {
    return "creator";
  }
  if (/\b(business|enterprise|office\s+laptop|corporate)\b/i.test(env)) return "business";
  if (/\b(professional|pro\s+grade|studio\s+grade|workstation)\b/i.test(env)) return "professional";
  if (
    /\b(productivity|programming|developer|coding|office\s+work)\b/i.test(env) ||
    perf.includes("programming")
  ) {
    return "productivity";
  }
  if (/\b(travel|portable|compact|lightweight|carry\s+on)\b/i.test(env)) return "travel";
  if (perf && !perf.includes("programming")) return "performance";
  if (mem.priceTier === "value") return "best_value";
  if (/\b(daily|everyday|home\s+use|general\s+use)\b/i.test(env) || qi.useCase === "daily") {
    return "daily_use";
  }
  return "best_value";
}

function verdictAligns(intent: IntentCategory, verdict: VerdictIntelligenceMeta["verdict"]): number {
  switch (intent) {
    case "best_value":
    case "lowest_price":
      if (verdict === "BEST VALUE" || verdict === "STRONG BUY") return 12;
      if (verdict === "BUY READY") return 8;
      if (verdict === "PREMIUM PICK") return -6;
      break;
    case "premium_quality":
    case "professional":
    case "creator":
    case "photography":
      if (verdict === "PREMIUM PICK" || verdict === "STRONG BUY") return 12;
      if (verdict === "BUY READY") return 6;
      if (verdict === "BEST VALUE") return 2;
      break;
    case "gaming":
    case "performance":
    case "productivity":
    case "business":
      if (verdict === "STRONG BUY" || verdict === "BUY READY" || verdict === "BEST VALUE") return 8;
      break;
    default:
      if (verdict === "STRONG BUY" || verdict === "BUY READY" || verdict === "BEST VALUE") return 6;
  }
  if (verdict === "WAIT" || verdict === "AVOID") return -14;
  if (verdict === "CONSIDER") return -4;
  return 0;
}

function computeIntentMatch(input: IntentAlignmentInput, intent: IntentCategory): number {
  const basis = input.explainability.recommendationBasis;
  let score = basis.intentMatch;
  score += Math.round(input.queryIntelligence.confidence * 0.12);
  score += Math.round(input.commerceMemory.confidence * 8);
  score += verdictAligns(intent, input.verdictIntelligence.verdict);
  if (input.competitiveIntelligence.primaryProduct.link) score += 4;
  return clamp(Math.round(score), 0, 100);
}

function computeValueFit(input: IntentAlignmentInput, intent: IntentCategory): number {
  const basis = input.explainability.recommendationBasis;
  const mc = input.marketContext;
  let score = Math.round(basis.pricing * 0.45 + mc.pricingAssessment.strength * 0.35 + mc.confidence * 0.2);

  if (intent === "best_value" || intent === "lowest_price") {
    if (input.verdictIntelligence.verdict === "BEST VALUE") score += 12;
    if (mc.marketStatus === "BUY_NOW" || mc.marketStatus === "GOOD_OPPORTUNITY") score += 8;
    if (input.competitiveIntelligence.primaryAdvantages.some((a) => /value|price|discount/i.test(a))) {
      score += 6;
    }
  } else if (intent === "premium_quality" || intent === "professional") {
    score = Math.round(basis.pricing * 0.25 + basis.trust * 0.45 + basis.retailer * 0.3);
  } else {
    score = Math.round((score + basis.pricing) / 2);
  }

  if (mc.marketStatus === "OVERPRICED" && (intent === "best_value" || intent === "lowest_price")) {
    score -= 14;
  }

  return clamp(Math.round(score), 0, 100);
}

function computeQualityFit(input: IntentAlignmentInput, intent: IntentCategory): number {
  const basis = input.explainability.recommendationBasis;
  let score = Math.round(basis.trust * 0.5 + basis.retailer * 0.3 + input.confidenceIntelligence.trustQuality * 0.2);

  if (["premium_quality", "professional", "creator", "photography", "business"].includes(intent)) {
    if (input.verdictIntelligence.verdict === "PREMIUM PICK") score += 12;
    if (input.verdictIntelligence.verdict === "STRONG BUY") score += 8;
    if (basis.trust >= 75) score += 6;
  } else if (intent === "gaming" || intent === "performance") {
    if (input.verdictIntelligence.verdict === "STRONG BUY" || input.verdictIntelligence.verdict === "BUY READY") {
      score += 8;
    }
  }

  return clamp(Math.round(score), 0, 100);
}

function computePriceFit(input: IntentAlignmentInput, intent: IntentCategory): number {
  const mc = input.marketContext;
  const budget = input.queryIntelligence.constraints.budget;
  const pickPrice = input.competitiveIntelligence.primaryProduct.price ?? input.decisionBrief?.recommendation.price ?? null;

  let score = Math.round(mc.pricingAssessment.strength * 0.4 + mc.pricingAssessment.confidence * 0.35 + mc.confidence * 0.25);

  if (intent === "lowest_price" || intent === "best_value") {
    if (mc.marketStatus === "BUY_NOW" || mc.marketStatus === "GOOD_OPPORTUNITY") score += 10;
    if (mc.marketStatus === "OVERPRICED") score -= 16;
    if (budget.active && pickPrice != null && budget.maxPrice != null && pickPrice <= budget.maxPrice) {
      score += 10;
    } else if (budget.active && pickPrice != null && budget.maxPrice != null && pickPrice > budget.maxPrice) {
      score -= 18;
    }
  } else if (intent === "premium_quality" || intent === "professional") {
    if (mc.marketStatus === "FAIR_PRICE" || mc.marketStatus === "GOOD_OPPORTUNITY") score += 4;
    if (pickPrice != null && pickPrice > 0) score += 4;
  }

  return clamp(Math.round(score), 0, 100);
}

function computeCompetitiveFit(input: IntentAlignmentInput): number {
  const comp = input.competitiveIntelligence;
  const conf = input.confidenceIntelligence;
  let score = Math.round(
    comp.confidence * 0.35 +
      conf.recommendationReliability * 0.25 +
      (100 - conf.alternativePressure) * 0.25 +
      input.explainability.recommendationBasis.intentMatch * 0.15
  );

  if (comp.primaryAdvantages.length >= 2) score += 8;
  if (comp.alternativeAdvantages.length >= 2) score -= 10;
  if (input.alternativeIntelligence.count >= 2) score += 4;

  return clamp(Math.round(score), 0, 100);
}

function weightDimensions(
  intent: IntentCategory,
  dims: {
    intentMatch: number;
    valueFit: number;
    qualityFit: number;
    priceFit: number;
    competitiveFit: number;
  }
): number {
  const weights: Record<IntentCategory, [number, number, number, number, number]> = {
    best_value: [0.22, 0.28, 0.12, 0.24, 0.14],
    lowest_price: [0.18, 0.22, 0.1, 0.32, 0.18],
    premium_quality: [0.2, 0.1, 0.32, 0.14, 0.24],
    performance: [0.24, 0.14, 0.22, 0.14, 0.26],
    gaming: [0.22, 0.12, 0.24, 0.12, 0.3],
    business: [0.22, 0.16, 0.24, 0.16, 0.22],
    professional: [0.2, 0.12, 0.28, 0.14, 0.26],
    daily_use: [0.24, 0.2, 0.18, 0.18, 0.2],
    travel: [0.22, 0.18, 0.16, 0.2, 0.24],
    creator: [0.22, 0.14, 0.26, 0.12, 0.26],
    photography: [0.2, 0.12, 0.28, 0.12, 0.28],
    productivity: [0.24, 0.16, 0.22, 0.14, 0.24],
  };

  const w = weights[intent];
  return clamp(
    Math.round(
      dims.intentMatch * w[0]! +
        dims.valueFit * w[1]! +
        dims.qualityFit * w[2]! +
        dims.priceFit * w[3]! +
        dims.competitiveFit * w[4]!
    ),
    0,
    100
  );
}

function buildSupportingSignals(
  input: IntentAlignmentInput,
  intent: IntentCategory,
  dims: {
    intentMatch: number;
    valueFit: number;
    qualityFit: number;
    priceFit: number;
    competitiveFit: number;
  }
): string[] {
  const out: string[] = [];

  if (dims.intentMatch >= 70) out.push("Query intent aligns with the primary recommendation");
  if (input.explainability.recommendationBasis.intentMatch >= 65) {
    out.push("Explainability layer reports strong intent match");
  }
  if (input.queryIntelligence.confidence >= 0.72) out.push("High-confidence query interpretation");
  if (input.commerceMemory.confidence >= 0.65) {
    out.push("Session commerce preferences reinforce this intent");
  }
  if (dims.valueFit >= 68 && (intent === "best_value" || intent === "lowest_price")) {
    out.push("Value and pricing profile fit a value-seeking query");
  }
  if (dims.qualityFit >= 68 && ["premium_quality", "professional", "creator"].includes(intent)) {
    out.push("Quality and trust signals fit a premium or professional intent");
  }
  if (dims.competitiveFit >= 68) out.push("Primary wins competitive comparison for this intent");
  if (input.competitiveIntelligence.primaryAdvantages.length >= 2) {
    out.push("Multiple competitive advantages support intent alignment");
  }
  if (input.confidenceIntelligence.confidenceTier === "HIGH" || input.confidenceIntelligence.confidenceTier === "VERY_HIGH") {
    out.push("Institutional confidence tier supports intent-aligned recommendation");
  }

  return [...new Set(out)].slice(0, 6);
}

function buildConflicts(
  input: IntentAlignmentInput,
  intent: IntentCategory,
  dims: {
    intentMatch: number;
    valueFit: number;
    qualityFit: number;
    priceFit: number;
    competitiveFit: number;
  }
): string[] {
  const out: string[] = [];
  const verdict = input.verdictIntelligence.verdict;

  if (dims.intentMatch < 55) out.push("Interpreted query intent weakly matches the primary pick");
  if (verdict === "WAIT" || verdict === "AVOID") {
    out.push(`${verdict} verdict conflicts with a confident intent-aligned purchase`);
  }
  if (intent === "lowest_price" && input.marketContext.marketStatus === "OVERPRICED") {
    out.push("Market context flags elevated pricing versus a lowest-price intent");
  }
  if (intent === "best_value" && dims.valueFit < 55) out.push("Value fit is below threshold for a best-value query");
  if (intent === "premium_quality" && dims.qualityFit < 55) {
    out.push("Quality fit is below threshold for a premium-quality query");
  }
  if (input.competitiveIntelligence.alternativeAdvantages.length >= 2) {
    out.push("Strong alternatives may better satisfy parts of the stated intent");
  }
  if (input.confidenceIntelligence.alternativePressure >= 55) {
    out.push("Alternative pressure suggests intent could be better served elsewhere in tray");
  }
  const budget = input.queryIntelligence.constraints.budget;
  const pickPrice = input.competitiveIntelligence.primaryProduct.price;
  if (budget.active && pickPrice != null && budget.maxPrice != null && pickPrice > budget.maxPrice) {
    out.push("Primary price exceeds stated budget constraint");
  }

  return [...new Set(out)].slice(0, 5);
}

function buildSummary(intent: IntentCategory, tier: IntentTier, score: number, conflicts: string[]): string {
  const label = INTENT_LABELS[intent];
  if (tier === "VERY_HIGH" || tier === "HIGH") {
    return `${label} aligns strongly with the primary recommendation (${score}/100).`;
  }
  if (tier === "MEDIUM") {
    return `${label} partially aligns with the primary recommendation (${score}/100) — review tradeoffs before purchase.`;
  }
  const conflictHint = conflicts[0] ? ` ${conflicts[0]}.` : "";
  return `${label} shows weak alignment with the primary recommendation (${score}/100).${conflictHint}`;
}

/** Build intent alignment meta from consumed intelligence layers. */
export function buildIntentAlignment(input: IntentAlignmentInput): IntentAlignmentMeta {
  const primaryIntent = detectPrimaryIntent(input);
  const dimensions = {
    intentMatch: computeIntentMatch(input, primaryIntent),
    valueFit: computeValueFit(input, primaryIntent),
    qualityFit: computeQualityFit(input, primaryIntent),
    priceFit: computePriceFit(input, primaryIntent),
    competitiveFit: computeCompetitiveFit(input),
  };
  const intentScore = weightDimensions(primaryIntent, dimensions);
  const intentTier = tierFor(intentScore);
  const supportingSignals = buildSupportingSignals(input, primaryIntent, dimensions);
  const conflicts = buildConflicts(input, primaryIntent, dimensions);
  const summary = buildSummary(primaryIntent, intentTier, intentScore, conflicts);

  return {
    version: VERSION,
    intentScore,
    intentTier,
    primaryIntent,
    supportingSignals,
    conflicts,
    summary,
  };
}

/** Post-confidence intent alignment pass — meta + decision brief only. */
export function applyIntentAlignmentIntelligence(input: IntentAlignmentInput): {
  meta: IntentAlignmentMeta;
  decisionBrief: DecisionBriefDTO | null;
  products: QuantProduct[];
} {
  const meta = buildIntentAlignment(input);

  if (!input.decisionBrief) {
    return { meta, decisionBrief: null, products: input.products };
  }

  const decisionBrief: DecisionBriefDTO = {
    ...input.decisionBrief,
    intentAlignmentSummary: meta.summary,
  };

  return { meta, decisionBrief, products: input.products };
}
