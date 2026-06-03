/**
 * Phase 11.0 — Commerce Intelligence Fusion Engine.
 * Fuses all Phase 10.x institutional intelligence into one unified meta assessment.
 * Read-only final meta layer — no upstream or tray mutations.
 */

import type { AlternativeIntelligenceMeta } from "@/lib/intelligence/alternativeIntelligenceEngine";
import type { CompetitiveIntelligenceMeta } from "@/lib/intelligence/competitiveIntelligenceEngine";
import type { ConfidenceIntelligenceMeta } from "@/lib/intelligence/confidenceEngine";
import type { DealIntelligenceMeta } from "@/lib/intelligence/phase109DealIntelligenceEngine";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { ExplainabilityMeta } from "@/lib/intelligence/explainabilityEngine";
import type { IntentAlignmentMeta } from "@/lib/intelligence/intentAlignmentEngine";
import type { MarketContextMeta } from "@/lib/intelligence/marketContextEngine";
import type { PersonalizationMeta } from "@/lib/intelligence/personalizationEngine";
import type { RetailerIntelligenceMeta } from "@/lib/intelligence/retailerIntelligenceEngine";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { QuantProduct } from "@/lib/shoppingScore";

export type FusionTier =
  | "INSTITUTIONAL_GRADE"
  | "PROFESSIONAL_GRADE"
  | "CONSUMER_GRADE"
  | "SPECULATIVE"
  | "WEAK";

export type CommerceFusionMeta = {
  version: "phase11-v1";
  fusionScore: number;
  fusionTier: FusionTier;
  institutionalQuality: number;
  strengths: string[];
  weaknesses: string[];
  warnings: string[];
  recommendationIntegrity: number;
  confidenceIntegrity: number;
};

export type CommerceFusionInput = {
  products: QuantProduct[];
  decisionBrief: DecisionBriefDTO | null;
  verdictIntelligence: VerdictIntelligenceMeta;
  explainability: ExplainabilityMeta;
  alternativeIntelligence: AlternativeIntelligenceMeta;
  marketContext: MarketContextMeta;
  competitiveIntelligence: CompetitiveIntelligenceMeta;
  confidenceIntelligence: ConfidenceIntelligenceMeta;
  intentAlignment: IntentAlignmentMeta;
  personalization: PersonalizationMeta;
  retailerIntelligence: RetailerIntelligenceMeta;
  dealIntelligence: DealIntelligenceMeta;
};

const VERSION = "phase11-v1" as const;
const POSITIVE_VERDICTS = new Set(["STRONG BUY", "BUY READY", "BEST VALUE", "PREMIUM PICK"]);
const NEGATIVE_VERDICTS = new Set(["WAIT", "AVOID", "CONSIDER"]);

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function tierFor(score: number): FusionTier {
  if (score >= 90) return "INSTITUTIONAL_GRADE";
  if (score >= 75) return "PROFESSIONAL_GRADE";
  if (score >= 60) return "CONSUMER_GRADE";
  if (score >= 40) return "SPECULATIVE";
  return "WEAK";
}

function isSparseTray(input: CommerceFusionInput): boolean {
  return Boolean(
    input.decisionBrief?.sparseTrayWarning ||
      input.products.length <= 1 ||
      input.confidenceIntelligence.dataQuality < 55
  );
}

function computeRecommendationStrength(input: CommerceFusionInput): number {
  const v = input.verdictIntelligence;
  let score = v.confidence;
  if (POSITIVE_VERDICTS.has(v.verdict)) score += 8;
  if (NEGATIVE_VERDICTS.has(v.verdict)) score -= 12;
  if (input.competitiveIntelligence.primaryAdvantages.length >= 2) score += 4;
  return clamp(Math.round(score), 0, 100);
}

function computeConfidenceStrength(input: CommerceFusionInput): number {
  return clamp(Math.round(input.confidenceIntelligence.confidenceScore), 0, 100);
}

function computeValueStrength(input: CommerceFusionInput): number {
  return clamp(
    Math.round(
      input.dealIntelligence.dealScore * 0.35 +
        input.dealIntelligence.priceAdvantage * 0.25 +
        input.marketContext.pricingAssessment.strength * 0.2 +
        input.intentAlignment.intentScore * 0.2
    ),
    0,
    100
  );
}

function computeRetailerStrength(input: CommerceFusionInput): number {
  return clamp(Math.round(input.retailerIntelligence.retailerScore), 0, 100);
}

function computeDealStrength(input: CommerceFusionInput): number {
  let score = input.dealIntelligence.dealScore;
  if (input.dealIntelligence.discountAuthenticity >= 72) score += 4;
  if (input.dealIntelligence.competitorGap >= 15) score -= 8;
  return clamp(Math.round(score), 0, 100);
}

function computePersonalizationStrength(input: CommerceFusionInput): number {
  let score = input.personalization.personalizationScore;
  if (input.personalization.sparseMemory) score = Math.min(score, 58);
  return clamp(Math.round(score), 0, 100);
}

function computeCompetitiveStrength(input: CommerceFusionInput): number {
  let score = input.competitiveIntelligence.confidence;
  if (input.competitiveIntelligence.primaryAdvantages.length >= 2) score += 6;
  if (input.competitiveIntelligence.alternativeAdvantages.length >= 2) score -= 8;
  return clamp(Math.round(score), 0, 100);
}

function computeMarketStrength(input: CommerceFusionInput): number {
  const mc = input.marketContext;
  let score = Math.round(mc.confidence * 0.5 + mc.pricingAssessment.strength * 0.3 + mc.pricingAssessment.confidence * 0.2);
  if (mc.marketStatus === "BUY_NOW" || mc.marketStatus === "GOOD_OPPORTUNITY") score += 8;
  if (mc.marketStatus === "OVERPRICED" || mc.marketStatus === "WAIT") score -= 10;
  return clamp(score, 0, 100);
}

function computeExplainabilityStrength(input: CommerceFusionInput): number {
  const basis = input.explainability.recommendationBasis;
  return clamp(
    Math.round((basis.trust + basis.pricing + basis.retailer + basis.intentMatch) / 4),
    0,
    100
  );
}

function computeInstitutionalQuality(
  dims: {
    recommendationStrength: number;
    confidenceStrength: number;
    valueStrength: number;
    retailerStrength: number;
    dealStrength: number;
    personalizationStrength: number;
    competitiveStrength: number;
    marketStrength: number;
    explainabilityStrength: number;
  },
  input: CommerceFusionInput
): number {
  const layerAvg = Math.round(
    (dims.recommendationStrength +
      dims.confidenceStrength +
      dims.valueStrength +
      dims.retailerStrength +
      dims.dealStrength +
      dims.personalizationStrength +
      dims.competitiveStrength +
      dims.marketStrength +
      dims.explainabilityStrength) /
      10
  );
  let score = Math.round(
    layerAvg * 0.7 + input.confidenceIntelligence.dataQuality * 0.15 + input.confidenceIntelligence.trustQuality * 0.15
  );
  if (input.alternativeIntelligence.count >= 2) score += 3;
  if (input.retailerIntelligence.sellerRisk >= 60) score -= 8;
  if (input.dealIntelligence.discountAuthenticity < 50) score -= 8;
  return clamp(score, 0, 100);
}

function computeFusionScore(
  institutionalQuality: number,
  dims: {
    recommendationStrength: number;
    confidenceStrength: number;
    valueStrength: number;
    retailerStrength: number;
    dealStrength: number;
  },
  input: CommerceFusionInput,
  sparseTray: boolean
): number {
  let score = Math.round(
    institutionalQuality * 0.35 +
      dims.recommendationStrength * 0.15 +
      dims.confidenceStrength * 0.15 +
      dims.valueStrength * 0.1 +
      dims.retailerStrength * 0.1 +
      dims.dealStrength * 0.15
  );

  if (NEGATIVE_VERDICTS.has(input.verdictIntelligence.verdict)) {
    score = Math.min(score, 58);
  }
  if (input.retailerIntelligence.retailerTier === "RISKY" || input.retailerIntelligence.retailerTier === "CAUTION") {
    score = Math.min(score, 68);
  }
  if (input.dealIntelligence.dealTier === "WEAK") score = Math.min(score, 62);
  if (sparseTray) score = Math.min(score, 72);

  return clamp(score, 0, 100);
}

function computeRecommendationIntegrity(input: CommerceFusionInput): number {
  return clamp(
    Math.round(
      input.verdictIntelligence.confidence * 0.35 +
        input.competitiveIntelligence.confidence * 0.25 +
        input.intentAlignment.intentScore * 0.25 +
        input.explainability.recommendationBasis.intentMatch * 0.15
    ),
    0,
    100
  );
}

function computeConfidenceIntegrity(input: CommerceFusionInput): number {
  return clamp(
    Math.round(
      input.confidenceIntelligence.confidenceScore * 0.4 +
        input.dealIntelligence.dealConfidence * 0.2 +
        input.retailerIntelligence.retailerConfidence * 0.2 +
        computeExplainabilityStrength(input) * 0.2
    ),
    0,
    100
  );
}

function buildStrengths(input: CommerceFusionInput, dims: Record<string, number>): string[] {
  const out: string[] = [];
  if (POSITIVE_VERDICTS.has(input.verdictIntelligence.verdict)) {
    out.push(`${input.verdictIntelligence.verdict} institutional verdict supports fusion quality`);
  }
  if (dims.confidenceStrength >= 75) out.push("High unified confidence across intelligence layers");
  if (dims.dealStrength >= 72) out.push("Deal intelligence confirms favorable tray-relative value");
  if (dims.retailerStrength >= 72) out.push("Retailer intelligence supports trusted checkout posture");
  if (dims.competitiveStrength >= 70) out.push("Primary maintains competitive advantage versus alternatives");
  if (dims.marketStrength >= 68) out.push("Market context supports institutional recommendation timing");
  if (dims.explainabilityStrength >= 68) out.push("Explainability layer provides coherent institutional rationale");
  if (input.intentAlignment.intentTier === "VERY_HIGH" || input.intentAlignment.intentTier === "HIGH") {
    out.push("Strong intent alignment with interpreted shopping query");
  }
  return [...new Set(out)].slice(0, 6);
}

function buildWeaknesses(input: CommerceFusionInput, dims: Record<string, number>): string[] {
  const out: string[] = [];
  if (NEGATIVE_VERDICTS.has(input.verdictIntelligence.verdict)) {
    out.push(`${input.verdictIntelligence.verdict} verdict constrains institutional fusion quality`);
  }
  if (dims.confidenceStrength < 55) out.push("Unified confidence is below institutional thresholds");
  if (dims.retailerStrength < 55) out.push("Retailer quality weakens overall commerce fusion");
  if (dims.dealStrength < 55) out.push("Deal profile does not strongly support value claims");
  if (input.personalization.sparseMemory) out.push("Sparse personalization memory limits preference alignment");
  if (input.competitiveIntelligence.alternativeAdvantages.length >= 2) {
    out.push("Alternatives expose meaningful competitive pressure");
  }
  return [...new Set(out)].slice(0, 6);
}

function buildWarnings(input: CommerceFusionInput, sparseTray: boolean): string[] {
  const out: string[] = [];
  if (sparseTray) out.push("Sparse tray caps institutional fusion confidence");
  for (const w of input.dealIntelligence.dealWarnings.slice(0, 2)) {
    if (!out.includes(w)) out.push(w);
  }
  for (const w of input.retailerIntelligence.retailerWarnings.slice(0, 2)) {
    if (!out.includes(w)) out.push(w);
  }
  for (const w of input.confidenceIntelligence.uncertaintyFactors.slice(0, 1)) {
    if (!out.includes(w)) out.push(w);
  }
  for (const c of input.personalization.conflicts.slice(0, 1)) {
    if (!out.includes(c)) out.push(c);
  }
  return out.slice(0, 5);
}

function buildFusionSummary(tier: FusionTier, score: number, institutionalQuality: number): string {
  switch (tier) {
    case "INSTITUTIONAL_GRADE":
      return `Institutional-grade commerce fusion (${score}/100) — all intelligence layers align with quality ${institutionalQuality}/100.`;
    case "PROFESSIONAL_GRADE":
      return `Professional-grade institutional assessment (${score}/100) with strong cross-layer coherence.`;
    case "CONSUMER_GRADE":
      return `Consumer-grade fusion (${score}/100) — recommendation is usable but not all layers are strongly aligned.`;
    case "SPECULATIVE":
      return `Speculative fusion (${score}/100) — review weaknesses before acting on this recommendation.`;
    default:
      return `Weak institutional fusion (${score}/100) — intelligence layers show material misalignment.`;
  }
}

/** Build fused commerce intelligence meta from Phase 10.x layers. */
export function buildCommerceFusion(input: CommerceFusionInput): CommerceFusionMeta {
  const sparseTray = isSparseTray(input);

  const dims = {
    recommendationStrength: computeRecommendationStrength(input),
    confidenceStrength: computeConfidenceStrength(input),
    valueStrength: computeValueStrength(input),
    retailerStrength: computeRetailerStrength(input),
    dealStrength: computeDealStrength(input),
    personalizationStrength: computePersonalizationStrength(input),
    competitiveStrength: computeCompetitiveStrength(input),
    marketStrength: computeMarketStrength(input),
    explainabilityStrength: computeExplainabilityStrength(input),
  };

  const institutionalQuality = computeInstitutionalQuality(dims, input);
  const fusionScore = computeFusionScore(
    institutionalQuality,
    dims,
    input,
    sparseTray
  );
  const fusionTier = tierFor(fusionScore);
  const recommendationIntegrity = computeRecommendationIntegrity(input);
  const confidenceIntegrity = computeConfidenceIntegrity(input);
  const strengths = buildStrengths(input, dims);
  const weaknesses = buildWeaknesses(input, dims);
  const warnings = buildWarnings(input, sparseTray);

  return {
    version: VERSION,
    fusionScore,
    fusionTier,
    institutionalQuality,
    strengths,
    weaknesses,
    warnings,
    recommendationIntegrity,
    confidenceIntegrity,
  };
}

/** Post-deal fusion pass — meta + decision brief only. */
export function applyCommerceFusion(input: CommerceFusionInput): {
  meta: CommerceFusionMeta;
  decisionBrief: DecisionBriefDTO | null;
  products: QuantProduct[];
} {
  const meta = buildCommerceFusion(input);

  if (!input.decisionBrief) {
    return { meta, decisionBrief: null, products: input.products };
  }

  const decisionBrief: DecisionBriefDTO = {
    ...input.decisionBrief,
    fusionSummary: buildFusionSummary(meta.fusionTier, meta.fusionScore, meta.institutionalQuality),
  };

  return { meta, decisionBrief, products: input.products };
}
