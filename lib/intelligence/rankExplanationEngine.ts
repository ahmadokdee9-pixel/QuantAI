/**
 * Phase 41 — Rank Explanation Engine.
 * Every ranked card explains position, beats, and buyer action.
 */

import type { GlobalCategoryIntelligence } from "@/lib/intelligence/globalCategoryIntelligenceEngine";
import type { SearchRankEntry } from "@/lib/intelligence/searchRankingEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { RankingDecisionRecord } from "@/lib/truth/rankingDecisionRecord";

export type RankExplanation = {
  version: 1;
  whyThisRank: string;
  whyNotHigher: string;
  whatBeatsIt: string;
  whyStillUseful: string;
  buyerAction: string;
  rankBlock: string;
};

/** Generate product-specific rank explanation. */
export function buildRankExplanation(args: {
  productTitle: string;
  searchRank: SearchRankEntry;
  verdict: PrimaryVerdict;
  categoryIntel: GlobalCategoryIntelligence;
  beatsItTitle?: string | null;
  isGlobalWinner: boolean;
  rankingDecisionRecord?: RankingDecisionRecord | null;
}): RankExplanation {
  const {
    productTitle,
    searchRank,
    verdict,
    categoryIntel,
    beatsItTitle,
    isGlobalWinner,
    rankingDecisionRecord,
  } = args;
  const shortTitle = productTitle.split(" ").slice(0, 5).join(" ");

  const truthWhy = rankingDecisionRecord?.whyRanked?.trim();
  const layerHint =
    rankingDecisionRecord && rankingDecisionRecord.influencedLayers.length > 0
      ? ` Layers: ${rankingDecisionRecord.influencedLayers.slice(0, 3).join(", ")}.`
      : "";

  const whyThisRank = truthWhy
    ? `${searchRank.rankHeadline} — ${truthWhy}${layerHint}`
    : isGlobalWinner
      ? `${searchRank.rankHeadline} — strongest mix of price, trust, ${categoryIntel.categoryLabel.toLowerCase()} fit, and discount truth.`
      : `${searchRank.rankHeadline} — ranked by category fit (${categoryIntel.categoryFitScore}/100), opportunity, and seller trust.`;

  const whyNotHigher =
    searchRank.rank === 1
      ? rankingDecisionRecord
        ? "Top rank — truth layers support this position; no stronger checkout path in this search universe."
        : "Top rank — no stronger checkout path in this search universe."
      : beatsItTitle
        ? `#${searchRank.rank - 1} ${beatsItTitle.split(" ").slice(0, 4).join(" ")} scores higher on combined opportunity and trust.`
        : "Higher-ranked options combine stronger price advantage, trust, or category fit.";

  const whatBeatsIt = beatsItTitle
    ? `${beatsItTitle.split(" ").slice(0, 5).join(" ")} beats this on overall purchase opportunity.`
    : searchRank.rank === 1
      ? "Nothing in this tray beats it on combined purchase intelligence."
      : "Top-ranked alternatives beat this on price-trust-value balance.";

  const whyStillUseful =
    rankingDecisionRecord?.evidenceChain[0] ??
    (searchRank.label === "Budget Choice"
      ? `Useful budget path for ${categoryIntel.categoryLabel.toLowerCase()} — verify quality and returns.`
      : searchRank.label === "Premium Choice"
        ? `Premium ${categoryIntel.categoryLabel.toLowerCase()} option — quality-led if budget allows.`
        : `${shortTitle} remains useful for ${categoryIntel.categoryReasoning.split("—")[0]?.trim() ?? "this search"}.`);

  const buyerAction =
    verdict === "BUY READY"
      ? "Buy now if this matches your must-haves — confidence reflects current market evidence."
      : verdict === "WAIT"
        ? "Wait — watch price, seller, or stock signals before checkout."
        : verdict === "COMPARE"
          ? "Compare — check top alternatives before committing."
          : verdict === "AVOID"
            ? "Avoid — better options exist in this search."
            : "Review details — data insufficient for confident checkout.";

  return {
    version: 1,
    whyThisRank,
    whyNotHigher,
    whatBeatsIt,
    whyStillUseful,
    buyerAction,
    rankBlock: [whyThisRank, whyNotHigher, buyerAction].join(" "),
  };
}
