/**
 * Phase 37 — Global Commerce Verdict Engine.
 * Priority: BEST DEAL FOUND → BUY READY → COMPARE → WAIT → AVOID
 */

import {
  assessTrayValidity,
  recoverBuyReadyIfMissing,
} from "@/lib/intelligence/buyReadyRecoveryEngine";
import type { GlobalBuyOpportunity } from "@/lib/intelligence/globalBuyOpportunityEngine";
import type { DiscountIntelligenceV2 } from "@/lib/intelligence/discountIntelligenceV2Engine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import type { PreferenceVerdictRow } from "@/lib/ui/preferenceVerdictEngine";

export type GlobalCommercePriorityLabel =
  | "BEST DEAL FOUND"
  | "BUY READY"
  | "COMPARE"
  | "WAIT"
  | "AVOID";

export type GlobalVerdictRow = PreferenceVerdictRow & {
  commercePriorityLabel: GlobalCommercePriorityLabel;
  buyRecoveryMessage?: string;
};

function countVerdict(assignments: Map<string, PrimaryVerdict>, verdict: PrimaryVerdict): number {
  return [...assignments.values()].filter((v) => v === verdict).length;
}

function isRealAvoid(args: {
  decision: UniversalProductDecision;
  buyOpportunity: GlobalBuyOpportunity;
  discountV2: DiscountIntelligenceV2;
}): boolean {
  const intel = args.decision.productIntelligence;
  return (
    (intel?.productQualityScore ?? 50) < 26 ||
    (intel?.trustScore ?? 50) < 30 ||
    args.buyOpportunity.sellerScore < 32 ||
    (args.discountV2.fakeDiscount && args.buyOpportunity.sellerScore < 50)
  );
}

function priorityLabel(
  verdict: PrimaryVerdict,
  buyOpportunity: GlobalBuyOpportunity,
  globalPrice: GlobalPriceIntelligence,
  discountV2: DiscountIntelligenceV2
): GlobalCommercePriorityLabel {
  if (verdict === "AVOID") return "AVOID";
  if (verdict === "WAIT") return "WAIT";
  if (verdict === "COMPARE") return "COMPARE";
  if (buyOpportunity.bestDealFound || globalPrice.priceLabel === "BEST PRICE FOUND" || discountV2.discountLabel === "BEST DEAL FOUND") {
    return "BEST DEAL FOUND";
  }
  return "BUY READY";
}

/** Assign global commerce verdicts with stronger value-led BUY READY. */
export function assignGlobalCommerceVerdicts(args: {
  decisions: Map<string, UniversalProductDecision>;
  buyOpportunityByLink: Map<string, GlobalBuyOpportunity>;
  globalPriceByLink: Map<string, GlobalPriceIntelligence>;
  discountV2ByLink: Map<string, DiscountIntelligenceV2>;
  productsByLink: Map<string, { product: { title: string; price: number; link: string }; searchQuery: string }>;
}): Map<string, GlobalVerdictRow> {
  const { decisions, buyOpportunityByLink, globalPriceByLink, discountV2ByLink, productsByLink } = args;

  const ranked = [...decisions.entries()]
    .map(([link, decision]) => {
      const buy = buyOpportunityByLink.get(link);
      const price = globalPriceByLink.get(link);
      const discount = discountV2ByLink.get(link);
      let score = buy?.buyOpportunityScore ?? 0;
      if (buy?.valueLedBuy) score += 10;
      if (price?.priceLabel === "BEST PRICE FOUND") score += 8;
      if (price?.priceAdvantagePct >= 8) score += 5;
      const avoid =
        !buy ||
        !price ||
        !discount ||
        isRealAvoid({ decision, buyOpportunity: buy, discountV2: discount }) ||
        (score < 36 && !buy.valueLedBuy);

      return { link, score, avoid, spreadScore: score, rankIndex: 0, gapFromTop: 0 };
    })
    .sort((a, b) => b.score - a.score);

  const topScore = ranked[0]?.score ?? 0;
  for (let i = 0; i < ranked.length; i++) {
    ranked[i]!.rankIndex = i;
    ranked[i]!.gapFromTop = topScore - ranked[i]!.score;
  }

  const traySize = ranked.length;
  const assignments = new Map<string, PrimaryVerdict>();
  const actionable = ranked.filter((r) => !r.avoid);
  const avoidRows = ranked.filter((r) => r.avoid);

  for (const row of avoidRows) assignments.set(row.link, "AVOID");

  const actionableCount = actionable.length;
  const maxBuy = actionableCount >= 6 ? Math.min(4, Math.max(2, Math.ceil(actionableCount * 0.22))) : Math.max(1, actionableCount > 0 ? 1 : 0);
  const targetCompare = Math.max(2, Math.ceil(actionableCount * 0.38));
  const maxWait = Math.max(1, Math.ceil(actionableCount * 0.22));

  if (actionableCount > 0) {
    const leader = actionable[0]!;
    assignments.set(leader.link, "BUY READY");

    for (const row of actionable.slice(1)) {
      const buy = buyOpportunityByLink.get(row.link)!;
      const price = globalPriceByLink.get(row.link)!;
      const actionableIndex = actionable.indexOf(row);
      const percentile = actionableCount > 1 ? actionableIndex / (actionableCount - 1) : 0;

      if (
        countVerdict(assignments, "BUY READY") < maxBuy &&
        (buy.buyNowEligible || buy.valueLedBuy || price.priceAdvantagePct >= 8) &&
        row.score >= leader.score * 0.85
      ) {
        assignments.set(row.link, "BUY READY");
      } else if (percentile <= 0.58 && countVerdict(assignments, "COMPARE") < targetCompare) {
        assignments.set(row.link, "COMPARE");
      } else if (countVerdict(assignments, "WAIT") < maxWait && row.score <= leader.score * 0.68) {
        assignments.set(row.link, "WAIT");
      } else if (countVerdict(assignments, "COMPARE") < targetCompare) {
        assignments.set(row.link, "COMPARE");
      } else {
        assignments.set(row.link, "WAIT");
      }
    }
  }

  const validity = assessTrayValidity(decisions, productsByLink);
  const opportunityScoreByLink = new Map(ranked.map((r) => [r.link, r.score]));
  const recovery = recoverBuyReadyIfMissing({
    assignments,
    rankedLinks: ranked.map((r) => r.link),
    validity,
    opportunityScoreByLink,
  });

  const result = new Map<string, GlobalVerdictRow>();
  for (const row of ranked) {
    const verdict = assignments.get(row.link) ?? (row.avoid ? "AVOID" : "COMPARE");
    const buy = buyOpportunityByLink.get(row.link)!;
    const price = globalPriceByLink.get(row.link)!;
    const discount = discountV2ByLink.get(row.link)!;

    result.set(row.link, {
      link: row.link,
      verdict,
      spreadScore: row.spreadScore,
      rankIndex: row.rankIndex,
      gapFromTop: row.gapFromTop,
      traySize,
      buyRecoveryMessage: row.link === recovery.link ? recovery.message : undefined,
      commercePriorityLabel: priorityLabel(verdict, buy, price, discount),
    });
  }

  return result;
}

export function globalCommerceVerdictDistribution(
  authority: Map<string, GlobalVerdictRow>
): Record<PrimaryVerdict, number> & { bestDealFound: number } {
  const dist = {
    "BUY READY": 0,
    WAIT: 0,
    COMPARE: 0,
    AVOID: 0,
    bestDealFound: 0,
  } as Record<PrimaryVerdict, number> & { bestDealFound: number };

  for (const row of authority.values()) {
    dist[row.verdict] += 1;
    if (row.commercePriorityLabel === "BEST DEAL FOUND") dist.bestDealFound += 1;
  }
  return dist;
}
