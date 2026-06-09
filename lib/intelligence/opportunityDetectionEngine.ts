/**
 * Phase 44 — Opportunity Detection Engine.
 * Detects rare market opportunity intensity — additive to Phase 43 calibration.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { CommerceDecisionTier } from "@/lib/intelligence/commerceDecisionCoreEngine";

export type OpportunityLabel = "NORMAL" | "GOOD VALUE" | "STRONG VALUE" | "RARE OPPORTUNITY";

export type ProductOpportunityIntelligence = {
  version: 1;
  score: number;
  label: OpportunityLabel;
  drivers: string[];
  promotedByOpportunity: boolean;
  categoryRankPercentile: number;
};

export type OpportunityDetectionInput = {
  link: string;
  currentTier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
  confidence: number;
  merchantTrust: number;
  rawMerchantTrust: number;
  discountVerified: boolean;
  fakeDiscount: boolean;
  discountAuthenticityScore: number;
  valueBelowMedianPct: number;
  valueScore: number;
  categoryIntelligenceScore: number;
  coveragePct: number;
  categoryRankPercentile: number;
};

export type OpportunityPromotionResult = {
  tier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
  promotedByOpportunity: boolean;
  promotionReason: string | null;
};

const ANTI_SPAM = {
  strongBuyMaxPct: 0.2,
  bestDealMaxPct: 0.05,
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function tierToVerdict(tier: CommerceDecisionTier): PrimaryVerdict {
  if (tier === "WAIT") return "WAIT";
  if (tier === "COMPARE") return "COMPARE";
  return "BUY READY";
}

function tierRank(tier: CommerceDecisionTier): number {
  if (tier === "WAIT") return 0;
  if (tier === "COMPARE") return 1;
  if (tier === "BUY READY") return 2;
  if (tier === "STRONG BUY") return 3;
  return 4;
}

function maxTier(a: CommerceDecisionTier, b: CommerceDecisionTier): CommerceDecisionTier {
  return tierRank(a) >= tierRank(b) ? a : b;
}

export function labelForOpportunityScore(score: number): OpportunityLabel {
  if (score >= 86) return "RARE OPPORTUNITY";
  if (score >= 71) return "STRONG VALUE";
  if (score >= 56) return "GOOD VALUE";
  return "NORMAL";
}

function valueAdvantagePoints(pctBelowMedian: number): number {
  if (pctBelowMedian >= 30) return 30;
  if (pctBelowMedian >= 20) return 24;
  if (pctBelowMedian >= 10) return 16;
  if (pctBelowMedian >= 5) return 8;
  if (pctBelowMedian > 0) return 4;
  return 0;
}

function discountQualityPoints(args: {
  fakeDiscount: boolean;
  discountVerified: boolean;
  discountAuthenticityScore: number;
}): number {
  if (args.fakeDiscount) return 0;
  if (args.discountVerified) return clamp(Math.round(args.discountAuthenticityScore * 0.25), 12, 25);
  return clamp(Math.round(args.discountAuthenticityScore * 0.08), 0, 8);
}

function merchantTrustPoints(merchantTrust: number, fakeDiscount: boolean): number {
  if (merchantTrust < 60) return clamp(Math.round(merchantTrust * 0.08), 0, 5);
  return clamp(Math.round(merchantTrust * 0.2), 0, 20);
}

function categoryStrengthPoints(categoryRankPercentile: number, categoryIntelligenceScore: number): number {
  let points = clamp(Math.round(categoryIntelligenceScore * 0.08), 0, 8);
  if (categoryRankPercentile <= 10) points += 15;
  else if (categoryRankPercentile <= 25) points += 10;
  else if (categoryRankPercentile <= 50) points += 5;
  return clamp(points, 0, 15);
}

function coverageConfidencePoints(coveragePct: number): number {
  return clamp(Math.round(coveragePct * 0.1), 0, 10);
}

/** Compute 0–100 opportunity score from value, discount, trust, category, and coverage signals. */
export function computeOpportunityScore(
  input: Omit<OpportunityDetectionInput, "link" | "currentTier" | "verdict" | "rawMerchantTrust">
): number {
  const valuePts = valueAdvantagePoints(input.valueBelowMedianPct);
  const discountPts = discountQualityPoints({
    fakeDiscount: input.fakeDiscount,
    discountVerified: input.discountVerified,
    discountAuthenticityScore: input.discountAuthenticityScore,
  });
  const merchantPts = merchantTrustPoints(input.merchantTrust, input.fakeDiscount);
  const categoryPts = categoryStrengthPoints(input.categoryRankPercentile, input.categoryIntelligenceScore);
  const coveragePts = coverageConfidencePoints(input.coveragePct);

  return clamp(Math.round(valuePts + discountPts + merchantPts + categoryPts + coveragePts), 0, 100);
}

export function buildOpportunityDrivers(input: {
  score: number;
  valueBelowMedianPct: number;
  discountVerified: boolean;
  fakeDiscount: boolean;
  discountAuthenticityScore: number;
  merchantTrust: number;
  categoryRankPercentile: number;
  coveragePct: number;
}): string[] {
  const drivers: string[] = [];

  if (input.discountVerified && !input.fakeDiscount) drivers.push("Discount Signal");
  if (input.valueBelowMedianPct >= 20) drivers.push("Exceptional Value");
  else if (input.valueBelowMedianPct >= 10) drivers.push("Strong Value Advantage");
  else if (input.valueBelowMedianPct >= 5) drivers.push("Value Advantage");

  if (input.merchantTrust >= 85) drivers.push("High Trust Signal Seller");
  else if (input.merchantTrust >= 75) drivers.push("Strong Merchant");

  if (input.categoryRankPercentile <= 10) drivers.push("Top Category Ranking");
  else if (input.categoryRankPercentile <= 25) drivers.push("Category Leader");

  if (input.coveragePct >= 80) drivers.push("Deep Market Coverage");
  else if (input.coveragePct >= 60) drivers.push("Solid Coverage");

  if (input.score >= 86) drivers.push("Rare Market Opportunity");
  else if (input.score >= 71) drivers.push("High Opportunity Intensity");

  return drivers.slice(0, 6);
}

/** Compute category opportunity rank percentiles (lower = better opportunity). */
export function computeCategoryOpportunityPercentiles(
  scoresByLink: Map<string, number>
): Map<string, number> {
  const ranked = [...scoresByLink.entries()].sort((a, b) => b[1] - a[1]);
  const percentiles = new Map<string, number>();
  const total = ranked.length;
  ranked.forEach(([link], index) => {
    percentiles.set(
      link,
      total <= 1 ? 0 : Math.round((index / Math.max(1, total - 1)) * 100)
    );
  });
  return percentiles;
}

function qualifiesStrongBuy(input: OpportunityDetectionInput, score: number): boolean {
  return (
    score > 85 &&
    input.confidence > 85 &&
    input.merchantTrust > 80 &&
    input.discountVerified &&
    !input.fakeDiscount &&
    input.merchantTrust >= 60
  );
}

function qualifiesBestDeal(input: OpportunityDetectionInput, score: number): boolean {
  return (
    score > 92 &&
    input.merchantTrust > 85 &&
    input.rawMerchantTrust > 85 &&
    input.confidence > 90 &&
    input.coveragePct > 80 &&
    input.discountVerified &&
    !input.fakeDiscount &&
    input.categoryRankPercentile <= 3
  );
}

function qualifiesComparePromotion(input: OpportunityDetectionInput, score: number): boolean {
  return (
    input.currentTier === "COMPARE" &&
    score > 80 &&
    input.merchantTrust > 75 &&
    input.discountVerified &&
    input.confidence > 75 &&
    !input.fakeDiscount
  );
}

/** Apply opportunity-based tier promotion — never demotes Phase 43 outcomes. */
export function applyOpportunityPromotion(
  input: OpportunityDetectionInput,
  opportunityScore: number
): OpportunityPromotionResult {
  let tier = input.currentTier;
  let promotedByOpportunity = false;
  let promotionReason: string | null = null;

  if (input.fakeDiscount || input.merchantTrust < 60) {
    return { tier, verdict: tierToVerdict(tier), promotedByOpportunity, promotionReason };
  }

  if (qualifiesComparePromotion(input, opportunityScore)) {
    tier = maxTier(tier, "BUY READY");
    promotedByOpportunity = tier === "BUY READY" && input.currentTier === "COMPARE";
    if (promotedByOpportunity) promotionReason = "compare_to_buy_ready_opportunity";
  }

  if (qualifiesStrongBuy(input, opportunityScore)) {
    const next = maxTier(tier, "STRONG BUY");
    if (tierRank(next) > tierRank(tier)) {
      promotedByOpportunity = true;
      promotionReason = "strong_buy_opportunity";
    }
    tier = next;
  }

  if (qualifiesBestDeal(input, opportunityScore)) {
    const next = maxTier(tier, "BEST DEAL");
    if (tierRank(next) > tierRank(tier)) {
      promotedByOpportunity = true;
      promotionReason = "best_deal_opportunity";
    }
    tier = next;
  }

  return {
    tier,
    verdict: tierToVerdict(tier),
    promotedByOpportunity,
    promotionReason,
  };
}

function countTier(map: Map<string, CommerceDecisionTier>, tier: CommerceDecisionTier): number {
  return [...map.values()].filter((t) => t === tier).length;
}

/** Cap STRONG BUY ≤20% and BEST DEAL ≤5% — demote excess to BUY READY only. */
export function enforceOpportunityAntiSpam(args: {
  rankedLinks: string[];
  tierByLink: Map<string, CommerceDecisionTier>;
}): Map<string, CommerceDecisionTier> {
  const { rankedLinks, tierByLink } = args;
  const traySize = rankedLinks.length;
  if (traySize === 0) return tierByLink;

  const next = new Map(tierByLink);
  const maxBestDeal = Math.max(1, Math.ceil(traySize * ANTI_SPAM.bestDealMaxPct));
  const maxStrongBuy = Math.ceil(traySize * ANTI_SPAM.strongBuyMaxPct);

  let bestDeal = countTier(next, "BEST DEAL");
  if (bestDeal > maxBestDeal) {
    for (const link of [...rankedLinks].reverse()) {
      if (bestDeal <= maxBestDeal) break;
      if (next.get(link) === "BEST DEAL") {
        next.set(link, "STRONG BUY");
        bestDeal -= 1;
      }
    }
  }

  let strongBuy = countTier(next, "STRONG BUY");
  if (strongBuy > maxStrongBuy) {
    for (const link of [...rankedLinks].reverse()) {
      if (strongBuy <= maxStrongBuy) break;
      if (next.get(link) === "STRONG BUY") {
        next.set(link, "BUY READY");
        strongBuy -= 1;
      }
    }
  }

  return next;
}

export type OpportunityDistribution = {
  wait: number;
  compare: number;
  buyReady: number;
  strongBuy: number;
  bestDeal: number;
};

/** Demote invalid opportunity tiers — never reduces BUY READY volume. */
export function enforceOpportunityMerchantGates(args: {
  tierByLink: Map<string, CommerceDecisionTier>;
  inputsByLink: Map<string, OpportunityDetectionInput>;
}): Map<string, CommerceDecisionTier> {
  const next = new Map(args.tierByLink);

  for (const [link, tier] of next) {
    const input = args.inputsByLink.get(link);
    if (!input) continue;

    if (input.rawMerchantTrust < 60 || input.fakeDiscount) {
      if (tier === "BEST DEAL" || tier === "STRONG BUY") {
        next.set(link, "BUY READY");
      }
      continue;
    }

    if (tier === "BEST DEAL" && input.rawMerchantTrust <= 85) {
      next.set(link, "STRONG BUY");
    }

    if (tier === "STRONG BUY" && input.rawMerchantTrust <= 80) {
      next.set(link, "BUY READY");
    }
  }

  return next;
}

export function opportunityDistributionSummary(
  tierByLink: Map<string, CommerceDecisionTier>
): OpportunityDistribution {
  const dist = { wait: 0, compare: 0, buyReady: 0, strongBuy: 0, bestDeal: 0 };
  for (const tier of tierByLink.values()) {
    if (tier === "WAIT") dist.wait += 1;
    else if (tier === "COMPARE") dist.compare += 1;
    else if (tier === "BUY READY") dist.buyReady += 1;
    else if (tier === "STRONG BUY") dist.strongBuy += 1;
    else if (tier === "BEST DEAL") dist.bestDeal += 1;
  }
  return dist;
}

export function buildProductOpportunityIntelligence(args: {
  input: OpportunityDetectionInput;
  opportunityScore: number;
  promotion: OpportunityPromotionResult;
}): ProductOpportunityIntelligence {
  const { input, opportunityScore, promotion } = args;
  return {
    version: 1,
    score: opportunityScore,
    label: labelForOpportunityScore(opportunityScore),
    drivers: buildOpportunityDrivers({
      score: opportunityScore,
      valueBelowMedianPct: input.valueBelowMedianPct,
      discountVerified: input.discountVerified,
      fakeDiscount: input.fakeDiscount,
      discountAuthenticityScore: input.discountAuthenticityScore,
      merchantTrust: input.merchantTrust,
      categoryRankPercentile: input.categoryRankPercentile,
      coveragePct: input.coveragePct,
    }),
    promotedByOpportunity: promotion.promotedByOpportunity,
    categoryRankPercentile: input.categoryRankPercentile,
  };
}
