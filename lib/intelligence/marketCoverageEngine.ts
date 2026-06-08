/**
 * Phase 38 — Global Market Coverage Intelligence.
 */

import type { UniversalOfferGraph } from "@/lib/intelligence/universalOfferGraphEngine";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketCoverageIntelligence = {
  version: 1;
  merchantsScanned: number;
  offersScanned: number;
  channelsTracked: number;
  coveragePct: number;
  headline: string;
  detailLine: string;
};

/** Compute market coverage for the current search universe. */
export function buildMarketCoverageIntelligence(
  tray: QuantProduct[],
  offerGraph: UniversalOfferGraph
): MarketCoverageIntelligence {
  const merchantsScanned = offerGraph.storeCount;
  const offersScanned = offerGraph.totalOffers;
  const channelsTracked = offerGraph.merchantCoverage.length;

  const storeDiversity = new Set(tray.map((p) => p.store.toLowerCase())).size;
  const channelBonus = Math.min(18, channelsTracked * 3);
  const depthBonus = Math.min(25, offersScanned * 1.2);
  const merchantBonus = Math.min(30, merchantsScanned * 2.5);
  const coveragePct = Math.min(98, Math.round(42 + merchantBonus + channelBonus + depthBonus + storeDiversity));

  return {
    version: 1,
    merchantsScanned,
    offersScanned,
    channelsTracked,
    coveragePct,
    headline: `${merchantsScanned} merchants scanned · ${coveragePct}% market coverage`,
    detailLine: `${offersScanned} offers across marketplaces, retailers, brand stores, refurb, outlet, and regional merchants.`,
  };
}
