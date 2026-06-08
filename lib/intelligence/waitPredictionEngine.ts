/**
 * Phase 38 — Wait Prediction Engine.
 * WAIT is invalid without prediction — explains why, savings, probability, timeframe, stock risk.
 */

import type { CommercePriceHistoryIntelligence } from "@/lib/intelligence/commercePriceHistoryEngine";
import type { GlobalAlternatives } from "@/lib/intelligence/globalAlternativeEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";

export type WaitPrediction = {
  version: 1;
  whyWait: string;
  expectedSavings: number;
  dropProbabilityPct: number;
  expectedTimeframe: string;
  stockLossRisk: "low" | "medium" | "high";
  predictionLine: string;
  waitValid: boolean;
};

/** Build wait prediction — only valid WAIT when timing advantage exists. */
export function buildWaitPrediction(args: {
  globalPrice: GlobalPriceIntelligence;
  alternatives: GlobalAlternatives;
  priceHistory?: CommercePriceHistoryIntelligence;
  availability: string;
}): WaitPrediction {
  const { globalPrice, alternatives, priceHistory, availability } = args;

  const cheaperExists = Boolean(alternatives.bestSameProductCheaper || alternatives.bestValueAlternative);
  const overpriced = globalPrice.priceLabel === "OVERPRICED" || globalPrice.priceAdvantagePct < -5;
  const trendDown = priceHistory?.insight.trend === "down";
  const expectedSavings = cheaperExists
    ? Math.max(0, globalPrice.medianMarketPrice - (alternatives.bestSameProductCheaper?.price ?? globalPrice.lowestPriceFound))
    : overpriced
      ? Math.round(Math.abs(globalPrice.priceAdvantagePct) * globalPrice.medianMarketPrice * 0.01)
      : Math.round(globalPrice.medianMarketPrice * 0.05);

  let dropProbabilityPct = 35;
  if (trendDown && priceHistory && priceHistory.insight.volatility01 > 0.5) dropProbabilityPct = 62;
  else if (overpriced) dropProbabilityPct = 55;
  else if (cheaperExists) dropProbabilityPct = 25;

  let expectedTimeframe = "2–4 weeks if seasonal or promo cycles apply";
  if (priceHistory?.seasonalHint) expectedTimeframe = "Next promo window — watch seasonal pricing signals";
  else if (trendDown) expectedTimeframe = "1–3 weeks based on downward price trail";

  const stockLossRisk: WaitPrediction["stockLossRisk"] =
    /limited|low stock|only \d|few left/i.test(availability)
      ? "high"
      : /in stock|available/i.test(availability)
        ? "low"
        : "medium";

  const waitValid = overpriced || trendDown || cheaperExists || dropProbabilityPct >= 50;

  const whyWait = cheaperExists
    ? `Wait because a cheaper same-product offer exists — expected savings ~€${expectedSavings}.`
    : overpriced
      ? `Wait because this listing is above fair market — target savings ~€${expectedSavings}.`
      : trendDown
        ? "Wait because price history trends downward — timing may improve."
        : "Insufficient timing advantage — waiting is not strongly justified.";

  const predictionLine = waitValid
    ? `Expected savings ~€${expectedSavings} · ${dropProbabilityPct}% drop probability · timeframe ${expectedTimeframe} · stock risk ${stockLossRisk}.`
    : "No strong wait prediction — compare alternatives or buy if value is fair.";

  return {
    version: 1,
    whyWait,
    expectedSavings,
    dropProbabilityPct,
    expectedTimeframe,
    stockLossRisk,
    predictionLine,
    waitValid,
  };
}
