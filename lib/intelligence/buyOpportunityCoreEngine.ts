/**
 * Phase 42 — Buy Opportunity Core Engine.
 * Balanced distribution — not excessive WAIT or BUY READY.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { CommerceDecisionTier } from "@/lib/intelligence/commerceDecisionCoreEngine";

export type BuyOpportunityDistribution = {
  wait: number;
  compare: number;
  buyReady: number;
  strongBuy: number;
  bestDeal: number;
};

export type BuyOpportunityCoreResult = {
  version: 1;
  tier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
  distribution: BuyOpportunityDistribution;
  executivePass: boolean;
  reasoning: string;
};

const TARGET = {
  waitMin: 0.2,
  waitMax: 0.3,
  compareMin: 0.35,
  compareMax: 0.45,
  buyReadyMin: 0.15,
  buyReadyMax: 0.25,
  strongBuyMin: 0.05,
  strongBuyMax: 0.15,
  bestDealMin: 0.01,
  bestDealMax: 0.05,
};

function countTier(dist: Map<string, CommerceDecisionTier>, tier: CommerceDecisionTier): number {
  return [...dist.values()].filter((t) => t === tier).length;
}

/** Assign balanced buy opportunity tiers across tray. */
export function assignBuyOpportunityTiers(args: {
  rankedLinks: string[];
  compositeScoreByLink: Map<string, number>;
  executiveYesByLink: Map<string, boolean>;
  traySize: number;
}): Map<string, BuyOpportunityCoreResult> {
  const { rankedLinks, compositeScoreByLink, executiveYesByLink, traySize } = args;
  const results = new Map<string, BuyOpportunityCoreResult>();
  const tierAssignments = new Map<string, CommerceDecisionTier>();

  const actionable = rankedLinks.length;
  const maxWait = Math.ceil(actionable * TARGET.waitMax);
  const maxBestDeal = Math.max(1, Math.ceil(actionable * TARGET.bestDealMax));
  const maxStrongBuy = Math.ceil(actionable * TARGET.strongBuyMax);
  const maxBuyReady = Math.ceil(actionable * TARGET.buyReadyMax);

  let waitCount = 0;
  let bestDealCount = 0;
  let strongBuyCount = 0;
  let buyReadyCount = 0;

  rankedLinks.forEach((link, index) => {
    const score = compositeScoreByLink.get(link) ?? 0;
    const executiveYes = executiveYesByLink.get(link) ?? false;
    const percentile = actionable > 1 ? index / (actionable - 1) : 0;

    let tier: CommerceDecisionTier = "COMPARE";

    if (
      bestDealCount < maxBestDeal &&
      score >= 88 &&
      executiveYes &&
      index === 0
    ) {
      tier = "BEST DEAL";
      bestDealCount += 1;
    } else if (
      strongBuyCount < maxStrongBuy &&
      score >= 82 &&
      executiveYes &&
      percentile <= 0.15
    ) {
      tier = "STRONG BUY";
      strongBuyCount += 1;
    } else if (
      buyReadyCount < maxBuyReady &&
      score >= 72 &&
      executiveYes &&
      percentile <= 0.35
    ) {
      tier = "BUY READY";
      buyReadyCount += 1;
    } else if (
      waitCount < maxWait &&
      score < 52 &&
      !executiveYes &&
      percentile > 0.7
    ) {
      tier = "WAIT";
      waitCount += 1;
    } else {
      tier = "COMPARE";
    }

    tierAssignments.set(link, tier);
  });

  // Rebalance: ensure minimum compare share
  const compareCount = countTier(tierAssignments, "COMPARE");
  if (compareCount < Math.ceil(actionable * TARGET.compareMin)) {
    for (const link of [...rankedLinks].reverse()) {
      if (tierAssignments.get(link) === "WAIT" && compareCount < actionable * TARGET.compareMin) {
        tierAssignments.set(link, "COMPARE");
      }
    }
  }

  const dist: BuyOpportunityDistribution = {
    wait: countTier(tierAssignments, "WAIT"),
    compare: countTier(tierAssignments, "COMPARE"),
    buyReady: countTier(tierAssignments, "BUY READY"),
    strongBuy: countTier(tierAssignments, "STRONG BUY"),
    bestDeal: countTier(tierAssignments, "BEST DEAL"),
  };

  for (const [link, tier] of tierAssignments) {
    const executiveYes = executiveYesByLink.get(link) ?? false;
    const verdict: PrimaryVerdict =
      tier === "WAIT" ? "WAIT" : tier === "COMPARE" ? "COMPARE" : "BUY READY";

    results.set(link, {
      version: 1,
      tier,
      verdict,
      distribution: dist,
      executivePass: executiveYes,
      reasoning:
        tier === "BEST DEAL"
          ? "Rare market-leading opportunity — QuantAI would spend its own money here."
          : tier === "STRONG BUY"
            ? "Exceptional opportunity with strong evidence across value, trust, and discount proof."
            : tier === "BUY READY"
              ? "Strong purchase opportunity — confident checkout path today."
              : tier === "WAIT"
                ? "Market conditions unfavorable — patience advised."
                : "Good option — alternatives deserve review before checkout.",
    });
  }

  return results;
}

export function buyOpportunityDistributionSummary(
  results: Map<string, BuyOpportunityCoreResult>
): BuyOpportunityDistribution {
  const dist = { wait: 0, compare: 0, buyReady: 0, strongBuy: 0, bestDeal: 0 };
  for (const r of results.values()) {
    if (r.tier === "WAIT") dist.wait += 1;
    else if (r.tier === "COMPARE") dist.compare += 1;
    else if (r.tier === "BUY READY") dist.buyReady += 1;
    else if (r.tier === "STRONG BUY") dist.strongBuy += 1;
    else if (r.tier === "BEST DEAL") dist.bestDeal += 1;
  }
  return dist;
}
