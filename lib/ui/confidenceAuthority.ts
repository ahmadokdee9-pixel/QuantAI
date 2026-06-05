/**
 * Phase 27.0 — Confidence Authority.
 * Evidence-derived confidence (0–100); not tied to verdict category buckets.
 */

import type { ActivatedAlternativeAdvantage } from "@/lib/ui/alternativeAdvantageActivation";
import type { ActivatedBuyWait } from "@/lib/ui/buyWaitActivation";
import type { ActivatedCategoryIntelligence } from "@/lib/ui/categoryIntelligenceActivation";
import type { ActivatedDiscountTruth } from "@/lib/ui/discountTruthActivation";
import type { ActivatedIntentIntelligence } from "@/lib/ui/intentIntelligenceActivation";
import type { ActivatedPriceTarget } from "@/lib/ui/priceTargetActivation";
import type { ActivatedTrustRisk } from "@/lib/ui/trustRiskActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type ConfidenceTier = "very_high" | "high" | "moderate" | "low" | "very_low";

export type ConfidenceFactorScores = {
  intentMatch: number;
  trustScore: number;
  priceQuality: number;
  alternativePressure: number;
  categoryQuality: number;
  dataCompleteness: number;
  marketConditions: number;
};

export type ActivatedConfidenceAuthority = {
  confidenceScore: number;
  confidenceTier: ConfidenceTier;
  confidenceReason: string;
  factors: ConfidenceFactorScores;
};

export type ConfidenceAuthorityInput = {
  verdict: PrimaryVerdict;
  intentIntelligence: ActivatedIntentIntelligence;
  trustRisk: ActivatedTrustRisk;
  discountTruth: ActivatedDiscountTruth;
  priceTarget: ActivatedPriceTarget;
  buyWait: ActivatedBuyWait;
  categoryIntelligence: ActivatedCategoryIntelligence;
  alternativeAdvantage: ActivatedAlternativeAdvantage;
  /** 0–100 alternative pressure from alternative authority (higher = more competitive tray). */
  alternativePressureScore?: number;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clipLine(text: string, max = 96): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function tierFromScore(score: number): ConfidenceTier {
  if (score >= 88) return "very_high";
  if (score >= 76) return "high";
  if (score >= 58) return "moderate";
  if (score >= 40) return "low";
  return "very_low";
}

function computePriceQuality(
  discountTruth: ActivatedDiscountTruth,
  priceTarget: ActivatedPriceTarget
): number {
  const genuine =
    discountTruth.verdict === "Genuine" || discountTruth.verdict === "Likely Genuine";
  const inflated =
    discountTruth.verdict === "Inflated" || discountTruth.verdict === "Likely Inflated";
  let score = discountTruth.confidence * 0.55;
  if (genuine) score += 22;
  if (inflated) score -= 28;
  if (priceTarget.potentialSavings >= 5) score += 12;
  const distance = priceTarget.distanceFromLowPct ?? 0;
  if (distance <= 3) score += 14;
  else if (distance >= 12) score -= 16;
  return clampScore(score);
}

function computeDataCompleteness(trustRisk: ActivatedTrustRisk): number {
  const insufficient = trustRisk.factors.insufficientInformationRisk;
  const listing = trustRisk.factors.listingQuality;
  return clampScore(listing * 0.55 + (100 - insufficient) * 0.45);
}

function computeMarketConditions(buyWait: ActivatedBuyWait, trustRisk: ActivatedTrustRisk): number {
  let score = 52;
  if (buyWait.verdict === "BUY NOW") score += 22;
  if (buyWait.verdict === "WAIT") score -= 12;
  if (buyWait.verdict === "COMPARE") score += 4;
  score += Math.max(0, 18 - trustRisk.riskScore * 0.2);
  return clampScore(score);
}

function buildConfidenceReason(factors: ConfidenceFactorScores, verdict: PrimaryVerdict): string {
  const ranked = [
    { key: "intentMatch", label: "intent match", value: factors.intentMatch },
    { key: "trustScore", label: "trust alignment", value: factors.trustScore },
    { key: "priceQuality", label: "price quality", value: factors.priceQuality },
    { key: "categoryQuality", label: "category quality", value: factors.categoryQuality },
    { key: "marketConditions", label: "market timing", value: factors.marketConditions },
    { key: "dataCompleteness", label: "data completeness", value: factors.dataCompleteness },
  ].sort((a, b) => b.value - a.value);

  const lead = ranked[0]!;
  const support = ranked[1]!;
  if (verdict === "COMPARE") {
    return clipLine(
      `Valid option with ${lead.label} ${lead.value}/100 — ${support.label} ${support.value}/100 supports comparison confidence.`
    );
  }
  return clipLine(
    `Strongest signal: ${lead.label} (${lead.value}/100); supporting ${support.label} (${support.value}/100).`
  );
}

/** Resolve evidence-weighted confidence for one listing (verdict-agnostic scoring). */
export function resolveConfidenceAuthority(input: ConfidenceAuthorityInput): ActivatedConfidenceAuthority {
  const {
    verdict,
    intentIntelligence,
    trustRisk,
    discountTruth,
    priceTarget,
    buyWait,
    categoryIntelligence,
    alternativePressureScore = 0,
  } = input;

  const factors: ConfidenceFactorScores = {
    intentMatch: clampScore(intentIntelligence.intentMatchScore),
    trustScore: clampScore(trustRisk.trustScore),
    priceQuality: computePriceQuality(discountTruth, priceTarget),
    alternativePressure: clampScore(alternativePressureScore),
    categoryQuality: clampScore(categoryIntelligence.categoryScore),
    dataCompleteness: computeDataCompleteness(trustRisk),
    marketConditions: computeMarketConditions(buyWait, trustRisk),
  };

  const weighted =
    factors.intentMatch * 0.22 +
    factors.trustScore * 0.2 +
    factors.priceQuality * 0.18 +
    factors.categoryQuality * 0.14 +
    factors.dataCompleteness * 0.12 +
    factors.marketConditions * 0.14;

  const pressureDampen = factors.alternativePressure * 0.1;
  const riskDampen = trustRisk.riskScore >= 55 ? (trustRisk.riskScore - 50) * 0.35 : 0;
  const confidenceScore = clampScore(weighted - pressureDampen - riskDampen);

  return {
    confidenceScore,
    confidenceTier: tierFromScore(confidenceScore),
    confidenceReason: buildConfidenceReason(factors, verdict),
    factors,
  };
}
