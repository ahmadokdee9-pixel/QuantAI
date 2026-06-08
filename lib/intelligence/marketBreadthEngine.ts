/**
 * Phase 41 — Market Breadth Engine.
 * Signals that search touched the full shopping universe.
 */

import type { UniversalOfferGraph } from "@/lib/intelligence/universalOfferGraphEngine";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketBreadthIntelligence = {
  version: 1;
  channelsScanned: string[];
  channelCount: number;
  searchDepthScore: number;
  sameProductOffers: number;
  similarProductOffers: number;
  cheaperAlternatives: number;
  premiumAlternatives: number;
  trustedRetailerAlternatives: number;
  discountedAlternatives: number;
  breadthHeadline: string;
  feelsComprehensive: boolean;
};

/** Summarize market breadth from offer graph and tray. */
export function buildMarketBreadthIntelligence(args: {
  tray: QuantProduct[];
  offerGraph: UniversalOfferGraph;
  medianPrice: number;
}): MarketBreadthIntelligence {
  const { tray, offerGraph, medianPrice } = args;

  const channelsScanned = offerGraph.merchantCoverage;
  const cheaperAlternatives = tray.filter((p) => p.price > 0 && p.price < medianPrice * 0.92).length;
  const premiumAlternatives = tray.filter((p) => p.price > medianPrice * 1.15).length;
  const trustedRetailerAlternatives = tray.filter((p) =>
    /amazon|apple|coolblue|bol|best buy|john lewis|mediamarkt|ikea/i.test(p.store)
  ).length;
  const discountedAlternatives = tray.filter((p) => p.oldPrice != null && p.oldPrice > p.price).length;

  const sameProductOffers = offerGraph.entities.reduce((sum, e) => sum + (e.offerCount > 1 ? e.offerCount : 0), 0);
  const similarProductOffers = Math.max(0, offerGraph.totalOffers - sameProductOffers);

  const searchDepthScore = Math.min(
    100,
    Math.round(
      offerGraph.searchDepthScore * 0.5 +
        channelsScanned.length * 8 +
        Math.min(20, tray.length * 2) +
        (cheaperAlternatives > 0 ? 8 : 0)
    )
  );

  const feelsComprehensive = searchDepthScore >= 55 && channelsScanned.length >= 3;

  return {
    version: 1,
    channelsScanned,
    channelCount: channelsScanned.length,
    searchDepthScore,
    sameProductOffers,
    similarProductOffers,
    cheaperAlternatives,
    premiumAlternatives,
    trustedRetailerAlternatives,
    discountedAlternatives,
    breadthHeadline: feelsComprehensive
      ? `Broad market scan — ${channelsScanned.length} channel types, ${offerGraph.totalOffers} offers analyzed.`
      : `Partial market scan — ${offerGraph.totalOffers} offers across ${channelsScanned.length} channels.`,
    feelsComprehensive,
  };
}
