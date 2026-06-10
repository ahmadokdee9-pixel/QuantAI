/**
 * Phase 2H — Taste & preference intelligence layer.
 * Understands aesthetic, style, and user affinity signals without ranking impact.
 */

import type { IntentSnapshot } from "@/lib/truth/intentIntelligenceEngine";
import { normalizeShoppingQuery } from "@/lib/truth/intentIntelligenceEngine";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type TastePreferenceSnapshot = {
  aestheticProfile: string;
  styleProfile: string;
  premiumAffinity: number;
  valueAffinity: number;
  minimalistPreference: number;
  performancePreference: number;
  portabilityPreference: number;
  luxuryPreference: number;
  practicalityPreference: number;
  innovationPreference: number;
  tasteSignals: string[];
  tasteConfidence: number;
};

export type TastePreferenceInput = Omit<TruthFoundationSnapshot, "tastePreference">;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function uniqueNonEmpty(items: string[], limit = 10): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

function queryEnvelope(rawQuery: string, normalizedQuery: string): string {
  return `${rawQuery} ${normalizedQuery}`.toLowerCase().replace(/\s+/g, " ").trim();
}

function detectAestheticProfile(envelope: string): string {
  if (/\b(minimalist|minimal|clean|simple|sleek|مينيم|بسيط)\b/i.test(envelope)) return "minimalist";
  if (/عصري|حديث|\b(modern|contemporary|scandinavian)\b/i.test(envelope)) return "modern";
  if (/فاخر|فخم|راقي|\b(luxury|luxurious|designer|watch|high.end|premium\s+watch)\b/i.test(envelope)) return "luxury";
  if (/فاخر|فخم|\b(premium|polished|elegant)\b/i.test(envelope)) return "premium";
  if (/\b(gaming|rgb|aggressive|rog)\b/i.test(envelope)) return "performance";
  if (/\b(classic|vintage|retro|traditional)\b/i.test(envelope)) return "classic";
  if (/\b(functional|practical|utility|everyday)\b/i.test(envelope)) return "functional";
  return "balanced";
}

function detectStyleProfile(envelope: string, aestheticProfile: string): string {
  if (/عصري|حديث|\b(modern|contemporary)\b/i.test(envelope)) return "modern";
  if (/فاخر|فخم|\b(luxury|watch|designer)\b/i.test(envelope)) return "luxury";
  if (/\b(minimalist|minimal|desk\s+setup|clean)\b/i.test(envelope)) return "minimal";
  if (/\b(gaming|esports|rtx)\b/i.test(envelope)) return "gaming";
  if (/\b(travel|portable|lightweight|portability)\b/i.test(envelope)) return "travel";
  if (/\b(furniture|home|decor)\b/i.test(envelope)) return "home";
  if (aestheticProfile !== "balanced") return aestheticProfile;
  return "general";
}

function scorePremiumAffinity(intent: IntentSnapshot, envelope: string, conversationalQuality: string): number {
  let score = 0;
  if (intent.qualityLevel === "premium" || intent.qualityLevel === "best") score += 45;
  if (/\b(premium|premium\s+look|polished|elegant|high.end|not\s+overpriced)\b/i.test(envelope)) score += 40;
  if (/فاخر|راقي|premium/i.test(envelope)) score += 35;
  if (conversationalQuality === "HIGH") score += 15;
  return clampScore(score);
}

function scoreValueAffinity(intent: IntentSnapshot, envelope: string, conversationalBudget: string): number {
  if (/\bbest\s+value\b/i.test(envelope)) return clampScore(82);
  let score = 0;
  if (intent.qualityLevel === "budget") score += 45;
  if (/\b(best\s+value|value|cheap|affordable|budget|bang\s+for\s+buck)\b/i.test(envelope)) score += 45;
  if (conversationalBudget === "HIGH") score += 20;
  if (intent.budget != null) score += 15;
  return clampScore(score);
}

function scoreMinimalistPreference(envelope: string): number {
  if (/\b(minimalist|minimal|clean|simple|sleek|desk\s+setup|declutter|مينيم|بسيط)\b/i.test(envelope)) {
    return clampScore(85);
  }
  if (/\b(compact|small\s+footprint|uncluttered)\b/i.test(envelope)) return 55;
  return 0;
}

function scorePerformancePreference(intent: IntentSnapshot, envelope: string): number {
  let score = 0;
  if (intent.useCase === "gaming") score += 50;
  if (/\b(gaming|performance|powerful|rtx|fps|fast|high\s+performance)\b/i.test(envelope)) score += 45;
  if (intent.qualityLevel === "powerful" || intent.qualityLevel === "professional") score += 20;
  return clampScore(score);
}

function scorePortabilityPreference(intent: IntentSnapshot, envelope: string): number {
  let score = 0;
  if (intent.useCase === "travel") score += 50;
  if (/\b(portable|portability|lightweight|travel|compact|ultrabook|monitor\s+for\s+travel)\b/i.test(envelope)) {
    score += 50;
  }
  if (/\b(سفر|خفيف|محمول)\b/i.test(envelope)) score += 40;
  return clampScore(score);
}

function scoreLuxuryPreference(envelope: string): number {
  if (/فاخر|فخم|منتج\s+فاخر|\b(luxury|luxurious|designer|watch|high.end|premium\s+watch)\b/i.test(envelope)) {
    return clampScore(88);
  }
  if (/\b(premium|elegant|exclusive)\b/i.test(envelope)) return 45;
  return 0;
}

function scorePracticalityPreference(intent: IntentSnapshot, envelope: string): number {
  let score = 0;
  if (intent.useCase === "productivity" || intent.useCase === "student") score += 35;
  if (/\b(practical|practicality|everyday|utility|durable|reliable|office|work)\b/i.test(envelope)) score += 40;
  if (/\b(desk\s+setup|home\s+office)\b/i.test(envelope)) score += 25;
  return clampScore(score);
}

function scoreInnovationPreference(envelope: string): number {
  if (/\b(innovative|latest|newest|cutting.edge|smart|ai|next.gen|flagship)\b/i.test(envelope)) {
    return clampScore(75);
  }
  if (/\b(modern|tech|advanced)\b/i.test(envelope)) return 45;
  return 0;
}

function buildTasteSignals(args: {
  aestheticProfile: string;
  styleProfile: string;
  intent: IntentSnapshot;
  envelope: string;
  premiumAffinity: number;
  valueAffinity: number;
  minimalistPreference: number;
  performancePreference: number;
  portabilityPreference: number;
  luxuryPreference: number;
  practicalityPreference: number;
  innovationPreference: number;
  conversationalSignals: string[];
}): string[] {
  const signals = [
    `aesthetic:${args.aestheticProfile}`,
    `style:${args.styleProfile}`,
    ...args.conversationalSignals.slice(0, 3),
  ];

  if (args.premiumAffinity >= 55) signals.push("premium taste");
  if (args.valueAffinity >= 55) signals.push("value taste");
  if (args.minimalistPreference >= 55) signals.push("minimalist taste");
  if (args.performancePreference >= 55) signals.push("performance taste");
  if (args.portabilityPreference >= 55) signals.push("portability taste");
  if (args.luxuryPreference >= 55) signals.push("luxury taste");
  if (args.practicalityPreference >= 55) signals.push("practicality taste");
  if (args.innovationPreference >= 55) signals.push("innovation taste");
  if (args.intent.preferredBrand) signals.push(`brand affinity: ${args.intent.preferredBrand}`);
  if (args.intent.useCase) signals.push(`${args.intent.useCase} affinity`);

  return uniqueNonEmpty(signals, 10);
}

function computeTasteConfidence(args: {
  tasteSignals: string[];
  intentConfidence: number;
  conversationalConfidence: number;
  reasoningExplainability: number;
  strongestScore: number;
}): number {
  return clampScore(
    Math.min(args.tasteSignals.length, 8) * 6 +
      args.intentConfidence * 0.2 +
      args.conversationalConfidence * 0.18 +
      args.reasoningExplainability * 0.12 +
      args.strongestScore * 0.25
  );
}

export function buildTastePreferenceEvidenceChain(snapshot: TastePreferenceSnapshot): string[] {
  return uniqueNonEmpty(
    [
      `aesthetic:${snapshot.aestheticProfile}`,
      `style:${snapshot.styleProfile}`,
      `premium:${snapshot.premiumAffinity}`,
      `value:${snapshot.valueAffinity}`,
      `minimalist:${snapshot.minimalistPreference}`,
      `performance:${snapshot.performancePreference}`,
      `portability:${snapshot.portabilityPreference}`,
      `luxury:${snapshot.luxuryPreference}`,
      `practicality:${snapshot.practicalityPreference}`,
      `innovation:${snapshot.innovationPreference}`,
      `confidence:${snapshot.tasteConfidence}`,
      ...snapshot.tasteSignals.slice(0, 4).map((signal) => `taste:${signal}`),
    ],
    14
  );
}

export function hasTastePreferenceSignal(snapshot: TastePreferenceSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.tasteConfidence >= 0);
}

/** Build taste and preference intelligence snapshot from intent and intelligence layers. */
export function buildTastePreferenceEngine(input: TastePreferenceInput, rawQuery: string): TastePreferenceSnapshot {
  const normalizedQuery = input.intentEngine.normalizedQuery || normalizeShoppingQuery(rawQuery);
  const envelope = queryEnvelope(rawQuery, normalizedQuery);
  const intent = input.intentEngine.intent;
  const conversational = input.conversationalIntent;

  const aestheticProfile = detectAestheticProfile(envelope);
  const styleProfile = detectStyleProfile(envelope, aestheticProfile);
  const premiumAffinity = scorePremiumAffinity(intent, envelope, conversational.qualitySensitivity);
  const valueAffinity = scoreValueAffinity(intent, envelope, conversational.budgetSensitivity);
  const minimalistPreference = scoreMinimalistPreference(envelope);
  const performancePreference = scorePerformancePreference(intent, envelope);
  const portabilityPreference = scorePortabilityPreference(intent, envelope);
  const luxuryPreference = scoreLuxuryPreference(envelope);
  const practicalityPreference = scorePracticalityPreference(intent, envelope);
  const innovationPreference = scoreInnovationPreference(envelope);

  const scores = [
    premiumAffinity,
    valueAffinity,
    minimalistPreference,
    performancePreference,
    portabilityPreference,
    luxuryPreference,
    practicalityPreference,
    innovationPreference,
  ];
  const tasteSignals = buildTasteSignals({
    aestheticProfile,
    styleProfile,
    intent,
    envelope,
    premiumAffinity,
    valueAffinity,
    minimalistPreference,
    performancePreference,
    portabilityPreference,
    luxuryPreference,
    practicalityPreference,
    innovationPreference,
    conversationalSignals: conversational.preferenceSignals,
  });
  const tasteConfidence = computeTasteConfidence({
    tasteSignals,
    intentConfidence: input.intentEngine.intentConfidence,
    conversationalConfidence: conversational.conversationalConfidence,
    reasoningExplainability: input.productReasoning.explainabilityScore,
    strongestScore: Math.max(...scores),
  });

  return {
    aestheticProfile,
    styleProfile,
    premiumAffinity,
    valueAffinity,
    minimalistPreference,
    performancePreference,
    portabilityPreference,
    luxuryPreference,
    practicalityPreference,
    innovationPreference,
    tasteSignals,
    tasteConfidence,
  };
}
