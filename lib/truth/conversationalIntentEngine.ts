/**
 * Phase 2G — Conversational intent intelligence layer.
 * Upgrades structured intent parsing into conversational buying-intent understanding.
 */

import type { IntentSnapshot } from "@/lib/truth/intentIntelligenceEngine";
import { normalizeShoppingQuery } from "@/lib/truth/intentIntelligenceEngine";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type ConversationalLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type ExpertiseLevel = "BEGINNER" | "INTERMEDIATE" | "EXPERT" | "UNKNOWN";
export type BrandFlexibility = "FIXED" | "PREFERRED" | "FLEXIBLE";

export type ConversationalIntentSnapshot = {
  explicitIntent: string;
  implicitIntent: string;
  shoppingGoal: string;
  userContext: string;
  expertiseLevel: ExpertiseLevel;
  urgencyLevel: ConversationalLevel;
  budgetSensitivity: ConversationalLevel;
  qualitySensitivity: ConversationalLevel;
  brandFlexibility: BrandFlexibility;
  riskTolerance: ConversationalLevel;
  preferenceSignals: string[];
  conversationalConfidence: number;
};

export type ConversationalIntentInput = Omit<TruthFoundationSnapshot, "conversationalIntent" | "tastePreference" | "userDecisionIntelligence" | "purchaseMotivation">;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function uniqueNonEmpty(items: string[], limit = 8): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

function queryEnvelope(rawQuery: string, normalizedQuery: string): string {
  return `${rawQuery} ${normalizedQuery}`.toLowerCase().replace(/\s+/g, " ").trim();
}

function deriveExplicitIntent(intent: IntentSnapshot, envelope: string): string {
  const parts: string[] = [];
  if (intent.qualityLevel === "best") parts.push("Find the best");
  else if (intent.qualityLevel === "budget") parts.push("Find an affordable");
  else if (intent.qualityLevel === "premium") parts.push("Find a premium");
  else parts.push("Find a");

  if (intent.preferredBrand) parts.push(intent.preferredBrand);
  if (intent.productType) parts.push(intent.productType);
  if (intent.useCase) parts.push(`for ${intent.useCase}`);
  if (intent.budget != null) parts.push(`under ${intent.currency ?? "budget"} ${intent.budget}`);

  if (/\bgood\s+camera\b/i.test(envelope) || /كاميرا\s*جيد/i.test(envelope)) {
    parts.push("with strong camera performance");
  }
  if (/\blightweight\b/i.test(envelope) || /خفيف/i.test(envelope)) {
    parts.push("that is lightweight");
  }
  if (/not\s+overpriced|without\s+overpay/i.test(envelope)) {
    parts.push("without overpaying");
  }
  if (/تصوير\s*الليل/i.test(envelope) || /\bnight\s+(photo|photography|shooting)\b/i.test(envelope)) {
    parts.push("for night photography");
  }

  return parts.join(" ").replace(/\s+/g, " ").trim() || "Find products matching the search query";
}

function deriveImplicitIntent(intent: IntentSnapshot, envelope: string): string {
  if (/\btravel\b/i.test(envelope) || /(?:\s|^)سفر/i.test(envelope) || intent.useCase === "travel") {
    return "Portability and reliability matter more than raw specs";
  }
  if (intent.useCase === "gaming") {
    return "Performance-first purchase with use-case tuned hardware";
  }
  if (/\bgood\s+camera\b/i.test(envelope) || /تصوير/i.test(envelope)) {
    return "Imaging quality is a primary decision driver";
  }
  if (/premium\s+but\s+not\s+overpriced|not\s+overpriced/i.test(envelope) || intent.qualityLevel === "premium") {
    return "Quality-conscious buyer seeking premium feel at fair value";
  }
  if (intent.qualityLevel === "budget" || intentRewriteBudgetSensitive(intent, envelope)) {
    return "Value-first purchase with cost control";
  }
  if (intent.preferredBrand && intent.productType) {
    return `Brand-aware ${intent.productType} purchase`;
  }
  return "General product discovery with moderate specificity";
}

function deriveShoppingGoal(intent: IntentSnapshot, envelope: string): string {
  if (intent.productType && intent.useCase) {
    return `Buy a ${intent.productType} optimized for ${intent.useCase}`;
  }
  if (intent.productType && intent.budget != null) {
    return `Buy a ${intent.productType} within ${intent.currency ?? "budget"} ${intent.budget}`;
  }
  if (intent.productType) return `Buy a suitable ${intent.productType}`;
  if (/\bgift\b/i.test(envelope)) return "Buy a gift-ready product";
  return "Find the right product for this search";
}

function deriveUserContext(intent: IntentSnapshot, envelope: string): string {
  if (/\btravel\s+a\s+lot\b/i.test(envelope) || /(?:\s|^)سفر/i.test(envelope)) {
    return "Frequent traveler prioritizing portability";
  }
  if (/\bwork\s+from\s+home\b|\bremote\s+work\b/i.test(envelope)) {
    return "Remote worker needing dependable daily gear";
  }
  if (intent.useCase === "student") return "Student buyer balancing price and capability";
  if (intent.useCase === "gaming") return "Gamer prioritizing performance for play";
  if (intent.useCase === "photography" || /تصوير/i.test(envelope)) {
    return "Photography-focused buyer evaluating capture quality";
  }
  if (intent.qualityLevel === "premium") return "Premium-oriented shopper comparing value tiers";
  return intent.productType ? `${intent.productType} shopper with stated search constraints` : "General online shopper";
}

function intentRewriteBudgetSensitive(intent: IntentSnapshot, envelope: string): boolean {
  return (
    intent.qualityLevel === "budget" ||
    /\b(cheap|budget|affordable|under|not\s+overpriced|رخيص|أرخص|تحت)\b/i.test(envelope)
  );
}

function deriveExpertiseLevel(intent: IntentSnapshot, envelope: string, intentConfidence: number): ExpertiseLevel {
  if (
    /\b(rtx|mirrorless|aperture|fps|specs|technical|professional|pro\b|احتراف)/i.test(envelope) ||
    intent.qualityLevel === "professional"
  ) {
    return "EXPERT";
  }
  if (/\b(simple|easy|beginner|basic|don't\s+know|idk|help\s+me\s+choose)\b/i.test(envelope)) {
    return "BEGINNER";
  }
  if (intentConfidence >= 55 || intent.productType) return "INTERMEDIATE";
  return "UNKNOWN";
}

function deriveUrgencyLevel(intent: IntentSnapshot, envelope: string): ConversationalLevel {
  if (intent.urgency === "high" || /\b(asap|urgent|today|buy\s+now)\b/i.test(envelope)) return "HIGH";
  if (intent.urgency === "medium" || /\b(soon|this\s+week|need\s+it)\b/i.test(envelope)) return "MEDIUM";
  return "LOW";
}

function deriveBudgetSensitivity(intent: IntentSnapshot, envelope: string): ConversationalLevel {
  if (intent.budget != null || intentRewriteBudgetSensitive(intent, envelope)) {
    return intent.budget != null || /\b(under|below|cheap|budget|not\s+overpriced|تحت|رخيص)\b/i.test(envelope)
      ? "HIGH"
      : "MEDIUM";
  }
  if (intent.qualityLevel === "premium" || intent.qualityLevel === "best") return "MEDIUM";
  return "LOW";
}

function deriveQualitySensitivity(intent: IntentSnapshot, envelope: string): ConversationalLevel {
  if (
    intent.qualityLevel === "best" ||
    intent.qualityLevel === "premium" ||
    intent.qualityLevel === "professional" ||
    /\b(good\s+camera|best|premium|flagship|افضل|أفضل|فاخر)/i.test(envelope)
  ) {
    return "HIGH";
  }
  if (intent.qualityLevel === "budget" || /\bcheap\b/i.test(envelope)) return "LOW";
  return "MEDIUM";
}

function deriveBrandFlexibility(intent: IntentSnapshot, envelope: string): BrandFlexibility {
  if (/\biphone\b/i.test(envelope) || (intent.preferredBrand && /\bonly\b/i.test(envelope))) {
    return "FIXED";
  }
  if (intent.preferredBrand || intent.excludedBrands.length > 0) return "PREFERRED";
  return "FLEXIBLE";
}

function deriveRiskTolerance(
  intent: IntentSnapshot,
  envelope: string,
  commerceConfidence: number
): ConversationalLevel {
  if (/\b(safe|reliable|trusted|verified|original|warranty)\b/i.test(envelope) || commerceConfidence >= 65) {
    return "LOW";
  }
  if (/\b(deal|flash|refurb|used|open\s+box|risk)\b/i.test(envelope) || commerceConfidence < 45) {
    return "HIGH";
  }
  return "MEDIUM";
}

function buildPreferenceSignals(intent: IntentSnapshot, envelope: string): string[] {
  const signals: string[] = [];
  if (intent.useCase) signals.push(`${intent.useCase} use case`);
  if (intent.budget != null) signals.push(`budget ceiling ${intent.currency ?? ""} ${intent.budget}`.trim());
  if (intent.preferredBrand) signals.push(`brand preference: ${intent.preferredBrand}`);
  for (const brand of intent.excludedBrands) signals.push(`exclude brand: ${brand}`);
  if (/\blightweight\b/i.test(envelope)) signals.push("portability");
  if (/\bgood\s+camera\b/i.test(envelope)) signals.push("camera quality");
  if (/تصوير\s*الليل/i.test(envelope) || /\bnight\s+(photo|photography)\b/i.test(envelope)) {
    signals.push("night photography");
  }
  if (/not\s+overpriced/i.test(envelope)) signals.push("fair premium pricing");
  if (intent.qualityLevel) signals.push(`${intent.qualityLevel} quality tier`);
  if (intentRewriteBudgetSensitive(intent, envelope)) signals.push("price sensitivity");
  return uniqueNonEmpty(signals, 8);
}

function computeConversationalConfidence(args: {
  intentConfidence: number;
  intentCompleteness: number;
  preferenceSignals: string[];
  explicitIntent: string;
  commerceConfidence: number;
}): number {
  return clampScore(
    args.intentConfidence * 0.34 +
      args.intentCompleteness * 0.24 +
      Math.min(args.preferenceSignals.length, 6) * 5 +
      args.commerceConfidence * 0.12 +
      (args.explicitIntent.length > 20 ? 8 : 4)
  );
}

export function buildConversationalIntentEvidenceChain(snapshot: ConversationalIntentSnapshot): string[] {
  return uniqueNonEmpty(
    [
      `explicit:${snapshot.explicitIntent}`,
      `implicit:${snapshot.implicitIntent}`,
      `goal:${snapshot.shoppingGoal}`,
      `context:${snapshot.userContext}`,
      `expertise:${snapshot.expertiseLevel}`,
      `urgency:${snapshot.urgencyLevel}`,
      `budget_sensitivity:${snapshot.budgetSensitivity}`,
      `quality_sensitivity:${snapshot.qualitySensitivity}`,
      `brand_flexibility:${snapshot.brandFlexibility}`,
      `risk_tolerance:${snapshot.riskTolerance}`,
      `confidence:${snapshot.conversationalConfidence}`,
      ...snapshot.preferenceSignals.slice(0, 4).map((signal) => `preference:${signal}`),
    ],
    14
  );
}

export function hasConversationalIntentSignal(snapshot: ConversationalIntentSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.conversationalConfidence >= 0);
}

/** Build conversational buying-intent snapshot from query + intelligence layers. */
export function buildConversationalIntentEngine(
  input: ConversationalIntentInput,
  rawQuery: string
): ConversationalIntentSnapshot {
  const normalizedQuery = input.intentEngine.normalizedQuery || normalizeShoppingQuery(rawQuery);
  const envelope = queryEnvelope(rawQuery, normalizedQuery);
  const intent = input.intentEngine.intent;
  const commerceConfidence = input.commerceIntelligence.commerceConfidence;

  const explicitIntent = deriveExplicitIntent(intent, envelope);
  const implicitIntent = deriveImplicitIntent(intent, envelope);
  const shoppingGoal = deriveShoppingGoal(intent, envelope);
  const userContext = deriveUserContext(intent, envelope);
  const preferenceSignals = buildPreferenceSignals(intent, envelope);
  const conversationalConfidence = computeConversationalConfidence({
    intentConfidence: input.intentEngine.intentConfidence,
    intentCompleteness: input.intentEngine.intentCompleteness,
    preferenceSignals,
    explicitIntent,
    commerceConfidence,
  });

  return {
    explicitIntent,
    implicitIntent,
    shoppingGoal,
    userContext,
    expertiseLevel: deriveExpertiseLevel(intent, envelope, input.intentEngine.intentConfidence),
    urgencyLevel: deriveUrgencyLevel(intent, envelope),
    budgetSensitivity: deriveBudgetSensitivity(intent, envelope),
    qualitySensitivity: deriveQualitySensitivity(intent, envelope),
    brandFlexibility: deriveBrandFlexibility(intent, envelope),
    riskTolerance: deriveRiskTolerance(intent, envelope, commerceConfidence),
    preferenceSignals,
    conversationalConfidence,
  };
}
