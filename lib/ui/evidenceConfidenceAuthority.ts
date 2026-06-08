/**
 * Phase 27.3 — Evidence-Based Confidence Authority.
 * Verdict-agnostic confidence from commerce evidence (no verdict bucket ranges).
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { ProductDifferentiationProfile, ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";

export type EvidenceConfidenceResult = {
  confidenceScore: number;
  confidenceReason: string;
  signalAgreement: number;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeScore(value: number | null | undefined, fallback = 0): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

function clipLine(text: string, max = 96): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function stableMicro(seed: string, amplitude = 14): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ((hash % 1000) / 1000 - 0.5) * amplitude;
}

function discountAuthenticity(coherent: CoherentProductDecision): number {
  const { discountTruth } = coherent;
  let score = clampScore(safeScore(discountTruth.confidence, 40));
  if (discountTruth.verdict === "Genuine") score += 22;
  if (discountTruth.verdict === "Likely Genuine") score += 14;
  if (discountTruth.verdict === "Inflated" || discountTruth.verdict === "Likely Inflated") score -= 28;
  if (discountTruth.verdict === "Uncertain") score -= 8;
  return clampScore(score);
}

function historicalPriceQuality(coherent: CoherentProductDecision): number {
  const distLow = safeScore(coherent.priceTarget.distanceFromLowPct, 14);
  let score = clampScore(safeScore(coherent.priceTarget.opportunityScore, 48));
  if (distLow <= 4) score += 16;
  else if (distLow <= 9) score += 6;
  else if (distLow >= 18) score -= 18;
  else if (distLow >= 12) score -= 8;
  return clampScore(score);
}

function popularityScore(meta: ProductTrayMeta): number {
  return clampScore(Math.min(100, meta.reviewsCount / 18) * 0.55 + Math.min(100, meta.rating * 20) * 0.45);
}

function signalAgreement(profile: ProductDifferentiationProfile): number {
  const values = [
    profile.trustScore,
    profile.valueScore,
    profile.opportunityScore,
    100 - profile.riskScore,
    profile.alternativeScore,
  ];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / values.length;
  return clampScore(100 - Math.sqrt(variance) * 1.35);
}

/** Evidence-only confidence — same verdict may span wide non-linear scores. */
export function resolveEvidenceConfidence(args: {
  link: string;
  coherent: CoherentProductDecision;
  profile: ProductDifferentiationProfile;
  meta: ProductTrayMeta;
  alternativePressureScore: number;
  dominancePenalty: number;
  traySize: number;
}): EvidenceConfidenceResult {
  const { link, coherent, profile, meta, alternativePressureScore, dominancePenalty, traySize } = args;
  const sellerQuality = clampScore(
    safeScore(coherent.trustRisk.factors.sellerTrust) * 0.6 +
      safeScore(coherent.trustRisk.factors.marketplaceTrust) * 0.4
  );
  const rankingStrength = clampScore(100 - meta.rank * (traySize <= 4 ? 14 : 9));
  const categoryFit = clampScore(coherent.categoryIntelligence.categoryScore);
  const agreement = signalAgreement(profile);

  const weighted =
    profile.trustScore * 0.16 +
    sellerQuality * 0.1 +
    historicalPriceQuality(coherent) * 0.14 +
    discountAuthenticity(coherent) * 0.12 +
    popularityScore(meta) * 0.08 +
    (100 - alternativePressureScore) * 0.1 +
    rankingStrength * 0.12 +
    categoryFit * 0.08 +
    agreement * 0.1;

  const riskDampen = profile.riskScore * 0.22;
  const dominanceDampen = dominancePenalty * 0.35;
  const rankSkew = -meta.rank * (traySize <= 5 ? 5.5 : 3.8);
  const profileSkew = stableMicro(`${profile.uniquenessKey}:${meta.store}`, 11);
  const confidenceScore = clampScore(
    weighted - riskDampen - dominanceDampen + rankSkew + profileSkew + stableMicro(link, 8)
  );

  const ranked = [
    { label: "trust strength", value: profile.trustScore },
    { label: "seller quality", value: sellerQuality },
    { label: "historical price quality", value: historicalPriceQuality(coherent) },
    { label: "discount authenticity", value: discountAuthenticity(coherent) },
    { label: "product popularity", value: popularityScore(meta) },
    { label: "ranking strength", value: rankingStrength },
    { label: "category fit", value: categoryFit },
    { label: "signal agreement", value: agreement },
  ].sort((a, b) => b.value - a.value);

  const lead = ranked[0]!;
  const support = ranked[1]!;
  return {
    confidenceScore,
    confidenceReason: clipLine(
      `Evidence confidence ${confidenceScore}% — ${lead.label} ${lead.value}/100, ${support.label} ${support.value}/100, alternative pressure ${alternativePressureScore}/100.`
    ),
    signalAgreement: agreement,
  };
}
