/**
 * Phase 35 — Personal Commerce Score + Confidence Expansion.
 * Unified ranking score and widened confidence distribution.
 */

import type { PersonalBuyerIdentity } from "@/lib/intelligence/personalBuyerIdentityEngine";
import type { CommerceIntelligenceAuthority } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import type { UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";

export type PersonalCommerceScore = {
  version: 1;
  personalCommerceScore: number;
  marketScore: number;
  trustScore: number;
  valueScore: number;
  categoryScore: number;
  buyerScore: number;
  tasteScore: number;
  expandedConfidence: number;
  confidenceBand: number;
};

export const CONFIDENCE_BANDS = [95, 90, 85, 78, 70, 62, 50, 35] as const;

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function weightsForBuyer(buyer: PersonalBuyerIdentity): PersonalBuyerIdentity["profile"]["rankingWeights"] {
  const base = buyer.profile.rankingWeights;
  switch (buyer.buyerIdentity) {
    case "Luxury Buyer":
      return { marketOpportunity: 0.12, categoryQuality: 0.24, buyerIdentity: 0.3, tasteMatch: 0.22, merchantTrust: 0.12 };
    case "Value Buyer":
    case "Budget Buyer":
      return { marketOpportunity: 0.34, categoryQuality: 0.12, buyerIdentity: 0.24, tasteMatch: 0.08, merchantTrust: 0.22 };
    case "Power User":
    case "Creator":
      return { marketOpportunity: 0.16, categoryQuality: 0.3, buyerIdentity: 0.28, tasteMatch: 0.1, merchantTrust: 0.16 };
    case "Professional Buyer":
    case "Business Buyer":
    case "Productivity Buyer":
      return { marketOpportunity: 0.2, categoryQuality: 0.26, buyerIdentity: 0.26, tasteMatch: 0.08, merchantTrust: 0.2 };
    case "Student Buyer":
      return { marketOpportunity: 0.28, categoryQuality: 0.14, buyerIdentity: 0.26, tasteMatch: 0.08, merchantTrust: 0.24 };
    default:
      return base;
  }
}

/** Compute Personal Commerce Score from intelligence planes. */
export function computePersonalCommerceScore(args: {
  intelligence: UniversalProductIntelligenceSnapshot;
  commerce: CommerceIntelligenceAuthority;
  buyerScore: number;
  tasteScore: number;
  buyer: PersonalBuyerIdentity;
}): Omit<PersonalCommerceScore, "expandedConfidence" | "confidenceBand"> {
  const { intelligence, commerce, buyerScore, tasteScore, buyer } = args;
  const w = weightsForBuyer(buyer);

  const marketScore = commerce.marketOpportunityScore;
  const trustScore = commerce.merchantTrustScore;
  const valueScore = commerce.marketValueScore;
  const categoryScore = clamp(
    Math.round(intelligence.productQualityScore * 0.55 + intelligence.categoryFitScore * 0.45),
    0,
    100
  );

  const weighted =
    marketScore * w.marketOpportunity +
    trustScore * w.merchantTrust +
    valueScore * (w.marketOpportunity * 0.55 + 0.1) +
    categoryScore * w.categoryQuality +
    buyerScore * w.buyerIdentity +
    tasteScore * w.tasteMatch;

  const personalCommerceScore = clamp(
    Math.round(
      weighted * (buyer.buyerConfidence >= 78 ? 0.48 : 0.62) +
        buyerScore * (buyer.buyerConfidence >= 78 ? 0.38 : 0.22) +
        tasteScore * 0.12
    ),
    0,
    100
  );

  return {
    version: 1,
    personalCommerceScore,
    marketScore,
    trustScore,
    valueScore,
    categoryScore,
    buyerScore,
    tasteScore,
  };
}

type RankRow = { link: string; score: number; avoid: boolean };

/** Expand tray confidence into discrete bands — avoids 70-85 clustering. */
export function expandConfidenceDistribution(rows: RankRow[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const result = new Map<string, number>();

  for (let index = 0; index < sorted.length; index++) {
    const row = sorted[index]!;
    if (row.avoid) {
      result.set(row.link, CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1] ?? 35);
      continue;
    }
    const bandIndex = Math.min(index, CONFIDENCE_BANDS.length - 2);
    result.set(row.link, CONFIDENCE_BANDS[bandIndex] ?? 70);
  }

  return result;
}

export function buildPersonalCommerceScores(args: {
  rows: Array<{
    link: string;
    intelligence: UniversalProductIntelligenceSnapshot;
    commerce: CommerceIntelligenceAuthority;
    buyerScore: number;
    tasteScore: number;
    buyer: PersonalBuyerIdentity;
    avoid: boolean;
  }>;
}): Map<string, PersonalCommerceScore> {
  const baseScores = args.rows.map((row) => {
    const base = computePersonalCommerceScore(row);
    return { link: row.link, score: base.personalCommerceScore, avoid: row.avoid, base };
  });

  const expanded = expandConfidenceDistribution(
    baseScores.map((row) => ({ link: row.link, score: row.score, avoid: row.avoid }))
  );

  const result = new Map<string, PersonalCommerceScore>();
  for (const row of baseScores) {
    const expandedConfidence = expanded.get(row.link) ?? 50;
    result.set(row.link, {
      ...row.base,
      expandedConfidence,
      confidenceBand: expandedConfidence,
    });
  }

  return result;
}

/** Validate confidence spread — top should not cluster with median in 70-85 band. */
export function hasExpandedConfidenceSpread(scores: PersonalCommerceScore[]): boolean {
  if (scores.length < 3) return true;
  const sorted = [...scores].sort((a, b) => b.expandedConfidence - a.expandedConfidence);
  const top = sorted[0]!.expandedConfidence;
  const median = sorted[Math.floor(sorted.length / 2)]!.expandedConfidence;
  const topClustered = top >= 70 && top <= 85 && median >= 70 && median <= 85 && top - median < 8;
  return !topClustered && top >= 85;
}
