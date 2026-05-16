/**
 * QuantAI wait score — buy / wait / monitor posture with savings hint (heuristic, not a forecast).
 */

import type { FakeDiscountRisk } from "@/lib/deals/types";
import type { PriceHistoryInsight } from "@/lib/intelligence/priceHistoryEngine";
import type { TrayMarketBehavior } from "@/lib/intelligence/marketBehavior";

export type DealTimingCategoryArg = "strong_window" | "neutral" | "wait_favored" | "unstable_tray";

export type WaitScoreResult = {
  shouldBuyNow: boolean;
  shouldWait: boolean;
  shouldMonitor: boolean;
  urgencyConfidence01: number;
  /** Rough delta vs fair if wait posture; null if unknown. */
  expectedSavingsEstimate: number | null;
  headline: string;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function computeWaitScore(args: {
  goodTimeToBuy: boolean;
  waitForBetterPricing: boolean;
  timingCategory: DealTimingCategoryArg;
  fake: FakeDiscountRisk;
  suspiciousDiscountRisk: number;
  trust: number;
  fair: number;
  price: number;
  history: PriceHistoryInsight;
  behavior: TrayMarketBehavior;
}): WaitScoreResult {
  const {
    goodTimeToBuy,
    waitForBetterPricing,
    timingCategory,
    fake,
    suspiciousDiscountRisk,
    trust,
    fair,
    price,
    history,
    behavior,
  } = args;

  let shouldBuyNow = false;
  let shouldWait = false;
  let shouldMonitor = false;
  let urgencyConfidence01 = 0.45;
  let expectedSavingsEstimate: number | null = null;
  let headline = "Monitor: re-search beats guessing a calendar drop.";

  const memVol = history.volatility01;
  const savingsIfWait =
    fair > 0 && price > 0 && price > fair * 1.05 ? Math.round(price - fair * 0.96) : fair > 0 && price > fair ? Math.round(price - fair) : null;

  if (fake === "high" || suspiciousDiscountRisk >= 72) {
    shouldMonitor = true;
    urgencyConfidence01 = 0.38;
    headline = "Avoid anchoring on urgency—discount hygiene is weak; verify before any buy impulse.";
    return { shouldBuyNow, shouldWait, shouldMonitor, urgencyConfidence01, expectedSavingsEstimate: null, headline };
  }

  if (waitForBetterPricing || timingCategory === "wait_favored") {
    shouldWait = true;
    urgencyConfidence01 = clamp01(0.42 + memVol * 0.22);
    expectedSavingsEstimate = savingsIfWait != null && savingsIfWait > 6 ? savingsIfWait : null;
    headline =
      expectedSavingsEstimate != null && expectedSavingsEstimate > 10
        ? `Wait-leaning: memory + tray band suggest ~${expectedSavingsEstimate} headroom if a cleaner row appears.`
        : "Wait-leaning: patience is rational unless specs and policy are already perfect.";
    return { shouldBuyNow, shouldWait, shouldMonitor, urgencyConfidence01, expectedSavingsEstimate, headline };
  }

  if (goodTimeToBuy && fake === "low" && trust >= 60 && timingCategory === "strong_window") {
    shouldBuyNow = true;
    urgencyConfidence01 = clamp01(0.55 + (trust >= 72 ? 0.18 : 0));
    headline = "Buy window (snapshot): trust + discount corroboration line up—still confirm SKU and returns.";
    return { shouldBuyNow, shouldWait, shouldMonitor, urgencyConfidence01, expectedSavingsEstimate: null, headline };
  }

  if (behavior.regime === "panic_discounting" || behavior.regime === "market_hot") {
    shouldMonitor = true;
    urgencyConfidence01 = clamp01(0.48 + behavior.heat01 * 0.2);
    headline = "Hot tray: let volatility settle—alerts + a second pass beat chasing a moving floor.";
    return { shouldBuyNow, shouldWait, shouldMonitor, urgencyConfidence01, expectedSavingsEstimate, headline };
  }

  if (history.sampleCount >= 4 && history.trend === "down" && memVol > 0.5) {
    shouldMonitor = true;
    urgencyConfidence01 = 0.5;
    expectedSavingsEstimate = savingsIfWait;
    headline = "Memory shows drift lower with noise—monitor with a price alert instead of timing heroics.";
    return { shouldBuyNow, shouldWait, shouldMonitor, urgencyConfidence01, expectedSavingsEstimate, headline };
  }

  shouldMonitor = true;
  urgencyConfidence01 = 0.46;
  return { shouldBuyNow, shouldWait, shouldMonitor, urgencyConfidence01, expectedSavingsEstimate, headline };
}
