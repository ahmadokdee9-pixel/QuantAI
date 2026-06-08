/**
 * Phase 36 — Final Tray Verdict Summary.
 * Internal tray-level commerce decision roles for brief/summary logic.
 */

import type { DiscountOpportunityInsight } from "@/lib/intelligence/discountOpportunityEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

export type TrayCommerceSummary = {
  version: 1;
  bestBuyNowLink: string | null;
  bestDiscountLink: string | null;
  bestCheaperAlternativeLink: string | null;
  bestPremiumLink: string | null;
  avoidLinks: string[];
  shouldBuyNow: boolean;
  shouldWait: boolean;
  headline: string;
};

export function buildTrayCommerceSummary(args: {
  decisions: Map<string, UniversalProductDecision>;
  discountByLink: Map<string, DiscountOpportunityInsight>;
  pricesByLink: Map<string, number>;
}): TrayCommerceSummary {
  const { decisions, discountByLink, pricesByLink } = args;

  let bestBuyNowLink: string | null = null;
  let bestDiscountLink: string | null = null;
  let bestCheaperAlternativeLink: string | null = null;
  let bestPremiumLink: string | null = null;
  const avoidLinks: string[] = [];

  let topBuyScore = -1;
  let topDiscount = -1;
  let lowestPrice = Number.POSITIVE_INFINITY;
  let highestPrice = 0;

  for (const [link, decision] of decisions) {
    if (decision.verdict === "AVOID") avoidLinks.push(link);

    const discount = discountByLink.get(link);
    const price = pricesByLink.get(link) ?? 0;
    const opp = decision.productIntelligence?.personalCommerceScore?.personalCommerceScore ?? 0;

    if (decision.verdict === "BUY READY" && opp > topBuyScore) {
      topBuyScore = opp;
      bestBuyNowLink = link;
    }
    if ((discount?.discountScore ?? 0) > topDiscount) {
      topDiscount = discount!.discountScore;
      bestDiscountLink = link;
    }
    if (price > 0 && price < lowestPrice) {
      lowestPrice = price;
      bestCheaperAlternativeLink = link;
    }
    if (price > highestPrice) {
      highestPrice = price;
      bestPremiumLink = link;
    }
  }

  if (!bestBuyNowLink) {
    bestBuyNowLink =
      [...decisions.entries()]
        .filter(([, d]) => d.verdict !== "AVOID")
        .sort(
          (a, b) =>
            (b[1].productIntelligence?.personalCommerceScore?.personalCommerceScore ?? 0) -
            (a[1].productIntelligence?.personalCommerceScore?.personalCommerceScore ?? 0)
        )[0]?.[0] ?? null;
  }

  const buyCount = [...decisions.values()].filter((d) => d.verdict === "BUY READY").length;
  const waitCount = [...decisions.values()].filter((d) => d.verdict === "WAIT").length;

  return {
    version: 1,
    bestBuyNowLink,
    bestDiscountLink,
    bestCheaperAlternativeLink,
    bestPremiumLink,
    avoidLinks,
    shouldBuyNow: buyCount >= 1,
    shouldWait: buyCount === 0 && waitCount > 0,
    headline: buyCount >= 1 ? "Buy opportunity identified in this tray." : "Wait or compare before purchasing.",
  };
}
