/**
 * Phase 38 — Commerce Price History Intelligence (extends priceHistoryEngine).
 */

import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import {
  buildPriceHistoryInsight,
  estimateForwardPriceHint,
  type PriceHistoryInsight,
} from "@/lib/intelligence/priceHistoryEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";

export type PriceHistoryLabel =
  | "Good Price"
  | "Great Price"
  | "Historical Low"
  | "Historical Opportunity"
  | "Fair Price"
  | "Elevated Price";

export type CommercePriceHistoryIntelligence = {
  version: 1;
  label: PriceHistoryLabel;
  historicalLow: number | null;
  historicalHigh: number | null;
  averageMarketPrice: number;
  seasonalHint: string | null;
  reasoning: string;
  insight: PriceHistoryInsight;
};

/** Build commerce-grade price history intelligence for a listing. */
export function buildCommercePriceHistoryIntelligence(args: {
  link: string;
  currentPrice: number;
  memory: MarketMemoryState | null | undefined;
  globalPrice?: GlobalPriceIntelligence;
}): CommercePriceHistoryIntelligence {
  const { link, currentPrice, memory, globalPrice } = args;
  const insight = buildPriceHistoryInsight(link, currentPrice, memory);
  const averageMarketPrice = globalPrice?.medianMarketPrice ?? insight.recentLow ?? currentPrice;
  const historicalLow = insight.recentLow;
  const historicalHigh = insight.recentHigh;

  let label: PriceHistoryLabel = "Fair Price";
  if (historicalLow != null && currentPrice <= historicalLow * 1.02) label = "Historical Low";
  else if ((globalPrice?.priceAdvantagePct ?? 0) >= 12) label = "Great Price";
  else if ((globalPrice?.priceAdvantagePct ?? 0) >= 5) label = "Good Price";
  else if (insight.trend === "down" && insight.volatility01 > 0.45) label = "Historical Opportunity";
  else if (globalPrice?.priceLabel === "OVERPRICED") label = "Elevated Price";

  const forward = estimateForwardPriceHint(currentPrice, insight);
  let reasoning = insight.compactTimelineSummary;
  if (label === "Historical Low") reasoning = `Historical low territory — current ask near remembered floor. ${forward}`.trim();
  else if (label === "Historical Opportunity") reasoning = `Historical opportunity — pricing trend and volatility favor patient buyers. ${forward}`.trim();
  else if (label === "Great Price" || label === "Good Price") {
    reasoning = `${label} vs tray median €${averageMarketPrice}. ${insight.compactTimelineSummary}`;
  }

  return {
    version: 1,
    label,
    historicalLow,
    historicalHigh,
    averageMarketPrice,
    seasonalHint: insight.seasonalHint,
    reasoning,
    insight,
  };
}
