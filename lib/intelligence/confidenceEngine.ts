/**
 * Phase 10.5 — Confidence Intelligence Engine.
 * Unified institutional confidence from all upstream intelligence layers.
 * Read-only meta layer — no tray, verdict, or ranking mutations.
 */

import type { AlternativeIntelligenceMeta } from "@/lib/intelligence/alternativeIntelligenceEngine";
import type { CompetitiveIntelligenceMeta } from "@/lib/intelligence/competitiveIntelligenceEngine";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { ExplainabilityMeta } from "@/lib/intelligence/explainabilityEngine";
import type { MarketContextMeta } from "@/lib/intelligence/marketContextEngine";
import type { Phase93TrustDiscountMeta } from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { Phase92TrayIntegrityMeta } from "@/lib/search/phase92TrayIntegrity";
import type { SparseResultAssessment } from "@/lib/search/sparseResultIntelligence";
import type { QuantProduct } from "@/lib/shoppingScore";

export type ConfidenceTier = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";

export type ConfidenceIntelligenceMeta = {
  version: "phase10.5-v1";
  confidenceScore: number;
  confidenceTier: ConfidenceTier;
  confidenceSummary: string;
  strengths: string[];
  weaknesses: string[];
  confidenceDrivers: string[];
  uncertaintyFactors: string[];
  recommendationReliability: number;
  dataQuality: number;
  trustQuality: number;
  marketSupport: number;
  alternativePressure: number;
};

export type ConfidenceIntelligenceInput = {
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
};

const VERSION = "phase10.5-v1" as const;
const STRONG_VERDICTS = new Set(["STRONG BUY", "BUY READY", "BEST VALUE"]);
const WEAK_VERDICTS = new Set(["WAIT", "AVOID", "CONSIDER"]);
const FAVORABLE_MARKET = new Set(["BUY_NOW", "GOOD_OPPORTUNITY", "FAIR_PRICE"]);

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function tierFor(score: number): ConfidenceTier {
  if (score >= 90) return "VERY_HIGH";
  if (score >= 75) return "HIGH";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "LOW";
  return "VERY_LOW";
}

function computeDataQuality(
  input: ConfidenceIntelligenceInput
): number {
  let score = 52;
  const sparse = Boolean(input.sparse?.sparse ?? input.decisionBrief?.sparseTrayWarning);
  const count = input.products.length;

  if (input.phase92.compareIntegrity.queryMode === "normal") {
    score += 12;
  } else if (input.phase92.compareIntegrity.bothEntitiesRepresented) {
    score += 14;
  } else if (input.phase92.compareIntegrity.collapsedIntoSingleEntity) {
    score -= 10;
  } else {
    score -= 5;
  }

  if (input.phase92.top3Diversity.applied) score += 8;

  if (count >= 5 && !sparse) score += 12;
  else if (count >= 3) score += 4;
  else if (count <= 1) score -= 18;

  if (sparse) score -= 16;

  if (input.alternativeIntelligence.count >= 2) score += 6;

  return clamp(Math.round(score), 0, 100);
}

function computeTrustQuality(input: ConfidenceIntelligenceInput): number {
  const basis = input.explainability.recommendationBasis;
  const vc = input.phase93.verdictConfidence;
  const avgTrust = input.phase93.averageTrustScore;
  const avgRetailer = input.phase93.averageRetailerConfidence;

  let score = Math.round(
    basis.trust * 0.3 +
      basis.retailer * 0.25 +
      vc.score * 0.25 +
      avgTrust * 0.1 +
      avgRetailer * 0.1
  );

  if (vc.discountAuthentic) score += 5;
  if (vc.trustFloorOk) score += 4;
  if (vc.suspiciousSellerBlocked) score += 3;
  if (input.phase93.suspiciousSellerCount > 0) score -= 4;
  if (input.phase93.fakeDiscountHighCount > 0) score -= 6;

  return clamp(Math.round(score), 0, 100);
}

function computeMarketSupport(input: ConfidenceIntelligenceInput): number {
  const mc = input.marketContext;
  let score = Math.round(
    mc.confidence * 0.45 +
      mc.pricingAssessment.strength * 0.3 +
      mc.pricingAssessment.confidence * 0.25
  );

  if (mc.marketStatus === "BUY_NOW") score += 10;
  else if (mc.marketStatus === "GOOD_OPPORTUNITY") score += 6;
  else if (mc.marketStatus === "FAIR_PRICE") score += 2;
  else if (mc.marketStatus === "WAIT") score -= 10;
  else if (mc.marketStatus === "OVERPRICED") score -= 14;
  else if (mc.marketStatus === "INSUFFICIENT_DATA") score -= 18;

  return clamp(Math.round(score), 0, 100);
}

function computeAlternativePressure(input: ConfidenceIntelligenceInput): number {
  const alt = input.alternativeIntelligence;
  const comp = input.competitiveIntelligence;
  let pressure = alt.count * 7;

  for (const a of alt.alternatives) {
    if (a.classification === "better_value" && a.confidence >= 68) pressure += 12;
    if (a.classification === "safer_alternative" && a.trustScore >= 78) pressure += 8;
  }

  pressure += comp.alternativeAdvantages.length * 6;
  pressure += comp.tradeoffs.length * 4;
  pressure -= comp.primaryAdvantages.length * 5;
  pressure -= comp.decisiveFactors.length * 2;

  if (comp.strongestAlternatives.length <= 1) pressure -= 8;

  return clamp(Math.round(pressure), 0, 100);
}

function computeRecommendationReliability(input: ConfidenceIntelligenceInput): number {
  const verdictConf = input.verdictIntelligence.confidence;
  const compConf = input.competitiveIntelligence.confidence;
  const basis = input.explainability.recommendationBasis;
  const explainAvg = Math.round(
    (basis.trust + basis.pricing + basis.retailer + basis.intentMatch) / 4
  );

  let score = Math.round(verdictConf * 0.42 + compConf * 0.28 + explainAvg * 0.3);

  if (STRONG_VERDICTS.has(input.verdictIntelligence.verdict)) score += 5;
  if (WEAK_VERDICTS.has(input.verdictIntelligence.verdict)) score -= 8;

  return clamp(Math.round(score), 0, 100);
}

function computeConfidenceScore(dimensions: {
  dataQuality: number;
  trustQuality: number;
  marketSupport: number;
  recommendationReliability: number;
  alternativePressure: number;
  input: ConfidenceIntelligenceInput;
}): number {
  const { dataQuality, trustQuality, marketSupport, recommendationReliability, alternativePressure, input } =
    dimensions;

  let score = Math.round(
    dataQuality * 0.14 +
      trustQuality * 0.28 +
      marketSupport * 0.18 +
      recommendationReliability * 0.28 +
      (100 - alternativePressure) * 0.12
  );

  const vc = input.phase93.verdictConfidence;
  const mc = input.marketContext;
  const verdict = input.verdictIntelligence.verdict;

  if (
    STRONG_VERDICTS.has(verdict) &&
    vc.discountAuthentic &&
    trustQuality >= 72 &&
    FAVORABLE_MARKET.has(mc.marketStatus) &&
    alternativePressure <= 35
  ) {
    score += 8;
  }

  if (input.products.length <= 1 || input.sparse?.sparse) {
    score = Math.min(score, 58);
  }
  if (verdict === "AVOID" || verdict === "WAIT") {
    score = Math.min(score, 52);
  }
  if (mc.marketStatus === "INSUFFICIENT_DATA") {
    score = Math.min(score, 48);
  }

  return clamp(Math.round(score), 0, 100);
}

function buildStrengths(input: ConfidenceIntelligenceInput, dims: {
  dataQuality: number;
  trustQuality: number;
  marketSupport: number;
  recommendationReliability: number;
  alternativePressure: number;
}): string[] {
  const out: string[] = [];
  const verdict = input.verdictIntelligence.verdict;

  if (STRONG_VERDICTS.has(verdict)) out.push(`${verdict} institutional verdict`);
  if (input.phase93.verdictConfidence.discountAuthentic) out.push("Verified discount authenticity");
  if (dims.trustQuality >= 72) out.push("Strong trust and retailer quality signals");
  if (input.marketContext.marketStatus === "BUY_NOW" || input.marketContext.marketStatus === "GOOD_OPPORTUNITY") {
    out.push("Favorable market context supports the recommendation");
  }
  if (dims.alternativePressure <= 30) out.push("Weak alternative pressure on the primary pick");
  if (input.competitiveIntelligence.primaryAdvantages.length >= 2) {
    out.push("Primary holds clear competitive advantages in tray comparison");
  }
  if (dims.dataQuality >= 68) out.push("Adequate tray depth and integrity for comparison");
  if (input.explainability.recommendationBasis.intentMatch >= 65) {
    out.push("Strong intent alignment with query interpretation");
  }

  return [...new Set(out)].slice(0, 6);
}

function buildWeaknesses(input: ConfidenceIntelligenceInput, dims: {
  dataQuality: number;
  trustQuality: number;
  alternativePressure: number;
}): string[] {
  const out: string[] = [];
  const verdict = input.verdictIntelligence.verdict;

  if (input.sparse?.sparse || input.products.length <= 1) {
    out.push("Sparse tray limits institutional confidence");
  }
  if (dims.trustQuality < 55) out.push("Trust signals are below preferred thresholds");
  if (!input.phase93.verdictConfidence.discountAuthentic) {
    out.push("Discount confidence is not fully verified");
  }
  if (dims.alternativePressure >= 55) out.push("Strong tray alternatives exert competitive pressure");
  if (WEAK_VERDICTS.has(verdict)) out.push(`${verdict} verdict constrains recommendation reliability`);
  if (input.marketContext.marketStatus === "WAIT" || input.marketContext.marketStatus === "OVERPRICED") {
    out.push(`Market context status ${input.marketContext.marketStatus} reduces timing confidence`);
  }
  for (const w of input.marketContext.warnings.slice(0, 2)) {
    if (!out.includes(w)) out.push(w);
  }

  return [...new Set(out)].slice(0, 6);
}

function buildConfidenceDrivers(
  input: ConfidenceIntelligenceInput,
  dims: {
    dataQuality: number;
    trustQuality: number;
    marketSupport: number;
    recommendationReliability: number;
    alternativePressure: number;
  }
): string[] {
  const drivers: string[] = [];

  drivers.push(`Verdict confidence ${input.verdictIntelligence.confidence}/100`);
  drivers.push(`Trust quality ${dims.trustQuality}/100`);
  drivers.push(`Market support ${dims.marketSupport}/100`);
  drivers.push(`Data quality ${dims.dataQuality}/100`);
  drivers.push(`Alternative pressure ${dims.alternativePressure}/100`);

  for (const d of input.explainability.confidenceDrivers.slice(0, 2)) {
    if (drivers.length >= 6) break;
    if (!drivers.includes(d)) drivers.push(d);
  }

  return drivers.slice(0, 6);
}

function buildUncertaintyFactors(input: ConfidenceIntelligenceInput): string[] {
  const out: string[] = [];

  if (input.sparse?.sparse) out.push("Limited listing breadth in current scan");
  if (input.phase93.fakeDiscountHighCount > 0) out.push("Fake-discount risk present in tray");
  if (input.phase93.priceAnomalyCount > 0) out.push("Price anomalies detected among listings");
  if (input.competitiveIntelligence.tradeoffs.length >= 2) {
    out.push("Meaningful tradeoffs exist versus strongest alternatives");
  }
  if (input.marketContext.marketStatus === "INSUFFICIENT_DATA") {
    out.push("Market timing evidence is insufficient");
  }
  for (const r of input.explainability.riskSignals.slice(0, 2)) {
    if (out.length >= 5) break;
    if (!out.includes(r)) out.push(r);
  }

  return out.slice(0, 5);
}

function buildConfidenceSummary(tier: ConfidenceTier, score: number, input: ConfidenceIntelligenceInput): string {
  const verdict = input.verdictIntelligence.verdict;
  switch (tier) {
    case "VERY_HIGH":
      return `Institutional confidence is very high (${score}/100) — ${verdict} verdict, trusted signals, and favorable market context align with weak alternative pressure.`;
    case "HIGH":
      return `Institutional confidence is high (${score}/100) — recommendation reliability is strong across trust, market, and competitive layers.`;
    case "MEDIUM":
      return `Institutional confidence is moderate (${score}/100) — recommendation is usable but some trust, market, or alternative signals warrant review.`;
    case "LOW":
      return `Institutional confidence is low (${score}/100) — sparse evidence or competitive pressure limits recommendation reliability.`;
    default:
      return `Institutional confidence is very low (${score}/100) — insufficient tray depth or weak trust signals constrain this recommendation.`;
  }
}

/** Build unified confidence meta from consumed intelligence layers. */
export function buildConfidenceIntelligence(
  input: ConfidenceIntelligenceInput
): ConfidenceIntelligenceMeta {
  const dataQuality = computeDataQuality(input);
  const trustQuality = computeTrustQuality(input);
  const marketSupport = computeMarketSupport(input);
  const alternativePressure = computeAlternativePressure(input);
  const recommendationReliability = computeRecommendationReliability(input);

  const dims = {
    dataQuality,
    trustQuality,
    marketSupport,
    recommendationReliability,
    alternativePressure,
  };

  const confidenceScore = computeConfidenceScore({ ...dims, input });
  const confidenceTier = tierFor(confidenceScore);
  const strengths = buildStrengths(input, dims);
  const weaknesses = buildWeaknesses(input, dims);
  const confidenceDrivers = buildConfidenceDrivers(input, dims);
  const uncertaintyFactors = buildUncertaintyFactors(input);
  const confidenceSummary = buildConfidenceSummary(confidenceTier, confidenceScore, input);

  return {
    version: VERSION,
    confidenceScore,
    confidenceTier,
    confidenceSummary,
    strengths,
    weaknesses,
    confidenceDrivers,
    uncertaintyFactors,
    recommendationReliability,
    dataQuality,
    trustQuality,
    marketSupport,
    alternativePressure,
  };
}

/** Post-competitive confidence pass — meta + decision brief only. */
export function applyConfidenceIntelligence(input: ConfidenceIntelligenceInput): {
  meta: ConfidenceIntelligenceMeta;
  decisionBrief: DecisionBriefDTO | null;
  products: QuantProduct[];
} {
  const meta = buildConfidenceIntelligence(input);
  const products = input.products;

  if (!input.decisionBrief) {
    return { meta, decisionBrief: null, products };
  }

  const decisionBrief: DecisionBriefDTO = {
    ...input.decisionBrief,
    confidenceSummary: meta.confidenceSummary,
    confidenceTier: meta.confidenceTier,
    confidenceDrivers: meta.confidenceDrivers.slice(0, 4),
    confidence: Math.max(input.decisionBrief.confidence, meta.confidenceScore),
  };

  return { meta, decisionBrief, products };
}
