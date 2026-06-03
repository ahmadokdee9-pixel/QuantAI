/**
 * Phase 13.2 — Product Ranking Application Layer.
 * Applies Phase 13.1 rankingEngine outputs to product-level ranking preparation.
 * Read-only — no sorting, reranking, tray order, UI, or persistence mutations.
 */

import type { RankingEngineMeta, RankingTier } from "@/lib/ranking/deterministicRankingEngine";

export type ProductRankingProfile = {
  productId: number;
  link: string;
  currentRank: number;
  preparedRankingScore: number;
  preparedRankingTier: RankingTier;
  trustAdjustment: number;
  valueAdjustment: number;
  buyerFitAdjustment: number;
  confidenceAdjustment: number;
  rankingReady: boolean;
};

export type ProductRankingMeta = {
  version: "phase13.2-v1";
  rankingScore: number;
  rankingTier: RankingTier;
  rankingReasons: string[];
  rankingWarnings: string[];
  rankingConfidence: number;
  rankingProfile: ProductRankingProfile[];
};

export type ProductRankingCandidate = {
  id: number;
  link: string;
  qiRank?: number;
};

export type ProductRankingInput = {
  rankingEngine: RankingEngineMeta;
  products: ProductRankingCandidate[];
};

const VERSION = "phase13.2-v1" as const;
const MAX_PROFILES = 60;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function tierFor(score: number): RankingTier {
  if (score <= 0.2) return "VERY_LOW";
  if (score <= 0.4) return "LOW";
  if (score <= 0.6) return "MEDIUM";
  if (score <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function computeRankingConfidence(rankingEngine: RankingEngineMeta): number {
  let confidence = rankingEngine.rankingScore * 0.46;
  confidence += rankingEngine.confidenceWeight * 0.24;
  confidence += rankingEngine.trustWeight * 0.12;
  confidence -= Math.min(rankingEngine.rankingWarnings.length * 0.04, 0.16);

  if (rankingEngine.rankingTier === "VERY_HIGH") confidence += 0.1;
  else if (rankingEngine.rankingTier === "HIGH") confidence += 0.06;
  else if (rankingEngine.rankingTier === "VERY_LOW") confidence -= 0.1;

  return round2(clamp01(confidence));
}

function slotVariation(productId: number, index: number): number {
  const seed = (productId * 17 + index * 13) % 97;
  return (seed - 48) / 1000;
}

function buildProductProfile(
  rankingEngine: RankingEngineMeta,
  product: ProductRankingCandidate,
  index: number
): ProductRankingProfile {
  const currentRank = product.qiRank ?? index;
  const trustAdjustment = round4(rankingEngine.trustWeight * 0.12);
  const valueAdjustment = round4(rankingEngine.valueWeight * 0.1);
  const buyerFitAdjustment = round4(rankingEngine.buyerFitWeight * 0.1);
  const confidenceAdjustment = round4(rankingEngine.confidenceWeight * 0.08);

  let preparedRankingScore =
    rankingEngine.rankingScore +
    slotVariation(product.id, index) -
    currentRank * 0.006 +
    trustAdjustment * 0.35 +
    valueAdjustment * 0.3 +
    buyerFitAdjustment * 0.2 +
    confidenceAdjustment * 0.15;

  if (rankingEngine.rankingWarnings.length >= 2) {
    preparedRankingScore -= 0.04;
  }

  preparedRankingScore = clamp01(preparedRankingScore);

  const rankingReady =
    preparedRankingScore >= 0.45 &&
    rankingEngine.rankingTier !== "VERY_LOW" &&
    rankingEngine.rankingWarnings.length <= 2;

  return {
    productId: product.id,
    link: product.link,
    currentRank,
    preparedRankingScore: round2(preparedRankingScore),
    preparedRankingTier: tierFor(preparedRankingScore),
    trustAdjustment,
    valueAdjustment,
    buyerFitAdjustment,
    confidenceAdjustment,
    rankingReady,
  };
}

/** Apply rankingEngine metadata to product-level ranking preparation profiles. */
export function applyProductRanking(input: ProductRankingInput): ProductRankingMeta {
  const { rankingEngine, products } = input;
  const profileCandidates = products.slice(0, MAX_PROFILES);

  const rankingProfile = profileCandidates.map((product, index) =>
    buildProductProfile(rankingEngine, product, index)
  );

  return {
    version: VERSION,
    rankingScore: rankingEngine.rankingScore,
    rankingTier: rankingEngine.rankingTier,
    rankingReasons: [...rankingEngine.rankingReasons],
    rankingWarnings: [...rankingEngine.rankingWarnings],
    rankingConfidence: computeRankingConfidence(rankingEngine),
    rankingProfile,
  };
}
