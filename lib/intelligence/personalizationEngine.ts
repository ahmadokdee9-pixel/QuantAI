/**
 * Phase 10.7 — Personalization Intelligence Engine.
 * Measures alignment between the primary recommendation and known shopping preferences.
 * Read-only meta layer — no tray, verdict, or ranking mutations.
 */

import type { AlternativeIntelligenceMeta } from "@/lib/intelligence/alternativeIntelligenceEngine";
import type { CompetitiveIntelligenceMeta } from "@/lib/intelligence/competitiveIntelligenceEngine";
import type { ConfidenceIntelligenceMeta } from "@/lib/intelligence/confidenceEngine";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { ExplainabilityMeta } from "@/lib/intelligence/explainabilityEngine";
import type { IntentAlignmentMeta } from "@/lib/intelligence/intentAlignmentEngine";
import type { MarketContextMeta } from "@/lib/intelligence/marketContextEngine";
import type { Phase95CommerceMemoryMeta, Phase95PriceTier } from "@/lib/intelligence/phase95CommerceMemory";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";
import type { QuantProduct } from "@/lib/shoppingScore";

export type PersonalizationTier = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";

export type PersonalizationMeta = {
  version: "phase10.7-v1";
  personalizationScore: number;
  personalizationTier: PersonalizationTier;
  brandAffinity: number;
  budgetAlignment: number;
  qualityPreferenceAlignment: number;
  valuePreferenceAlignment: number;
  preferenceDrivers: string[];
  conflicts: string[];
  summary: string;
  sparseMemory: boolean;
};

export type PersonalizationInput = {
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
  intentAlignment: IntentAlignmentMeta;
};

const VERSION = "phase10.7-v1" as const;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function tierFor(score: number): PersonalizationTier {
  if (score >= 90) return "VERY_HIGH";
  if (score >= 75) return "HIGH";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "LOW";
  return "VERY_LOW";
}

function primaryTitle(input: PersonalizationInput): string {
  return (
    input.competitiveIntelligence.primaryProduct.title ||
    input.decisionBrief?.recommendation.title ||
    ""
  );
}

function primaryPrice(input: PersonalizationInput): number | null {
  return (
    input.competitiveIntelligence.primaryProduct.price ??
    input.decisionBrief?.recommendation.price ??
    null
  );
}

function titleHasBrand(title: string, brand: string | null): boolean {
  if (!brand || brand.length < 2) return false;
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(title);
}

function isSparseMemory(input: PersonalizationInput): boolean {
  const sig = input.commerceMemory.preferenceSignals;

  const hasHistoricalSession =
    sig.sessionBrandHits.length > 0 ||
    sig.sessionCategoryHits.length > 0 ||
    sig.repeatedQueryFamily != null;

  return !hasHistoricalSession;
}

function computeBrandAffinity(input: PersonalizationInput): number {
  const title = primaryTitle(input);
  const mem = input.commerceMemory;
  const sig = mem.preferenceSignals;
  const queryBrand = input.queryIntelligence.detectedIntent.brand;

  let score = 48;

  if (titleHasBrand(title, mem.inferredBrandAffinity)) score += 28;
  if (titleHasBrand(title, sig.preferredBrand)) score += 22;
  if (titleHasBrand(title, queryBrand)) score += 16;
  if (sig.sessionBrandHits.some((b) => titleHasBrand(title, b))) score += 18;
  if (mem.inferredBrandAffinity && queryBrand && mem.inferredBrandAffinity === queryBrand) score += 8;

  if (!queryBrand && !sig.preferredBrand && !mem.inferredBrandAffinity && sig.sessionBrandHits.length === 0) {
    score = Math.min(score, 52);
  }

  return clamp(Math.round(score), 0, 100);
}

function priceTierFit(tier: Phase95PriceTier, price: number | null): number {
  if (price == null || price <= 0) return 50;
  switch (tier) {
    case "budget":
      return price <= 180 ? 88 : price <= 350 ? 68 : price <= 600 ? 48 : 32;
    case "value":
      return price <= 450 ? 82 : price <= 900 ? 68 : price <= 1500 ? 52 : 40;
    case "premium":
      return price >= 900 ? 84 : price >= 500 ? 68 : price >= 300 ? 52 : 38;
    default:
      return 58;
  }
}

function computeBudgetAlignment(input: PersonalizationInput): number {
  const mem = input.commerceMemory;
  const sig = mem.preferenceSignals;
  const price = primaryPrice(input);
  const budget = input.queryIntelligence.constraints.budget;

  let score = priceTierFit(mem.inferredPriceTier, price);
  score = Math.round(score * 0.55 + priceTierFit(sig.priceTier, price) * 0.45);

  if (budget.active && price != null && budget.maxPrice != null) {
    if (price <= budget.maxPrice) score += 12;
    else score -= 20;
  }

  if (sig.budgetIntent01 >= 0.6 && price != null && price > 0) {
    if (mem.inferredPriceTier === "budget" || mem.inferredPriceTier === "value") score += 8;
  }
  if (sig.premiumIntent01 >= 0.6 && mem.inferredPriceTier === "premium") score += 8;

  return clamp(Math.round(score), 0, 100);
}

function computeQualityPreferenceAlignment(input: PersonalizationInput): number {
  const sig = input.commerceMemory.preferenceSignals;
  const basis = input.explainability.recommendationBasis;
  const trust = input.confidenceIntelligence.trustQuality;

  let score = Math.round(basis.trust * 0.35 + basis.retailer * 0.25 + trust * 0.25 + sig.premiumIntent01 * 100 * 0.15);

  if (sig.retailerTrustPreference === "trusted_first" && basis.trust >= 70) score += 10;
  if (input.verdictIntelligence.verdict === "PREMIUM PICK" && sig.premiumIntent01 >= 0.55) score += 12;
  if (input.intentAlignment.primaryIntent === "premium_quality" && basis.trust >= 68) score += 8;
  if (sig.premiumIntent01 < 0.35) score = Math.round(score * 0.85 + 50 * 0.15);

  return clamp(Math.round(score), 0, 100);
}

function computeValuePreferenceAlignment(input: PersonalizationInput): number {
  const sig = input.commerceMemory.preferenceSignals;
  const basis = input.explainability.recommendationBasis;
  const mc = input.marketContext;

  let score = Math.round(
    basis.pricing * 0.3 +
      mc.pricingAssessment.strength * 0.25 +
      sig.budgetIntent01 * 100 * 0.2 +
      input.intentAlignment.intentScore * 0.15 +
      input.competitiveIntelligence.confidence * 0.1
  );

  if (input.verdictIntelligence.verdict === "BEST VALUE") score += 12;
  if (sig.priceTier === "value" || sig.priceTier === "budget") score += 8;
  if (input.intentAlignment.primaryIntent === "best_value" || input.intentAlignment.primaryIntent === "lowest_price") {
    score += 8;
  }
  if (mc.marketStatus === "BUY_NOW" || mc.marketStatus === "GOOD_OPPORTUNITY") score += 6;
  if (sig.budgetIntent01 < 0.35 && sig.premiumIntent01 >= 0.55) {
    score = Math.round(score * 0.82 + 50 * 0.18);
  }

  return clamp(Math.round(score), 0, 100);
}

function computeHistoricalPreferenceConsistency(input: PersonalizationInput): number {
  const mem = input.commerceMemory;
  const sig = mem.preferenceSignals;
  const basis = input.explainability.recommendationBasis;

  let score = Math.round(mem.confidence * 100 * 0.35 + basis.memoryAlignment * 0.35 + input.intentAlignment.intentScore * 0.2);

  if (sig.repeatedQueryFamily) score += 12;
  if (sig.sessionCategoryHits.length >= 1) score += 8;
  if (sig.sessionBrandHits.length >= 1) score += 8;
  if (mem.appliedAdjustments.length > 0) score += 6;
  if (input.alternativeIntelligence.count >= 2) score += 4;

  return clamp(Math.round(score), 0, 100);
}

function computePersonalizationScore(
  dims: {
    brandAffinity: number;
    budgetAlignment: number;
    qualityPreferenceAlignment: number;
    valuePreferenceAlignment: number;
    historicalPreferenceConsistency: number;
  },
  sparseMemory: boolean
): number {
  let score = Math.round(
    dims.brandAffinity * 0.22 +
      dims.budgetAlignment * 0.2 +
      dims.qualityPreferenceAlignment * 0.18 +
      dims.valuePreferenceAlignment * 0.18 +
      dims.historicalPreferenceConsistency * 0.22
  );

  if (sparseMemory) score = Math.min(score, 58);

  return clamp(score, 0, 100);
}

function buildPreferenceDrivers(
  input: PersonalizationInput,
  dims: {
    brandAffinity: number;
    budgetAlignment: number;
    qualityPreferenceAlignment: number;
    valuePreferenceAlignment: number;
    historicalPreferenceConsistency: number;
  },
  sparseMemory: boolean
): string[] {
  const out: string[] = [];
  const sig = input.commerceMemory.preferenceSignals;

  if (dims.brandAffinity >= 70) out.push("Primary pick aligns with inferred or session brand preference");
  if (dims.budgetAlignment >= 68) out.push("Price profile matches inferred budget/value tier");
  if (dims.qualityPreferenceAlignment >= 68 && sig.premiumIntent01 >= 0.55) {
    out.push("Quality and trust signals match premium shopping preference");
  }
  if (dims.valuePreferenceAlignment >= 68 && (sig.budgetIntent01 >= 0.55 || sig.priceTier === "value")) {
    out.push("Value and pricing signals match deal-seeking preference");
  }
  if (dims.historicalPreferenceConsistency >= 65) {
    out.push("Session commerce memory reinforces this recommendation");
  }
  if (input.explainability.recommendationBasis.memoryAlignment >= 70) {
    out.push("Explainability memory alignment supports personalization");
  }
  if (sig.repeatedQueryFamily) out.push(`Repeated interest in ${sig.repeatedQueryFamily} query family`);
  if (sparseMemory) out.push("Sparse session memory — personalization based mainly on current query signals");

  return [...new Set(out)].slice(0, 6);
}

function buildConflicts(
  input: PersonalizationInput,
  dims: {
    brandAffinity: number;
    budgetAlignment: number;
    qualityPreferenceAlignment: number;
    valuePreferenceAlignment: number;
  },
  sparseMemory: boolean
): string[] {
  const out: string[] = [];
  const sig = input.commerceMemory.preferenceSignals;
  const budget = input.queryIntelligence.constraints.budget;
  const price = primaryPrice(input);

  if (sparseMemory) {
    out.push("Sparse session memory limits personalization confidence");
  }
  if (dims.brandAffinity < 50 && (sig.preferredBrand || input.commerceMemory.inferredBrandAffinity)) {
    out.push("Primary brand does not strongly match known brand preferences");
  }
  if (dims.budgetAlignment < 50 && sig.priceTier !== "balanced") {
    out.push("Primary price profile diverges from inferred budget tier");
  }
  if (dims.qualityPreferenceAlignment < 50 && sig.premiumIntent01 >= 0.6) {
    out.push("Premium quality preference not fully reflected in primary trust profile");
  }
  if (dims.valuePreferenceAlignment < 50 && sig.budgetIntent01 >= 0.6) {
    out.push("Value-seeking preference not fully reflected in primary pricing profile");
  }
  if (budget.active && price != null && budget.maxPrice != null && price > budget.maxPrice) {
    out.push("Primary price exceeds stated budget preference");
  }
  if (input.competitiveIntelligence.alternativeAdvantages.length >= 2) {
    out.push("Strong alternatives may better match some historical preferences");
  }

  return [...new Set(out)].slice(0, 5);
}

function buildSummary(
  tier: PersonalizationTier,
  score: number,
  sparseMemory: boolean,
  brandAffinity: number
): string {
  if (sparseMemory) {
    return `Personalization is limited by sparse session memory (${score}/100) — current query signals provide directional alignment only.`;
  }
  if (tier === "VERY_HIGH" || tier === "HIGH") {
    return `Recommendation aligns strongly with known shopping preferences (${score}/100), especially brand and budget signals.`;
  }
  if (tier === "MEDIUM") {
    return `Recommendation partially aligns with shopping preferences (${score}/100) — some preference tradeoffs remain.`;
  }
  if (brandAffinity < 45) {
    return `Recommendation shows weak alignment with known brand and preference history (${score}/100).`;
  }
  return `Recommendation shows limited alignment with accumulated shopping preferences (${score}/100).`;
}

/** Build personalization meta from consumed intelligence layers. */
export function buildPersonalizationIntelligence(input: PersonalizationInput): PersonalizationMeta {
  const sparseMemory = isSparseMemory(input);
  const brandAffinity = computeBrandAffinity(input);
  const budgetAlignment = computeBudgetAlignment(input);
  const qualityPreferenceAlignment = computeQualityPreferenceAlignment(input);
  const valuePreferenceAlignment = computeValuePreferenceAlignment(input);
  const historicalPreferenceConsistency = computeHistoricalPreferenceConsistency(input);

  const dims = {
    brandAffinity,
    budgetAlignment,
    qualityPreferenceAlignment,
    valuePreferenceAlignment,
    historicalPreferenceConsistency,
  };

  const personalizationScore = computePersonalizationScore(dims, sparseMemory);
  const personalizationTier = tierFor(personalizationScore);
  const preferenceDrivers = buildPreferenceDrivers(input, dims, sparseMemory);
  const conflicts = buildConflicts(input, dims, sparseMemory);
  const summary = buildSummary(personalizationTier, personalizationScore, sparseMemory, brandAffinity);

  return {
    version: VERSION,
    personalizationScore,
    personalizationTier,
    brandAffinity,
    budgetAlignment,
    qualityPreferenceAlignment,
    valuePreferenceAlignment,
    preferenceDrivers,
    conflicts,
    summary,
    sparseMemory,
  };
}

/** Post-intent-alignment personalization pass — meta + decision brief only. */
export function applyPersonalizationIntelligence(input: PersonalizationInput): {
  meta: PersonalizationMeta;
  decisionBrief: DecisionBriefDTO | null;
  products: QuantProduct[];
} {
  const meta = buildPersonalizationIntelligence(input);

  if (!input.decisionBrief) {
    return { meta, decisionBrief: null, products: input.products };
  }

  const decisionBrief: DecisionBriefDTO = {
    ...input.decisionBrief,
    personalizationSummary: meta.summary,
  };

  return { meta, decisionBrief, products: input.products };
}
