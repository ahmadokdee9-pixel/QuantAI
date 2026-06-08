/**
 * Phase 39 — Wait Explanation Engine.
 * Every WAIT must show savings, probability, and timeframe.
 */

import type { WaitPrediction } from "@/lib/intelligence/waitPredictionEngine";

export type WaitExplanation = {
  version: 1;
  whyWait: string;
  expectedSavingEur: number;
  probabilityPct: number;
  expectedTimeframe: string;
  formattedBlock: string;
  evidenceBacked: boolean;
};

/** Build evidence-backed wait explanation — no generic WAIT allowed. */
export function buildWaitExplanation(wait: WaitPrediction): WaitExplanation {
  const evidenceBacked =
    wait.waitValid &&
    wait.expectedSavings > 0 &&
    wait.dropProbabilityPct >= 30 &&
    Boolean(wait.expectedTimeframe);

  const formattedBlock = evidenceBacked
    ? `Expected saving: €${wait.expectedSavings}. Probability: ${wait.dropProbabilityPct}%. Expected timeframe: ${wait.expectedTimeframe}.`
    : "Insufficient wait evidence — prefer compare or buy if value is fair today.";

  return {
    version: 1,
    whyWait: wait.whyWait,
    expectedSavingEur: wait.expectedSavings,
    probabilityPct: wait.dropProbabilityPct,
    expectedTimeframe: wait.expectedTimeframe,
    formattedBlock,
    evidenceBacked,
  };
}

/** WAIT allowed only when future saving exceeds 10% of expected price or strong timing signals exist. */
export function waitIsJustified(args: {
  wait: WaitPrediction;
  medianPrice: number;
  priceHistoryElevated?: boolean;
  seasonalApproaching?: boolean;
}): boolean {
  const { wait, medianPrice, priceHistoryElevated = false, seasonalApproaching = false } = args;
  const savingPct = medianPrice > 0 ? (wait.expectedSavings / medianPrice) * 100 : 0;

  return (
    wait.waitValid &&
    wait.expectedSavings > 0 &&
    (savingPct >= 10 ||
      priceHistoryElevated ||
      seasonalApproaching ||
      wait.dropProbabilityPct >= 55)
  );
}
