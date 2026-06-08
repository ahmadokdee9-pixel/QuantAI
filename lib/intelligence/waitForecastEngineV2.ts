/**
 * Phase 40 — Wait Forecast Engine V2.
 * Every WAIT must carry savings, probability, and timeframe forecast.
 */

import type { WaitPrediction } from "@/lib/intelligence/waitPredictionEngine";
import type { WaitExplanation } from "@/lib/intelligence/waitExplanationEngine";

export type WaitForecastV2 = {
  version: 2;
  expectedSavingsEur: number;
  probabilityPct: number;
  expectedTimeframe: string;
  forecastLine: string;
  formattedBlock: string;
  forecastValid: boolean;
};

/** Build actionable WAIT forecast — no WAIT without forecast. */
export function buildWaitForecastV2(args: {
  wait: WaitPrediction;
  waitExplanation?: WaitExplanation;
}): WaitForecastV2 {
  const { wait, waitExplanation } = args;

  const expectedSavingsEur = Math.max(0, wait.expectedSavings);
  const probabilityPct = clampPct(wait.dropProbabilityPct);
  const expectedTimeframe = wait.expectedTimeframe || "2–4 weeks";
  const forecastValid =
    wait.waitValid &&
    expectedSavingsEur > 0 &&
    probabilityPct >= 30 &&
    Boolean(expectedTimeframe);

  const formattedBlock = forecastValid
    ? `Expected Savings: €${expectedSavingsEur}. Probability: ${probabilityPct}%. Expected Timeframe: ${expectedTimeframe}.`
    : waitExplanation?.formattedBlock ??
      "Insufficient wait forecast — compare or buy if current pricing is fair.";

  return {
    version: 2,
    expectedSavingsEur,
    probabilityPct,
    expectedTimeframe,
    forecastLine: forecastValid ? formattedBlock : "Wait forecast unavailable.",
    formattedBlock,
    forecastValid,
  };
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(99, Math.round(n)));
}

export function waitForecastIsActionable(forecast: WaitForecastV2): boolean {
  return forecast.forecastValid;
}
