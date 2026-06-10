/**
 * Phase 2J — Purchase motivation intelligence layer.
 * Detects underlying purchase motivations from query and upstream truth layers (evidence only).
 */

import { normalizeShoppingQuery } from "@/lib/truth/intentIntelligenceEngine";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type PurchaseMotivation =
  | "productivity"
  | "status"
  | "luxury"
  | "enjoyment"
  | "gaming"
  | "creativity"
  | "work"
  | "education"
  | "travel"
  | "fitness"
  | "gifting"
  | "replacement"
  | "necessity"
  | "curiosity"
  | "innovation";

export type PurchaseMotivationScores = {
  productivity: number;
  status: number;
  luxury: number;
  enjoyment: number;
  gaming: number;
  creativity: number;
  work: number;
  education: number;
  travel: number;
  fitness: number;
  gifting: number;
  replacement: number;
  necessity: number;
  curiosity: number;
  innovation: number;
};

export type PurchaseMotivationSnapshot = {
  motivation: PurchaseMotivation;
  motivationScores: PurchaseMotivationScores;
  motivationSignals: string[];
  motivationConfidence: number;
  motivationEvidenceChain: string[];
};

export type PurchaseMotivationInput = Omit<TruthFoundationSnapshot, "purchaseMotivation">;

const MOTIVATION_ORDER: PurchaseMotivation[] = [
  "productivity",
  "status",
  "luxury",
  "enjoyment",
  "gaming",
  "creativity",
  "work",
  "education",
  "travel",
  "fitness",
  "gifting",
  "replacement",
  "necessity",
  "curiosity",
  "innovation",
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

function useCaseBoost(useCase: string | null | undefined, target: string, amount: number): number {
  if (!useCase) return 0;
  if (useCase === target) return amount;
  if (target === "productivity" && (useCase === "productivity" || useCase === "student")) return amount * 0.5;
  if (target === "creativity" && useCase === "video editing") return amount;
  if (target === "creativity" && useCase === "photography") return amount * 0.6;
  return 0;
}

function scoreProductivity(input: PurchaseMotivationInput, envelope: string): number {
  const intent = input.intentEngine.intent;
  return clampScore(
    useCaseBoost(intent.useCase, "productivity", 40) +
      (/\b(productivity|productive|office|programming|developer|multitask|للبرمجة|برمجة|إنتاجية)/i.test(envelope)
        ? 35
        : 0) +
      input.tastePreference.practicalityPreference * 0.15
  );
}

function scoreStatus(input: PurchaseMotivationInput, envelope: string): number {
  return clampScore(
    input.tastePreference.luxuryPreference * 0.25 +
      input.tastePreference.premiumAffinity * 0.2 +
      (input.userDecisionIntelligence.decisionStrategy === "premiumChoice" ? 20 : 0) +
      (/\b(status|prestige|designer|exclusive|flagship|branded|مكانة|رفاهية|راقي)/i.test(envelope) ? 35 : 0)
  );
}

function scoreLuxury(input: PurchaseMotivationInput, envelope: string): number {
  if (/\b(status|prestige|designer|مكانة)\b/i.test(envelope)) return clampScore(35);
  return clampScore(
    input.tastePreference.luxuryPreference * 0.4 +
      input.tastePreference.premiumAffinity * 0.25 +
      (/\b(luxury|premium|elegant|high.end|designer|فاخر|فخم|راقي)/i.test(envelope) ? 35 : 0)
  );
}

function scoreEnjoyment(input: PurchaseMotivationInput, envelope: string): number {
  return clampScore(
    (/\b(fun|enjoy|entertainment|leisure|hobby|relax|movie|music|متعة|ترفيه|هواية)/i.test(envelope) ? 45 : 0) +
      (input.intentEngine.intent.category === "home entertainment" ? 25 : 0) +
      input.tastePreference.performancePreference * 0.1
  );
}

function scoreGaming(input: PurchaseMotivationInput, envelope: string): number {
  if (/\bgaming\b|rtx|144hz|240hz|esports|ألعاب|قيمنق|جيمنق|للالعاب|للألعاب/i.test(envelope)) {
    return clampScore(88);
  }
  return clampScore(
    useCaseBoost(input.intentEngine.intent.useCase, "gaming", 45) +
      (input.intentEngine.intent.category === "gaming" ? 25 : 0) +
      input.tastePreference.performancePreference * 0.2
  );
}

function scoreCreativity(input: PurchaseMotivationInput, envelope: string): number {
  return clampScore(
    useCaseBoost(input.intentEngine.intent.useCase, "creativity", 40) +
      useCaseBoost(input.intentEngine.intent.useCase, "video editing", 45) +
      useCaseBoost(input.intentEngine.intent.useCase, "photography", 25) +
      (/\b(creat|creator|content|design|art|edit|stream|montage|إبداع|مونتاج|تصميم)/i.test(envelope) ? 35 : 0)
  );
}

function scoreWork(input: PurchaseMotivationInput, envelope: string): number {
  if (/\b(productivity|programming|office productivity)\b/i.test(envelope)) return clampScore(35);
  return clampScore(
    (/\b(work|job|professional|business|corporate|employer|عمل|مهنة|وظيفة|للعمل)/i.test(envelope) ? 45 : 0) +
      (input.intentEngine.intent.qualityLevel === "professional" ? 20 : 0) +
      (input.userDecisionIntelligence.decisionStrategy === "longTermInvestment" ? 10 : 0)
  );
}

function scoreEducation(input: PurchaseMotivationInput, envelope: string): number {
  if (/\b(education|student|university|school|college|للجامعة|للمدرسة|دراسة|طالب)/i.test(envelope)) {
    return clampScore(85);
  }
  return clampScore(useCaseBoost(input.intentEngine.intent.useCase, "student", 45));
}

function scoreTravel(input: PurchaseMotivationInput, envelope: string): number {
  if (/\b(travel|portable|lightweight|compact|commute|commuter|سفر|للسفر|محمول)/i.test(envelope)) {
    return clampScore(85);
  }
  return clampScore(
    useCaseBoost(input.intentEngine.intent.useCase, "travel", 45) +
      input.tastePreference.portabilityPreference * 0.25
  );
}

function scoreFitness(input: PurchaseMotivationInput, envelope: string): number {
  if (/\b(fitness|gym|workout|exercise|running|health|sport|رياضة|للرياضة|تمارين)/i.test(envelope)) {
    return clampScore(85);
  }
  return clampScore(useCaseBoost(input.intentEngine.intent.useCase, "fitness", 45));
}

function scoreGifting(input: PurchaseMotivationInput, envelope: string): number {
  if (/\b(gift|present|birthday|anniversary|for\s+my|for\s+her|for\s+him|هدية|إهداء|عيد\s*ميلاد)/i.test(envelope)) {
    return clampScore(88);
  }
  return clampScore(useCaseBoost(input.intentEngine.intent.useCase, "gift", 45));
}

function scoreReplacement(input: PurchaseMotivationInput, envelope: string): number {
  return clampScore(
    (/\b(replace|replacement|broken|old\s+one|upgrade\s+from|swap|instead\s+of|بديل|استبدال|قديم|معطل)/i.test(
      envelope
    )
      ? 50
      : 0) +
      (input.userDecisionIntelligence.decisionStrategy === "longTermInvestment" ? 10 : 0)
  );
}

function scoreNecessity(input: PurchaseMotivationInput, envelope: string): number {
  if (/\b(replace|replacement|broken|gift|gifting|curious|explore)\b/i.test(envelope)) return clampScore(25);
  return clampScore(
    (/\b(need|must|essential|required|basic|urgent|necessary|ضروري|لازم|احتاج|أساسي)/i.test(envelope) ? 50 : 0) +
      (input.conversationalIntent.urgencyLevel === "HIGH" ? 20 : 0) +
      (input.userDecisionIntelligence.decisionStrategy === "fastPurchase" ? 15 : 0)
  );
}

function scoreCuriosity(input: PurchaseMotivationInput, envelope: string): number {
  if (/\b(innovative|innovation|cutting.edge|latest|new\s+tech|مبتكر|تقنية\s*جديدة)/i.test(envelope)) {
    return clampScore(30);
  }
  return clampScore(
    (/\b(curious|curiosity|try|explore|experiment|wonder|interesting|فضول|تجربة|استكشاف)/i.test(envelope)
      ? 50
      : 0) +
      (input.userDecisionIntelligence.decisionStrategy === "experimentalChoice" ? 20 : 0) +
      input.tastePreference.innovationPreference * 0.1
  );
}

function scoreInnovation(input: PurchaseMotivationInput, envelope: string): number {
  if (/\b(curious|curiosity|explore|فضول)\b/i.test(envelope)) return clampScore(35);
  return clampScore(
    input.tastePreference.innovationPreference * 0.35 +
      (input.userDecisionIntelligence.decisionStrategy === "experimentalChoice" ? 25 : 0) +
      (/\b(innov|latest|cutting.edge|first\s+gen|new\s+tech|beta|revolutionary|مبتكر|تقنية\s*جديدة|أحدث)/i.test(
        envelope
      )
        ? 45
        : 0)
  );
}

function computeMotivationScores(input: PurchaseMotivationInput, envelope: string): PurchaseMotivationScores {
  return {
    productivity: scoreProductivity(input, envelope),
    status: scoreStatus(input, envelope),
    luxury: scoreLuxury(input, envelope),
    enjoyment: scoreEnjoyment(input, envelope),
    gaming: scoreGaming(input, envelope),
    creativity: scoreCreativity(input, envelope),
    work: scoreWork(input, envelope),
    education: scoreEducation(input, envelope),
    travel: scoreTravel(input, envelope),
    fitness: scoreFitness(input, envelope),
    gifting: scoreGifting(input, envelope),
    replacement: scoreReplacement(input, envelope),
    necessity: scoreNecessity(input, envelope),
    curiosity: scoreCuriosity(input, envelope),
    innovation: scoreInnovation(input, envelope),
  };
}

function pickPrimaryMotivation(scores: PurchaseMotivationScores): PurchaseMotivation {
  let best: PurchaseMotivation = "productivity";
  let bestScore = -1;
  for (const motivation of MOTIVATION_ORDER) {
    const score = scores[motivation];
    if (score > bestScore) {
      bestScore = score;
      best = motivation;
    }
  }
  return best;
}

function buildMotivationSignals(
  motivation: PurchaseMotivation,
  scores: PurchaseMotivationScores,
  input: PurchaseMotivationInput,
  envelope: string
): string[] {
  const signals = [
    `primary motivation: ${motivation}`,
    `top score: ${scores[motivation]}`,
    ...input.conversationalIntent.preferenceSignals.slice(0, 2),
    ...input.userDecisionIntelligence.decisionSignals.slice(0, 2),
  ];

  if (input.intentEngine.intent.useCase) signals.push(`use case: ${input.intentEngine.intent.useCase}`);
  if (input.intentEngine.intent.productType) signals.push(`product: ${input.intentEngine.intent.productType}`);
  if (/gift|هدية/i.test(envelope)) signals.push("gift framing detected");
  if (/gaming|ألعاب/i.test(envelope)) signals.push("gaming framing detected");
  if (/luxury|فاخر/i.test(envelope)) signals.push("luxury framing detected");
  if (/replace|استبدال/i.test(envelope)) signals.push("replacement framing detected");

  return uniqueNonEmpty(signals, 10);
}

function computeMotivationConfidence(args: {
  motivationScores: PurchaseMotivationScores;
  primaryMotivation: PurchaseMotivation;
  motivationSignals: string[];
  conversationalConfidence: number;
  userDecisionConfidence: number;
}): number {
  const scores = Object.values(args.motivationScores);
  const sorted = [...scores].sort((a, b) => b - a);
  const top = args.motivationScores[args.primaryMotivation];
  const second = sorted[1] ?? 0;
  const separation = Math.max(0, top - second);

  return clampScore(
    top * 0.35 +
      separation * 0.22 +
      Math.min(args.motivationSignals.length, 8) * 4 +
      args.conversationalConfidence * 0.15 +
      args.userDecisionConfidence * 0.1
  );
}

export function buildPurchaseMotivationEvidenceChain(snapshot: PurchaseMotivationSnapshot): string[] {
  return uniqueNonEmpty(
    [
      `motivation:${snapshot.motivation}`,
      `confidence:${snapshot.motivationConfidence}`,
      ...MOTIVATION_ORDER.map((motivation) => `${motivation}:${snapshot.motivationScores[motivation]}`),
      ...snapshot.motivationSignals.slice(0, 4).map((signal) => `signal:${signal}`),
    ],
    20
  );
}

export function hasPurchaseMotivationSignal(snapshot: PurchaseMotivationSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.motivationConfidence >= 0);
}

/** Build purchase motivation snapshot from upstream truth layers. */
export function buildPurchaseMotivationEngine(
  input: PurchaseMotivationInput,
  rawQuery: string
): PurchaseMotivationSnapshot {
  const normalizedQuery = input.intentEngine.normalizedQuery || normalizeShoppingQuery(rawQuery);
  const envelope = queryEnvelope(rawQuery, normalizedQuery);
  const motivationScores = computeMotivationScores(input, envelope);
  const motivation = pickPrimaryMotivation(motivationScores);
  const motivationSignals = buildMotivationSignals(motivation, motivationScores, input, envelope);
  const motivationConfidence = computeMotivationConfidence({
    motivationScores,
    primaryMotivation: motivation,
    motivationSignals,
    conversationalConfidence: input.conversationalIntent.conversationalConfidence,
    userDecisionConfidence: input.userDecisionIntelligence.decisionConfidence,
  });

  const snapshot: PurchaseMotivationSnapshot = {
    motivation,
    motivationScores,
    motivationSignals,
    motivationConfidence,
    motivationEvidenceChain: [],
  };
  snapshot.motivationEvidenceChain = buildPurchaseMotivationEvidenceChain(snapshot);

  return snapshot;
}
