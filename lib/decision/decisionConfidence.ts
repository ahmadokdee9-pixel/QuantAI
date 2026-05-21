/**
 * P5.6 — Decision confidence scoring (deterministic stabilization).
 */

import type { DecisionProfile } from "@/lib/decision/decisionProfiles";
import type { DecisionSignalBundle } from "@/lib/decision/decisionSignals";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeDecisionConfidence(args: {
  signals: DecisionSignalBundle;
  profile: DecisionProfile;
  governanceDampen: number;
}): number {
  const { signals, profile, governanceDampen } = args;

  const raw =
    signals.trustScore * 0.14 +
    signals.valueScore * 0.1 +
    signals.qualityConfidence * 0.12 +
    signals.comparisonConfidence * 0.1 +
    signals.recommendationStrength * 0.12 +
    signals.merchantReliability * 0.1 +
    signals.rankingContinuity * 0.12 +
    signals.stabilityScore * 0.1 +
    signals.replayIntegrity * 0.1 -
    signals.returnRiskScore * 0.1;

  return round3(clamp(raw * governanceDampen, 0, 1));
}
