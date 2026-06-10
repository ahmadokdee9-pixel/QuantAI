/**
 * Phase 2I — User decision intelligence layer.
 * Analyzes buying decision behavior and strategy signals (evidence only).
 */

import type { IntentSnapshot } from "@/lib/truth/intentIntelligenceEngine";
import { normalizeShoppingQuery } from "@/lib/truth/intentIntelligenceEngine";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type UserDecisionStrategy =
  | "bestValue"
  | "bestQuality"
  | "premiumChoice"
  | "budgetChoice"
  | "longTermInvestment"
  | "fastPurchase"
  | "safeChoice"
  | "experimentalChoice";

export type UserDecisionStrategyScores = {
  bestValue: number;
  bestQuality: number;
  premiumChoice: number;
  budgetChoice: number;
  longTermInvestment: number;
  fastPurchase: number;
  safeChoice: number;
  experimentalChoice: number;
};

export type UserDecisionSnapshot = {
  decisionStrategy: UserDecisionStrategy;
  decisionBehavior: string;
  strategyScores: UserDecisionStrategyScores;
  decisionSignals: string[];
  decisionConfidence: number;
  decisionEvidenceChain: string[];
};

export type UserDecisionIntelligenceInput = Omit<TruthFoundationSnapshot, "userDecisionIntelligence" | "purchaseMotivation">;

const STRATEGY_ORDER: UserDecisionStrategy[] = [
  "bestValue",
  "bestQuality",
  "premiumChoice",
  "budgetChoice",
  "longTermInvestment",
  "fastPurchase",
  "safeChoice",
  "experimentalChoice",
];

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

function scoreBestValue(input: UserDecisionIntelligenceInput, envelope: string): number {
  if (/\bbest\s+value\b|أفضل\s*قيمة/i.test(envelope)) return clampScore(88);
  return clampScore(
    input.tastePreference.valueAffinity * 0.45 +
      (input.conversationalIntent.budgetSensitivity === "HIGH" ? 25 : 10) +
      (/\bbest\s+value\b|\bvalue\s+for\s+money\b|قيمة\s*ممتاز|أفضل\s*قيمة/i.test(envelope) ? 25 : 0)
  );
}

function scoreBestQuality(input: UserDecisionIntelligenceInput, envelope: string): number {
  if (/\bbest\s+value\b|أفضل\s*قيمة/i.test(envelope)) return clampScore(30);
  const intent = input.intentEngine.intent;
  return clampScore(
    (intent.qualityLevel === "best" || intent.qualityLevel === "professional" ? 35 : 0) +
      (input.conversationalIntent.qualitySensitivity === "HIGH" ? 25 : 10) +
      (/\b(best|top|flagship|quality|professional|احسن|أفضل\s*جودة|جودة)/i.test(envelope) ? 30 : 0)
  );
}

function scorePremiumChoice(input: UserDecisionIntelligenceInput, envelope: string): number {
  return clampScore(
    input.tastePreference.premiumAffinity * 0.35 +
      input.tastePreference.luxuryPreference * 0.35 +
      (/فاخر|فخم|premium|luxury|elegant|high.end/i.test(envelope) ? 20 : 0)
  );
}

function scoreBudgetChoice(input: UserDecisionIntelligenceInput, envelope: string): number {
  const intent = input.intentEngine.intent;
  return clampScore(
    (intent.qualityLevel === "budget" ? 35 : 0) +
      (input.conversationalIntent.budgetSensitivity === "HIGH" ? 30 : 0) +
      (intent.budget != null ? 20 : 0) +
      (/\b(cheap|budget|affordable|under|رخيص|أرخص|تحت|اقل\s*سعر)/i.test(envelope) ? 25 : 0)
  );
}

function scoreLongTermInvestment(input: UserDecisionIntelligenceInput, envelope: string): number {
  const intent = input.intentEngine.intent;
  return clampScore(
    (intent.qualityLevel === "professional" ? 30 : 0) +
      input.tastePreference.practicalityPreference * 0.25 +
      (/\b(durable|long\s+term|investment|years|warranty|reliable|workhorse|استثمار|طويل\s*المدى|متين)/i.test(
        envelope
      )
        ? 35
        : 0) +
      (intent.useCase === "productivity" ? 15 : 0)
  );
}

function scoreFastPurchase(input: UserDecisionIntelligenceInput, envelope: string): number {
  return clampScore(
    (input.conversationalIntent.urgencyLevel === "HIGH" ? 45 : input.conversationalIntent.urgencyLevel === "MEDIUM" ? 25 : 0) +
      (/\b(asap|urgent|today|buy\s+now|ship\s+today|fast|quick|عاجل|الآن|فوري)/i.test(envelope) ? 40 : 0)
  );
}

function scoreSafeChoice(input: UserDecisionIntelligenceInput, envelope: string): number {
  return clampScore(
    (input.conversationalIntent.riskTolerance === "LOW" ? 30 : 0) +
      (input.trustEngine.trustScore >= 55 ? 20 : 0) +
      (/\b(safe|trusted|reliable|verified|original|warranty|secure|آمن|موثوق|مضمون)/i.test(envelope) ? 35 : 0) +
      (input.recommendationIntelligence.recommendationTier === "BEST_MATCH" ||
      input.recommendationIntelligence.recommendationTier === "RECOMMENDED"
        ? 10
        : 0)
  );
}

function scoreExperimentalChoice(input: UserDecisionIntelligenceInput, envelope: string): number {
  return clampScore(
    input.tastePreference.innovationPreference * 0.4 +
      (input.conversationalIntent.riskTolerance === "HIGH" ? 25 : 10) +
      (/\b(new|latest|innovative|experimental|cutting.edge|first\s+gen|beta|جديد|تجريبي|مبتكر)/i.test(envelope)
        ? 30
        : 0)
  );
}

function computeStrategyScores(input: UserDecisionIntelligenceInput, envelope: string): UserDecisionStrategyScores {
  return {
    bestValue: scoreBestValue(input, envelope),
    bestQuality: scoreBestQuality(input, envelope),
    premiumChoice: scorePremiumChoice(input, envelope),
    budgetChoice: scoreBudgetChoice(input, envelope),
    longTermInvestment: scoreLongTermInvestment(input, envelope),
    fastPurchase: scoreFastPurchase(input, envelope),
    safeChoice: scoreSafeChoice(input, envelope),
    experimentalChoice: scoreExperimentalChoice(input, envelope),
  };
}

function pickPrimaryStrategy(scores: UserDecisionStrategyScores): UserDecisionStrategy {
  let best: UserDecisionStrategy = "bestValue";
  let bestScore = -1;
  for (const strategy of STRATEGY_ORDER) {
    const score = scores[strategy];
    if (score > bestScore) {
      bestScore = score;
      best = strategy;
    }
  }
  return best;
}

function describeBehavior(strategy: UserDecisionStrategy, intent: IntentSnapshot): string {
  const product = intent.productType ?? "product";
  switch (strategy) {
    case "bestValue":
      return `Shopper is optimizing ${product} purchases for strong value relative to price`;
    case "bestQuality":
      return `Shopper is prioritizing top-tier quality and capability for ${product}`;
    case "premiumChoice":
      return `Shopper is leaning toward premium positioning and elevated ${product} tiers`;
    case "budgetChoice":
      return `Shopper is constraining spend and filtering ${product} options by budget`;
    case "longTermInvestment":
      return `Shopper is evaluating ${product} as a durable long-term purchase`;
    case "fastPurchase":
      return `Shopper wants to decide quickly and complete a near-term ${product} purchase`;
    case "safeChoice":
      return `Shopper prefers low-risk, trustworthy ${product} options with verified signals`;
    case "experimentalChoice":
      return `Shopper is open to newer or less conventional ${product} choices`;
    default:
      return `Shopper is exploring ${product} options with mixed decision signals`;
  }
}

function buildDecisionSignals(
  strategy: UserDecisionStrategy,
  scores: UserDecisionStrategyScores,
  input: UserDecisionIntelligenceInput,
  envelope: string
): string[] {
  const signals = [
    `primary strategy: ${strategy}`,
    `value score: ${scores.bestValue}`,
    `quality score: ${scores.bestQuality}`,
    ...input.conversationalIntent.preferenceSignals.slice(0, 2),
    ...input.tastePreference.tasteSignals.slice(0, 2),
  ];

  if (input.intentEngine.intent.budget != null) {
    signals.push(`budget target: ${input.intentEngine.intent.currency ?? ""} ${input.intentEngine.intent.budget}`.trim());
  }
  if (input.intentEngine.intent.useCase) signals.push(`use case: ${input.intentEngine.intent.useCase}`);
  if (/\b(asap|urgent|عاجل)\b/i.test(envelope)) signals.push("urgency detected");
  if (/فاخر|luxury|premium/i.test(envelope)) signals.push("premium framing detected");
  if (/\bbest\s+value\b|قيمة/i.test(envelope)) signals.push("value framing detected");

  return uniqueNonEmpty(signals, 10);
}

function computeDecisionConfidence(args: {
  strategyScores: UserDecisionStrategyScores;
  primaryStrategy: UserDecisionStrategy;
  decisionSignals: string[];
  conversationalConfidence: number;
  tasteConfidence: number;
}): number {
  const scores = Object.values(args.strategyScores);
  const sorted = [...scores].sort((a, b) => b - a);
  const top = args.strategyScores[args.primaryStrategy];
  const second = sorted[1] ?? 0;
  const separation = Math.max(0, top - second);

  return clampScore(
    top * 0.35 +
      separation * 0.2 +
      Math.min(args.decisionSignals.length, 8) * 4 +
      args.conversationalConfidence * 0.18 +
      args.tasteConfidence * 0.12
  );
}

export function buildUserDecisionEvidenceChain(snapshot: UserDecisionSnapshot): string[] {
  return uniqueNonEmpty(
    [
      `strategy:${snapshot.decisionStrategy}`,
      `behavior:${snapshot.decisionBehavior}`,
      `confidence:${snapshot.decisionConfidence}`,
      ...STRATEGY_ORDER.map((strategy) => `${strategy}:${snapshot.strategyScores[strategy]}`),
      ...snapshot.decisionSignals.slice(0, 4).map((signal) => `signal:${signal}`),
    ],
    16
  );
}

export function hasUserDecisionIntelligenceSignal(snapshot: UserDecisionSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.decisionConfidence >= 0);
}

/** Build user decision intelligence snapshot from conversational and taste layers. */
export function buildUserDecisionIntelligenceEngine(
  input: UserDecisionIntelligenceInput,
  rawQuery: string
): UserDecisionSnapshot {
  const normalizedQuery = input.intentEngine.normalizedQuery || normalizeShoppingQuery(rawQuery);
  const envelope = queryEnvelope(rawQuery, normalizedQuery);
  const strategyScores = computeStrategyScores(input, envelope);
  const decisionStrategy = pickPrimaryStrategy(strategyScores);
  const decisionBehavior = describeBehavior(decisionStrategy, input.intentEngine.intent);
  const decisionSignals = buildDecisionSignals(decisionStrategy, strategyScores, input, envelope);
  const decisionConfidence = computeDecisionConfidence({
    strategyScores,
    primaryStrategy: decisionStrategy,
    decisionSignals,
    conversationalConfidence: input.conversationalIntent.conversationalConfidence,
    tasteConfidence: input.tastePreference.tasteConfidence,
  });

  const snapshot: UserDecisionSnapshot = {
    decisionStrategy,
    decisionBehavior,
    strategyScores,
    decisionSignals,
    decisionConfidence,
    decisionEvidenceChain: [],
  };
  snapshot.decisionEvidenceChain = buildUserDecisionEvidenceChain(snapshot);

  return snapshot;
}
