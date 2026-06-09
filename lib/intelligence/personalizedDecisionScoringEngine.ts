/**
 * Phase 34 — Personalized Decision Scoring + Score Spreading.
 * Combines commerce, identity, and taste signals with tray-relative spread.
 */

import type { BuyerIdentityProfile } from "@/lib/intelligence/buyerIdentityEngine";
import type { CommerceIntelligenceAuthority } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";

export type PersonalizedDecisionScore = {
  version: 1;
  rawScore: number;
  spreadScore: number;
  buyerIdentityScore: number;
  tasteMatchScore: number;
  categoryQualityScore: number;
  marketOpportunityScore: number;
  merchantTrustScore: number;
  rankBand: "top" | "strong" | "average" | "weak" | "avoid";
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function listingBlob(product: QuantProduct, searchQuery = ""): string {
  return `${searchQuery} ${product.title}`.toLowerCase();
}

/** Score buyer-product identity alignment 0–100. */
export function computeBuyerIdentityScore(
  buyer: BuyerIdentityProfile,
  product: QuantProduct,
  intelligence: UniversalProductIntelligenceSnapshot,
  searchQuery: string
): number {
  const blob = listingBlob(product, searchQuery);
  let score = 50;

  const traitBoosts: Partial<Record<string, RegExp>> = {
    developer: /\b(32gb|64gb|m3|m4|cuda|workstation|thinkpad|developer)\b/i,
    power_user: /\b(pro|ultra|max|workstation|32gb|64gb)\b/i,
    performance_focused: /\b(rtx|gaming|i7|i9|ryzen 9|m3 pro|snapdragon 8)\b/i,
    budget_conscious: /\b(budget|affordable|renewed|refurb|under \$?\d)\b/i,
    space_constrained: /\b(compact|corner|2 seater|small|modular|apartment)\b/i,
    value_focused: /\b(value|deal|discount|sale|128gb|256gb)\b/i,
    premium_buyer: /\b(premium|luxury|pro max|ultra|designer|leather|oled)\b/i,
    design_focused: /\b(design|designer|modern|elegant|styled)\b/i,
    aesthetics_focused: /\b(aesthetic|beautiful|stylish|modern|elegant)\b/i,
    camera_focused: /\b(camera|48mp|50mp|108mp|pro camera|ultrawide)\b/i,
    content_creator: /\b(creator|video|vlog|studio|color accurate|m3 max)\b/i,
    business_buyer: /\b(business|enterprise|thinkpad|latitude|reliable|16gb)\b/i,
    student: /\b(student|chromebook|affordable|lightweight|8gb|16gb)\b/i,
    family_buyer: /\b(family|sectional|fabric|washable|modular|durable)\b/i,
    reliability_focused: /\b(warranty|durable|reliable|thinkpad|enterprise)\b/i,
  };

  for (const trait of buyer.dominantTraits) {
    const confidence = buyer.traits[trait] ?? 50;
    const rx = traitBoosts[trait];
    if (rx?.test(blob)) score += confidence * 0.22;
    else if (trait !== "balanced") score -= confidence * 0.06;
  }

  if (buyer.personalityMode === "value" && product.oldPrice != null && product.oldPrice > product.price) {
    score += 8;
  }
  if (buyer.personalityMode === "premium" && /\b(pro|ultra|premium|luxury|designer)\b/i.test(blob)) {
    score += 10;
  }
  if (buyer.personalityMode === "performance" && intelligence.productQualityScore >= 62) {
    score += 6;
  }

  return clamp(Math.round(score), 0, 100);
}

/** Weighted personalized raw score before spreading. */
export function computePersonalizedRawScore(args: {
  buyer: BuyerIdentityProfile;
  intelligence: UniversalProductIntelligenceSnapshot;
  commerce: CommerceIntelligenceAuthority;
  buyerIdentityScore: number;
  tasteMatchScore: number;
}): number {
  const { buyer, intelligence, commerce, buyerIdentityScore, tasteMatchScore } = args;
  const w = buyer.rankingWeights;
  const categoryQualityScore = clamp(
    Math.round(intelligence.productQualityScore * 0.55 + intelligence.categoryFitScore * 0.45),
    0,
    100
  );

  const raw =
    commerce.marketOpportunityScore * w.marketOpportunity +
    categoryQualityScore * w.categoryQuality +
    buyerIdentityScore * w.buyerIdentity +
    tasteMatchScore * w.tasteMatch +
    commerce.merchantTrustScore * w.merchantTrust;

  return clamp(Math.round(raw), 0, 100);
}

type SpreadRow = {
  link: string;
  rawScore: number;
  avoid: boolean;
};

type PersonalizedScoreInputRow = {
  link: string;
  product: QuantProduct;
  intelligence: UniversalProductIntelligenceSnapshot;
  commerce: CommerceIntelligenceAuthority;
  buyer: BuyerIdentityProfile;
  tasteMatchScore: number;
  avoid: boolean;
  searchQuery: string;
};

type EnrichedSpreadRow = SpreadRow & {
  buyerIdentityScore: number;
  tasteMatchScore: number;
  source: PersonalizedScoreInputRow;
};

/** Spread tray scores into distinct bands while preserving rank order. */
export function spreadTrayScores(rows: SpreadRow[]): Map<string, PersonalizedDecisionScore> {
  const sorted = [...rows].sort((a, b) => b.rawScore - a.rawScore);
  const total = sorted.length || 1;
  const result = new Map<string, PersonalizedDecisionScore>();

  for (let index = 0; index < sorted.length; index++) {
    const row = sorted[index]!;
    const percentile = total > 1 ? index / (total - 1) : 0;

    let spreadScore: number;
    let rankBand: PersonalizedDecisionScore["rankBand"];

    if (row.avoid) {
      spreadScore = clamp(Math.round(12 + (1 - row.rawScore / 100) * 22), 0, 35);
      rankBand = "avoid";
    } else if (index === 0) {
      spreadScore = clamp(Math.round(88 + (row.rawScore - 50) * 0.12), 85, 95);
      rankBand = "top";
    } else if (percentile <= 0.22) {
      spreadScore = clamp(Math.round(76 + (row.rawScore - 50) * 0.14), 75, 85);
      rankBand = "strong";
    } else if (percentile <= 0.62) {
      spreadScore = clamp(Math.round(58 + (row.rawScore - 50) * 0.16), 55, 70);
      rankBand = "average";
    } else {
      spreadScore = clamp(Math.round(38 + (row.rawScore - 50) * 0.12), 35, 55);
      rankBand = "weak";
    }

    result.set(row.link, {
      version: 1,
      rawScore: row.rawScore,
      spreadScore,
      buyerIdentityScore: 0,
      tasteMatchScore: 0,
      categoryQualityScore: 0,
      marketOpportunityScore: 0,
      merchantTrustScore: 0,
      rankBand,
    });
  }

  return result;
}

export function buildPersonalizedDecisionScores(args: {
  rows: Array<{
    link: string;
    product: QuantProduct;
    intelligence: UniversalProductIntelligenceSnapshot;
    commerce: CommerceIntelligenceAuthority;
    buyer: BuyerIdentityProfile;
    tasteMatchScore: number;
    avoid: boolean;
    searchQuery: string;
  }>;
}): Map<string, PersonalizedDecisionScore> {
  const rawRows: EnrichedSpreadRow[] = args.rows.map((row) => {
    const buyerIdentityScore = computeBuyerIdentityScore(
      row.buyer,
      row.product,
      row.intelligence,
      row.searchQuery
    );
    const rawScore = computePersonalizedRawScore({
      buyer: row.buyer,
      intelligence: row.intelligence,
      commerce: row.commerce,
      buyerIdentityScore,
      tasteMatchScore: row.tasteMatchScore,
    });
    return { link: row.link, rawScore, avoid: row.avoid, buyerIdentityScore, tasteMatchScore: row.tasteMatchScore, source: row };
  });

  const spreadMap = spreadTrayScores(rawRows.map(({ link, rawScore, avoid }) => ({ link, rawScore, avoid })));

  for (const entry of rawRows) {
    const spread = spreadMap.get(entry.link);
    if (!spread) continue;
    const categoryQualityScore = clamp(
      Math.round(
        entry.source.intelligence.productQualityScore * 0.55 + entry.source.intelligence.categoryFitScore * 0.45
      ),
      0,
      100
    );
    spreadMap.set(entry.link, {
      ...spread,
      rawScore: entry.rawScore,
      buyerIdentityScore: entry.buyerIdentityScore,
      tasteMatchScore: entry.tasteMatchScore,
      categoryQualityScore,
      marketOpportunityScore: entry.source.commerce.marketOpportunityScore,
      merchantTrustScore: entry.source.commerce.merchantTrustScore,
    });
  }

  return spreadMap;
}

/** Validate score separation — top should exceed median by meaningful gap. */
export function hasStrongScoreSeparation(scores: PersonalizedDecisionScore[]): boolean {
  if (scores.length < 3) return true;
  const sorted = [...scores].sort((a, b) => b.spreadScore - a.spreadScore);
  const top = sorted[0]!.spreadScore;
  const median = sorted[Math.floor(sorted.length / 2)]!.spreadScore;
  return top - median >= 12 && top >= 85;
}
