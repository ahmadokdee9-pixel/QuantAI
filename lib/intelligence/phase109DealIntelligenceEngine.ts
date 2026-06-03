/**
 * Phase 10.9 — Deal Intelligence Meta Engine.
 * Evaluates whether the primary offer is a good deal vs tray market value.
 * Read-only meta layer — no tray reorder, verdict, or ranking mutations.
 *
 * Distinct from lib/intelligence/dealIntelligenceEngine.ts (per-product deal intel).
 */

import type { AlternativeIntelligenceMeta } from "@/lib/intelligence/alternativeIntelligenceEngine";
import type { CompetitiveIntelligenceMeta } from "@/lib/intelligence/competitiveIntelligenceEngine";
import type { ConfidenceIntelligenceMeta } from "@/lib/intelligence/confidenceEngine";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { ExplainabilityMeta } from "@/lib/intelligence/explainabilityEngine";
import type { IntentAlignmentMeta } from "@/lib/intelligence/intentAlignmentEngine";
import type { MarketContextMeta } from "@/lib/intelligence/marketContextEngine";
import type { PersonalizationMeta } from "@/lib/intelligence/personalizationEngine";
import type { RetailerIntelligenceMeta } from "@/lib/intelligence/retailerIntelligenceEngine";
import type {
  Phase93TrustDiscountMeta,
  ProductTrustDiscountAssessment,
} from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { Phase92TrayIntegrityMeta } from "@/lib/search/phase92TrayIntegrity";
import type { SparseResultAssessment } from "@/lib/search/sparseResultIntelligence";
import type { QuantProduct } from "@/lib/shoppingScore";

export type DealTier = "EXCEPTIONAL" | "STRONG" | "GOOD" | "AVERAGE" | "WEAK";

export type DealIntelligenceMeta = {
  version: "phase10.9-v1";
  dealScore: number;
  dealTier: DealTier;
  dealConfidence: number;
  dealAdvantages: string[];
  dealWarnings: string[];
  priceAdvantage: number;
  discountAuthenticity: number;
  competitorGap: number;
};

export type DealIntelligenceInput = {
  products: QuantProduct[];
  decisionBrief: DecisionBriefDTO | null;
  phase92: Phase92TrayIntegrityMeta;
  phase93: Phase93TrustDiscountMeta;
  sparse?: SparseResultAssessment;
  verdictIntelligence: VerdictIntelligenceMeta;
  explainability: ExplainabilityMeta;
  alternativeIntelligence: AlternativeIntelligenceMeta;
  marketContext: MarketContextMeta;
  competitiveIntelligence: CompetitiveIntelligenceMeta;
  confidenceIntelligence: ConfidenceIntelligenceMeta;
  intentAlignment: IntentAlignmentMeta;
  personalization: PersonalizationMeta;
  retailerIntelligence: RetailerIntelligenceMeta;
};

const VERSION = "phase10.9-v1" as const;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function tierFor(score: number): DealTier {
  if (score >= 90) return "EXCEPTIONAL";
  if (score >= 75) return "STRONG";
  if (score >= 60) return "GOOD";
  if (score >= 40) return "AVERAGE";
  return "WEAK";
}

function pickAssessment(input: DealIntelligenceInput): ProductTrustDiscountAssessment | null {
  const link =
    input.competitiveIntelligence.primaryProduct.link ||
    input.decisionBrief?.recommendation.link;
  if (!link) return input.phase93.trayAssessments[0] ?? null;
  return input.phase93.trayAssessments.find((a) => a.link === link) ?? input.phase93.trayAssessments[0] ?? null;
}

function primaryPrice(input: DealIntelligenceInput): number | null {
  return (
    input.competitiveIntelligence.primaryProduct.price ??
    input.decisionBrief?.recommendation.price ??
    null
  );
}

function isSparseTray(input: DealIntelligenceInput): boolean {
  return Boolean(input.sparse?.sparse ?? input.decisionBrief?.sparseTrayWarning ?? input.products.length <= 1);
}

function computeDealStrength(input: DealIntelligenceInput, assessment: ProductTrustDiscountAssessment | null): number {
  const mc = input.marketContext;
  const verified = input.phase93.discountIntelligence.bestVerifiedDiscount;
  const primaryLink = input.competitiveIntelligence.primaryProduct.link;
  let score = Math.round(
    mc.pricingAssessment.strength * 0.35 +
      input.explainability.recommendationBasis.pricing * 0.3 +
      mc.confidence * 0.2 +
      input.confidenceIntelligence.recommendationReliability * 0.15
  );
  if (verified?.link === primaryLink) score += 12;
  if (mc.marketStatus === "BUY_NOW") score += 10;
  else if (mc.marketStatus === "GOOD_OPPORTUNITY") score += 6;
  if (input.verdictIntelligence.verdict === "BEST VALUE" || input.verdictIntelligence.verdict === "STRONG BUY") {
    score += 8;
  }
  if (assessment?.priceAnomaly === "premium_outlier") score -= 14;
  return clamp(score, 0, 100);
}

function computeDiscountAuthenticityScore(assessment: ProductTrustDiscountAssessment | null, input: DealIntelligenceInput): number {
  const vc = input.phase93.verdictConfidence;
  let score = assessment?.discountAuthenticity ?? 50;
  if (vc.discountAuthentic) score += 12;
  if (assessment?.fakeDiscountRisk === "low") score += 10;
  else if (assessment?.fakeDiscountRisk === "medium") score -= 8;
  else if (assessment?.fakeDiscountRisk === "high") score -= 28;
  if (input.phase93.discountIntelligence.bestVerifiedDiscount?.link === input.competitiveIntelligence.primaryProduct.link) {
    score += 8;
  }
  return clamp(Math.round(score), 0, 100);
}

function computePriceAdvantage(input: DealIntelligenceInput): number {
  const price = primaryPrice(input);
  const median = input.phase93.discountIntelligence.medianPrice;
  if (price == null || price <= 0 || median <= 0) return 50;

  const ratio = price / median;
  let score = 50;
  if (ratio <= 0.88) score = 88;
  else if (ratio <= 0.94) score = 78;
  else if (ratio <= 1.0) score = 68;
  else if (ratio <= 1.06) score = 55;
  else if (ratio <= 1.12) score = 42;
  else score = 28;

  const verified = input.phase93.discountIntelligence.bestVerifiedDiscount;
  if (verified && verified.savingsVsMedian > 0 && verified.link === input.competitiveIntelligence.primaryProduct.link) {
    score += 8;
  }
  return clamp(score, 0, 100);
}

function computeMarketAdvantage(input: DealIntelligenceInput): number {
  const mc = input.marketContext;
  let score = Math.round(mc.confidence * 0.4 + mc.pricingAssessment.strength * 0.35 + mc.pricingAssessment.confidence * 0.25);
  if (mc.marketStatus === "BUY_NOW" || mc.marketStatus === "GOOD_OPPORTUNITY") score += 10;
  if (mc.marketStatus === "OVERPRICED") score -= 18;
  if (mc.marketStatus === "WAIT") score -= 8;
  return clamp(score, 0, 100);
}

function computeScarcitySignal(input: DealIntelligenceInput): number {
  const product = input.products.find(
    (p) => p.link === input.competitiveIntelligence.primaryProduct.link
  );
  let score = 52;
  if (!product) return score;
  const blob = `${product.availability ?? ""} ${(product.extensions ?? []).join(" ")}`.toLowerCase();
  if (/limited|low stock|only \d|few left|flash|ends soon/i.test(blob)) score += 18;
  if (/in stock|available|op voorraad/i.test(blob)) score += 6;
  if (input.marketContext.marketStatus === "BUY_NOW") score += 8;
  return clamp(score, 0, 100);
}

function computeCompetitorGap(input: DealIntelligenceInput): number {
  const price = primaryPrice(input);
  const alts = input.alternativeIntelligence.alternatives.filter(
    (a) => a.classification === "better_value" || a.classification === "budget_pick"
  );
  if (!price || price <= 0 || !alts.length) return 15;

  let minGap = 100;
  for (const alt of alts) {
    if (!alt.price || alt.price <= 0) continue;
    const gapPct = ((price - alt.price) / price) * 100;
    minGap = Math.min(minGap, Math.max(0, gapPct));
  }
  return clamp(Math.round(minGap), 0, 100);
}

function computeRiskAdjustedValue(
  input: DealIntelligenceInput,
  assessment: ProductTrustDiscountAssessment | null,
  competitorGap: number
): number {
  let score = Math.round(
    input.retailerIntelligence.retailerScore * 0.25 +
      input.confidenceIntelligence.trustQuality * 0.2 +
      computePriceAdvantage(input) * 0.25 +
      computeDiscountAuthenticityScore(assessment, input) * 0.2 +
      (100 - competitorGap) * 0.1
  );
  if (input.retailerIntelligence.sellerRisk >= 60) score -= 14;
  if (input.retailerIntelligence.marketplaceRisk >= 65) score -= 10;
  if (assessment?.suspiciousSeller) score -= 16;
  return clamp(score, 0, 100);
}

function computeDealConfidenceDimension(
  input: DealIntelligenceInput,
  dealScore: number,
  discountAuth: number,
  sparseTray: boolean
): number {
  let score = Math.round(
    dealScore * 0.35 +
      discountAuth * 0.25 +
      input.phase93.verdictConfidence.score * 0.2 +
      input.confidenceIntelligence.dataQuality * 0.2
  );
  if (input.alternativeIntelligence.count >= 2) score += 4;
  if (sparseTray) score = Math.min(score, 65);
  return clamp(score, 0, 100);
}

function computeDealScore(args: {
  dealStrength: number;
  discountAuthenticity: number;
  priceAdvantage: number;
  marketAdvantage: number;
  scarcitySignal: number;
  competitorGap: number;
  riskAdjustedValue: number;
  dealConfidence: number;
  sparseTray: boolean;
}): number {
  const competitivePenalty = args.competitorGap >= 15 ? Math.min(18, args.competitorGap * 0.35) : 0;
  let score = Math.round(
    args.dealStrength * 0.2 +
      args.discountAuthenticity * 0.18 +
      args.priceAdvantage * 0.18 +
      args.marketAdvantage * 0.12 +
      args.scarcitySignal * 0.06 +
      args.riskAdjustedValue * 0.16 +
      args.dealConfidence * 0.1 -
      competitivePenalty
  );
  if (args.sparseTray) score = Math.min(score, 72);
  return clamp(score, 0, 100);
}

function buildAdvantages(
  input: DealIntelligenceInput,
  dims: {
    dealStrength: number;
    discountAuthenticity: number;
    priceAdvantage: number;
    competitorGap: number;
  }
): string[] {
  const out: string[] = [];
  const verified = input.phase93.discountIntelligence.bestVerifiedDiscount;

  if (verified?.link === input.competitiveIntelligence.primaryProduct.link) {
    out.push("Verified discount versus tray peer median");
  }
  if (dims.discountAuthenticity >= 72) out.push("Discount authenticity reads clean in tray context");
  if (dims.priceAdvantage >= 72) out.push("Primary price sits below tray median peers");
  if (dims.dealStrength >= 70) out.push("Strong deal strength from market and pricing signals");
  if (input.marketContext.marketStatus === "BUY_NOW") out.push("Market context supports favorable deal timing");
  if (dims.competitorGap <= 8) out.push("Limited gap versus strongest value alternatives");
  if (input.verdictIntelligence.verdict === "BEST VALUE") out.push("Institutional BEST VALUE verdict supports deal quality");

  return [...new Set(out)].slice(0, 6);
}

function buildWarnings(
  input: DealIntelligenceInput,
  assessment: ProductTrustDiscountAssessment | null,
  dims: { discountAuthenticity: number; competitorGap: number },
  sparseTray: boolean
): string[] {
  const out: string[] = [];

  if (sparseTray) out.push("Sparse tray — deal assessment is directional only");
  if (assessment?.fakeDiscountRisk === "high") out.push("Fake discount risk penalizes deal score");
  else if (assessment?.fakeDiscountRisk === "medium") out.push("Discount authenticity is uncertain");
  if (input.marketContext.marketStatus === "OVERPRICED") out.push("Market context flags elevated pricing");
  if (dims.competitorGap >= 15) out.push("Stronger competitor offers exist at materially lower prices");
  if (assessment?.priceAnomaly === "suspicious_low") out.push("Suspiciously low price versus tray peers");
  if (input.competitiveIntelligence.alternativeAdvantages.some((a) => /cheaper|value|price/i.test(a))) {
    out.push("Alternatives advertise stronger raw value positioning");
  }

  return [...new Set(out)].slice(0, 5);
}

function buildDealSummary(tier: DealTier, score: number, sparseTray: boolean): string {
  if (sparseTray) {
    return `Deal quality assessment is directional only (${score}/100, ${tier}) due to sparse tray coverage.`;
  }
  switch (tier) {
    case "EXCEPTIONAL":
      return `Exceptional deal quality versus tray market value (${score}/100).`;
    case "STRONG":
      return `Strong deal — pricing and discount signals beat normal market value (${score}/100).`;
    case "GOOD":
      return `Good deal with favorable pricing relative to evaluated alternatives (${score}/100).`;
    case "AVERAGE":
      return `Average deal — pricing is acceptable but not compelling (${score}/100).`;
    default:
      return `Weak deal profile — pricing or discount signals do not support urgency (${score}/100).`;
  }
}

/** Build deal intelligence meta from consumed pipeline signals. */
export function buildDealIntelligenceMeta(input: DealIntelligenceInput): DealIntelligenceMeta {
  const assessment = pickAssessment(input);
  const sparseTray = isSparseTray(input);

  const dealStrength = computeDealStrength(input, assessment);
  const discountAuthenticity = computeDiscountAuthenticityScore(assessment, input);
  const priceAdvantage = computePriceAdvantage(input);
  const marketAdvantage = computeMarketAdvantage(input);
  const scarcitySignal = computeScarcitySignal(input);
  const competitorGap = computeCompetitorGap(input);
  const riskAdjustedValue = computeRiskAdjustedValue(input, assessment, competitorGap);

  const dealScoreDraft = computeDealScore({
    dealStrength,
    discountAuthenticity,
    priceAdvantage,
    marketAdvantage,
    scarcitySignal,
    competitorGap,
    riskAdjustedValue,
    dealConfidence: 60,
    sparseTray,
  });

  const dealConfidence = computeDealConfidenceDimension(input, dealScoreDraft, discountAuthenticity, sparseTray);

  const dealScore = computeDealScore({
    dealStrength,
    discountAuthenticity,
    priceAdvantage,
    marketAdvantage,
    scarcitySignal,
    competitorGap,
    riskAdjustedValue,
    dealConfidence,
    sparseTray,
  });

  const dealTier = tierFor(dealScore);
  const dealAdvantages = buildAdvantages(input, { dealStrength, discountAuthenticity, priceAdvantage, competitorGap });
  const dealWarnings = buildWarnings(input, assessment, { discountAuthenticity, competitorGap }, sparseTray);

  return {
    version: VERSION,
    dealScore,
    dealTier,
    dealConfidence,
    dealAdvantages,
    dealWarnings,
    priceAdvantage,
    discountAuthenticity,
    competitorGap,
  };
}

/** Post-retailer deal intelligence pass — meta + decision brief only. */
export function applyDealIntelligence(input: DealIntelligenceInput): {
  meta: DealIntelligenceMeta;
  decisionBrief: DecisionBriefDTO | null;
  products: QuantProduct[];
} {
  const meta = buildDealIntelligenceMeta(input);

  if (!input.decisionBrief) {
    return { meta, decisionBrief: null, products: input.products };
  }

  const decisionBrief: DecisionBriefDTO = {
    ...input.decisionBrief,
    dealSummary: buildDealSummary(meta.dealTier, meta.dealScore, isSparseTray(input)),
  };

  return { meta, decisionBrief, products: input.products };
}
