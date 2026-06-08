/**
 * Phase 41 — Market Summary V2.
 * Neutral market summary — no global BUY/WAIT verdict.
 */

import type { BestSavingsIntelligence } from "@/lib/intelligence/bestSavingsEngine";
import type { GlobalWinnerResult } from "@/lib/intelligence/globalWinnerEngine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import type { SearchRankEntry } from "@/lib/intelligence/searchRankingEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type MarketSummaryV2 = {
  version: 2;
  marketCoverage: string;
  bestOverallChoice: string | null;
  bestDealFound: string | null;
  bestBudgetOption: string | null;
  bestPremiumOption: string | null;
  strongAlternatives: string[];
  watchWaitItems: string[];
  avoidItems: string[];
  synthesisLine: string;
  headline: string;
};

/** Build neutral market summary — product-level decisions only. */
export function buildMarketSummaryV2(args: {
  coverage: MarketCoverageIntelligence;
  savings: BestSavingsIntelligence;
  winner: GlobalWinnerResult;
  searchRanks: SearchRankEntry[];
  titlesByLink: Map<string, string>;
  verdictByLink: Map<string, PrimaryVerdict>;
  discountLabelsByLink: Map<string, string[]>;
}): MarketSummaryV2 {
  const { coverage, savings, winner, searchRanks, titlesByLink, verdictByLink, discountLabelsByLink } = args;

  const short = (link: string) => titlesByLink.get(link)?.split(" ").slice(0, 4).join(" ") ?? null;

  const bestOverallChoice = winner.winnerTitle ? winner.winnerTitle.split(" ").slice(0, 5).join(" ") : null;

  const bestDealLink = searchRanks.find((r) =>
    (discountLabelsByLink.get(r.link) ?? []).includes("BEST DEAL FOUND")
  )?.link;
  const bestDealFound = bestDealLink ? short(bestDealLink) : bestOverallChoice;

  const budgetLink = searchRanks.find((r) => r.label === "Budget Choice")?.link;
  const premiumLink = searchRanks.find((r) => r.label === "Premium Choice")?.link;

  const strongAlternatives = searchRanks
    .filter((r) => r.label === "Strong Alternative" || r.rank === 2)
    .map((r) => short(r.link))
    .filter(Boolean) as string[];

  const watchWaitItems = [...verdictByLink.entries()]
    .filter(([, v]) => v === "WAIT")
    .map(([link]) => short(link))
    .filter(Boolean) as string[];

  const avoidItems = [...verdictByLink.entries()]
    .filter(([, v]) => v === "AVOID")
    .map(([link]) => short(link))
    .filter(Boolean) as string[];

  const synthesisLine = [
    `Market Coverage ${coverage.coveragePct}% · ${coverage.merchantsScanned} merchants`,
    bestOverallChoice ? `Best Overall Choice: ${bestOverallChoice}` : null,
    bestDealFound ? `Best Deal Found: ${bestDealFound}` : null,
    budgetLink ? `Best Budget Option: ${short(budgetLink)}` : savings.bestPrice > 0 ? `Lowest price €${savings.bestPrice}` : null,
    premiumLink ? `Best Premium Option: ${short(premiumLink)}` : null,
    strongAlternatives.length ? `Strong Alternatives: ${strongAlternatives.slice(0, 2).join(", ")}` : null,
    watchWaitItems.length ? `Watch/Wait: ${watchWaitItems.slice(0, 2).join(", ")}` : null,
    avoidItems.length ? `Avoid: ${avoidItems.slice(0, 2).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    version: 2,
    marketCoverage: `${coverage.coveragePct}% · ${coverage.merchantsScanned} merchants scanned`,
    bestOverallChoice,
    bestDealFound,
    bestBudgetOption: budgetLink ? short(budgetLink) : null,
    bestPremiumOption: premiumLink ? short(premiumLink) : null,
    strongAlternatives,
    watchWaitItems,
    avoidItems,
    synthesisLine,
    headline: coverage.headline,
  };
}
