/**
 * Phase 27.3 — Professional Buyer Ranking.
 * Top listings gain authority; bottom listings gain wait/avoid pressure.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { ProductDifferentiationProfile } from "@/lib/ui/productDifferentiationEngine";
import type { AlternativeDominanceAdjustment } from "@/lib/ui/alternativeDominanceAuthority";

export type BuyerRankedProduct = {
  link: string;
  profile: ProductDifferentiationProfile;
  rankIndex: number;
  confidence: number;
  dominance: AlternativeDominanceAdjustment;
};

export type BuyerRankTier = "lead" | "strong" | "neutral" | "weak" | "tail";

export type BuyerRankContext = {
  tier: BuyerRankTier;
  buyProbability: number;
  waitProbability: number;
  avoidProbability: number;
  authorityBoost: number;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tierFromIndex(index: number, total: number): BuyerRankTier {
  if (index === 0) return "lead";
  if (index <= Math.max(1, Math.floor(total * 0.25))) return "strong";
  if (index <= Math.floor(total * 0.55)) return "neutral";
  if (index <= Math.floor(total * 0.8)) return "weak";
  return "tail";
}

/** Buyer-rank context used to shape verdict + confidence posture. */
export function resolveBuyerRankContext(
  ranked: BuyerRankedProduct[],
  link: string
): BuyerRankContext {
  const ordered = [...ranked].sort((a, b) => b.profile.buyerAuthority - a.profile.buyerAuthority);
  const index = ordered.findIndex((row) => row.link === link);
  const total = ordered.length;
  const tier = tierFromIndex(Math.max(0, index), total);
  const row = ordered[index];

  let buyProbability = 18;
  let waitProbability = 34;
  let avoidProbability = 18;
  let authorityBoost = 0;

  if (tier === "lead") {
    buyProbability = 72;
    waitProbability = 18;
    avoidProbability = 6;
    authorityBoost = 12;
  } else if (tier === "strong") {
    buyProbability = 52;
    waitProbability = 30;
    avoidProbability = 10;
    authorityBoost = 6;
  } else if (tier === "neutral") {
    buyProbability = 30;
    waitProbability = 42;
    avoidProbability = 16;
  } else if (tier === "weak") {
    buyProbability = 14;
    waitProbability = 52;
    avoidProbability = 24;
    authorityBoost = -8;
  } else {
    buyProbability = 6;
    waitProbability = 44;
    avoidProbability = 38;
    authorityBoost = -14;
  }

  if (row?.dominance.suppressBuyReady) {
    buyProbability = Math.max(0, buyProbability - 28);
    waitProbability += 18;
  }
  if (row?.dominance.preferWait) {
    waitProbability += 12;
    buyProbability = Math.max(0, buyProbability - 10);
  }

  return {
    tier,
    buyProbability: clampScore(buyProbability),
    waitProbability: clampScore(waitProbability),
    avoidProbability: clampScore(avoidProbability),
    authorityBoost,
  };
}
