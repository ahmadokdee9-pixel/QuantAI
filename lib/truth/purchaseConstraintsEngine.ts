/**
 * Phase 2K — Purchase constraints intelligence layer.
 * Detects user constraints and hard requirements (evidence only).
 */

import { normalizeShoppingQuery } from "@/lib/truth/intentIntelligenceEngine";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type PurchaseConstraint =
  | "budget"
  | "performance"
  | "portability"
  | "battery"
  | "screen"
  | "camera"
  | "storage"
  | "compatibility"
  | "delivery"
  | "travel"
  | "gaming"
  | "work"
  | "education"
  | "weight"
  | "brand";

export type PurchaseConstraintScores = {
  budget: number;
  performance: number;
  portability: number;
  battery: number;
  screen: number;
  camera: number;
  storage: number;
  compatibility: number;
  delivery: number;
  travel: number;
  gaming: number;
  work: number;
  education: number;
  weight: number;
  brand: number;
};

export type PurchaseConstraintsSnapshot = {
  primaryConstraint: PurchaseConstraint;
  constraintScores: PurchaseConstraintScores;
  hardRequirements: string[];
  constraintSignals: string[];
  constraintConfidence: number;
  constraintEvidenceChain: string[];
};

export type PurchaseConstraintsInput = Omit<TruthFoundationSnapshot, "purchaseConstraints">;

const CONSTRAINT_ORDER: PurchaseConstraint[] = [
  "budget",
  "performance",
  "portability",
  "battery",
  "screen",
  "camera",
  "storage",
  "compatibility",
  "delivery",
  "travel",
  "gaming",
  "work",
  "education",
  "weight",
  "brand",
];

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function uniqueNonEmpty(items: string[], limit = 12): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

function queryEnvelope(rawQuery: string, normalizedQuery: string): string {
  return `${rawQuery} ${normalizedQuery}`.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreUseCaseMatch(useCase: string | null | undefined, target: string, amount: number): number {
  if (!useCase) return 0;
  return useCase === target ? amount : 0;
}

function scoreBudget(input: PurchaseConstraintsInput, envelope: string): number {
  const intent = input.intentEngine.intent;
  if (/\bunder\s+\d+\s*(kg|g|grams)\b/i.test(envelope)) return clampScore(20);
  if (/\bunder\s+\d|budget|cheap|affordable|رخيص|أرخص|تحت\s*\d/i.test(envelope)) {
    return clampScore(88);
  }
  return clampScore(
    (intent.budget != null ? 45 : 0) +
      (intent.qualityLevel === "budget" ? 25 : 0) +
      (input.conversationalIntent.budgetSensitivity === "HIGH" ? 25 : 0) +
      (input.userDecisionIntelligence.decisionStrategy === "budgetChoice" ? 15 : 0)
  );
}

function scorePerformance(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\bgaming\b|144hz|240hz|rtx|esports|ألعاب/i.test(envelope)) return clampScore(35);
  return clampScore(
    input.tastePreference.performancePreference * 0.35 +
      (/\b(fast|powerful|performance|speed|cpu|gpu|processor|أداء|قوي|سريع)/i.test(envelope) ? 45 : 0) +
      input.productMatch.qualityMatchScore * 0.1
  );
}

function scorePortability(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\b(under\s+\d\s*kg|ultralight|1kg|weight)\b/i.test(envelope)) return clampScore(40);
  return clampScore(
    input.tastePreference.portabilityPreference * 0.4 +
      (/\b(portable|portability|compact|thin|slim|محمول|خفيف)/i.test(envelope) ? 45 : 0) +
      scoreUseCaseMatch(input.intentEngine.intent.useCase, "travel", 15)
  );
}

function scoreBattery(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\b(battery|all.day|long\s+battery|battery\s+life|شحن|بطارية|طويل\s*المدى)/i.test(envelope)) {
    return clampScore(85);
  }
  return clampScore(0);
}

function scoreScreen(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\b(screen|display|4k|oled|qhd|144hz|240hz|inch|retina|شاشة|عرض)/i.test(envelope)) {
    return clampScore(85);
  }
  return clampScore(0);
}

function scoreCamera(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\b(camera|photo|photography|megapixel|night\s+mode|selfie|كاميرا|تصوير|ليلي)/i.test(envelope)) {
    return clampScore(88);
  }
  return clampScore(scoreUseCaseMatch(input.intentEngine.intent.useCase, "photography", 40));
}

function scoreStorage(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\b(\d+\s*(tb|gb)|storage|ssd|hard\s+drive|disk\s+space|تخزين|مساحة)/i.test(envelope)) {
    return clampScore(88);
  }
  return clampScore(0);
}

function scoreCompatibility(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\b(apple|macbook|iphone|ipad|samsung|sony|dell)\b/i.test(envelope) && !/\b(compatible|compatibility|works\s+with|support\s+for|متوافق|يدعم)\b/i.test(envelope)) {
    return clampScore(25);
  }
  if (/\b(compatible|compatibility|works\s+with|support\s+for|macos|windows|linux|usb.?c|thunderbolt|متوافق|يدعم)/i.test(
    envelope
  )) {
    return clampScore(88);
  }
  return clampScore(0);
}

function scoreDelivery(input: PurchaseConstraintsInput, envelope: string): number {
  if (
    /\b(delivery|shipping|ship\s+today|next\s+day|fast\s+shipping|prime)\b/i.test(envelope) ||
    /توصيل|شحن|اليوم|سريع/i.test(envelope)
  ) {
    return clampScore(88);
  }
  return clampScore(
    (input.conversationalIntent.urgencyLevel === "HIGH" ? 30 : 0) +
      (input.userDecisionIntelligence.decisionStrategy === "fastPurchase" ? 20 : 0)
  );
}

function scoreTravel(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\b(portable|lightweight|under\s+\d\s*kg|ultralight)\b/i.test(envelope)) return clampScore(40);
  if (/\b(travel|commute|commuter|flight|trip|سفر|للسفر)/i.test(envelope)) {
    return clampScore(85);
  }
  return clampScore(
    scoreUseCaseMatch(input.intentEngine.intent.useCase, "travel", 45) +
      input.tastePreference.portabilityPreference * 0.15
  );
}

function scoreGaming(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\bgaming\b|rtx|144hz|240hz|esports|gamer|ألعاب|قيمنق|جيمنق/i.test(envelope)) {
    return clampScore(90);
  }
  return clampScore(
    scoreUseCaseMatch(input.intentEngine.intent.useCase, "gaming", 45) +
      (input.intentEngine.intent.category === "gaming" ? 20 : 0)
  );
}

function scoreWork(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\b(gaming|144hz|rtx|student|university)\b/i.test(envelope)) return clampScore(30);
  if (/\b(work|office|business|professional|corporate|job|عمل|مهنة|مكتب)/i.test(envelope)) {
    return clampScore(85);
  }
  return clampScore(
    scoreUseCaseMatch(input.intentEngine.intent.useCase, "productivity", 35) +
      (input.intentEngine.intent.qualityLevel === "professional" ? 20 : 0)
  );
}

function scoreEducation(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\b(education|student|university|school|college|campus|للجامعة|للمدرسة|طالب|دراسة)/i.test(envelope)) {
    return clampScore(88);
  }
  return clampScore(scoreUseCaseMatch(input.intentEngine.intent.useCase, "student", 45));
}

function scoreWeight(input: PurchaseConstraintsInput, envelope: string): number {
  if (/\b(weight|ultralight|under\s+\d+\s*kg|1kg|grams|وزن|خفيف\s*الوزن)/i.test(envelope)) {
    return clampScore(90);
  }
  if (/\b(portable|travel|commute|lightweight)\b/i.test(envelope)) return clampScore(45);
  return clampScore(input.tastePreference.portabilityPreference * 0.2);
}

function scoreBrand(input: PurchaseConstraintsInput, envelope: string): number {
  const brand = input.intentEngine.intent.preferredBrand;
  if (brand) {
    return clampScore(/\b(only|must\s+be|brand)\b/i.test(envelope) ? 92 : 88);
  }
  if (/\b(only|must\s+be|brand|apple|samsung|sony|dell|lenovo|hp|asus|canon|nikon|ماركة)/i.test(envelope)) {
    return clampScore(55);
  }
  return clampScore(input.productMatch.brandMatchScore > 0 ? 30 : 0);
}

function computeConstraintScores(input: PurchaseConstraintsInput, envelope: string): PurchaseConstraintScores {
  return {
    budget: scoreBudget(input, envelope),
    performance: scorePerformance(input, envelope),
    portability: scorePortability(input, envelope),
    battery: scoreBattery(input, envelope),
    screen: scoreScreen(input, envelope),
    camera: scoreCamera(input, envelope),
    storage: scoreStorage(input, envelope),
    compatibility: scoreCompatibility(input, envelope),
    delivery: scoreDelivery(input, envelope),
    travel: scoreTravel(input, envelope),
    gaming: scoreGaming(input, envelope),
    work: scoreWork(input, envelope),
    education: scoreEducation(input, envelope),
    weight: scoreWeight(input, envelope),
    brand: scoreBrand(input, envelope),
  };
}

function pickPrimaryConstraint(scores: PurchaseConstraintScores): PurchaseConstraint {
  let best: PurchaseConstraint = "budget";
  let bestScore = -1;
  for (const constraint of CONSTRAINT_ORDER) {
    const score = scores[constraint];
    if (score > bestScore) {
      bestScore = score;
      best = constraint;
    }
  }
  return best;
}

function extractHardRequirements(
  input: PurchaseConstraintsInput,
  envelope: string,
  scores: PurchaseConstraintScores
): string[] {
  const requirements: string[] = [];
  const intent = input.intentEngine.intent;
  const hardLanguage = /\b(must|require|need|only|minimum|at\s+least|essential|mandatory|لازم|ضروري|يجب|فقط)\b/i.test(
    envelope
  );

  if (intent.budget != null) {
    requirements.push(`budget cap: ${intent.currency ?? ""} ${intent.budget}`.trim());
  }
  if (intent.preferredBrand && (hardLanguage || /\bonly\b/i.test(envelope))) {
    requirements.push(`brand requirement: ${intent.preferredBrand}`);
  }
  if (/\b(\d+\s*(tb|gb))\b/i.test(envelope) && (hardLanguage || scores.storage >= 55)) {
    const match = envelope.match(/\b(\d+\s*(?:tb|gb))\b/i);
    if (match) requirements.push(`storage requirement: ${match[1]}`);
  }
  if (scores.battery >= 55 && hardLanguage) requirements.push("battery life requirement");
  if (scores.delivery >= 55 && hardLanguage) requirements.push("delivery timing requirement");
  if (scores.compatibility >= 55 && hardLanguage) requirements.push("compatibility requirement");
  if (scores.camera >= 55 && hardLanguage) requirements.push("camera quality requirement");
  if (scores.weight >= 55 && hardLanguage) requirements.push("weight limit requirement");
  if (intent.excludedBrands.length > 0) {
    requirements.push(`exclude brands: ${intent.excludedBrands.join(", ")}`);
  }

  return uniqueNonEmpty(requirements, 8);
}

function buildConstraintSignals(
  primaryConstraint: PurchaseConstraint,
  scores: PurchaseConstraintScores,
  input: PurchaseConstraintsInput,
  envelope: string,
  hardRequirements: string[]
): string[] {
  const signals = [
    `primary constraint: ${primaryConstraint}`,
    `top score: ${scores[primaryConstraint]}`,
    ...input.conversationalIntent.preferenceSignals.slice(0, 2),
    ...input.purchaseMotivation.motivationSignals.slice(0, 2),
  ];

  if (input.intentEngine.intent.budget != null) {
    signals.push(`budget target: ${input.intentEngine.intent.currency ?? ""} ${input.intentEngine.intent.budget}`.trim());
  }
  if (input.intentEngine.intent.preferredBrand) {
    signals.push(`preferred brand: ${input.intentEngine.intent.preferredBrand}`);
  }
  if (input.intentEngine.intent.useCase) signals.push(`use case: ${input.intentEngine.intent.useCase}`);
  if (hardRequirements.length > 0) signals.push(`hard requirements: ${hardRequirements.length}`);
  if (/must|require|لازم/i.test(envelope)) signals.push("hard requirement language detected");
  if (/gaming|ألعاب/i.test(envelope)) signals.push("gaming constraint detected");
  if (/delivery|توصيل/i.test(envelope)) signals.push("delivery constraint detected");

  return uniqueNonEmpty(signals, 10);
}

function computeConstraintConfidence(args: {
  constraintScores: PurchaseConstraintScores;
  primaryConstraint: PurchaseConstraint;
  constraintSignals: string[];
  hardRequirements: string[];
  conversationalConfidence: number;
  motivationConfidence: number;
}): number {
  const scores = Object.values(args.constraintScores);
  const sorted = [...scores].sort((a, b) => b - a);
  const top = args.constraintScores[args.primaryConstraint];
  const second = sorted[1] ?? 0;
  const separation = Math.max(0, top - second);

  return clampScore(
    top * 0.34 +
      separation * 0.2 +
      Math.min(args.constraintSignals.length, 8) * 4 +
      Math.min(args.hardRequirements.length, 4) * 5 +
      args.conversationalConfidence * 0.12 +
      args.motivationConfidence * 0.08
  );
}

export function buildPurchaseConstraintsEvidenceChain(snapshot: PurchaseConstraintsSnapshot): string[] {
  return uniqueNonEmpty(
    [
      `constraint:${snapshot.primaryConstraint}`,
      `confidence:${snapshot.constraintConfidence}`,
      ...CONSTRAINT_ORDER.map((constraint) => `${constraint}:${snapshot.constraintScores[constraint]}`),
      ...snapshot.hardRequirements.slice(0, 3).map((req) => `requirement:${req}`),
      ...snapshot.constraintSignals.slice(0, 3).map((signal) => `signal:${signal}`),
    ],
    22
  );
}

export function hasPurchaseConstraintsSignal(snapshot: PurchaseConstraintsSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.constraintConfidence >= 0);
}

/** Build purchase constraints snapshot from upstream truth layers. */
export function buildPurchaseConstraintsEngine(
  input: PurchaseConstraintsInput,
  rawQuery: string
): PurchaseConstraintsSnapshot {
  const normalizedQuery = input.intentEngine.normalizedQuery || normalizeShoppingQuery(rawQuery);
  const envelope = queryEnvelope(rawQuery, normalizedQuery);
  const constraintScores = computeConstraintScores(input, envelope);
  const primaryConstraint = pickPrimaryConstraint(constraintScores);
  const hardRequirements = extractHardRequirements(input, envelope, constraintScores);
  const constraintSignals = buildConstraintSignals(
    primaryConstraint,
    constraintScores,
    input,
    envelope,
    hardRequirements
  );
  const constraintConfidence = computeConstraintConfidence({
    constraintScores,
    primaryConstraint,
    constraintSignals,
    hardRequirements,
    conversationalConfidence: input.conversationalIntent.conversationalConfidence,
    motivationConfidence: input.purchaseMotivation.motivationConfidence,
  });

  const snapshot: PurchaseConstraintsSnapshot = {
    primaryConstraint,
    constraintScores,
    hardRequirements,
    constraintSignals,
    constraintConfidence,
    constraintEvidenceChain: [],
  };
  snapshot.constraintEvidenceChain = buildPurchaseConstraintsEvidenceChain(snapshot);

  return snapshot;
}
