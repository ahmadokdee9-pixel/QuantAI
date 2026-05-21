/**
 * P5.7 — Strategy confidence scoring.
 */

import type { StrategyProfile } from "@/lib/strategy/strategyProfiles";
import type { StrategySignalBundle } from "@/lib/strategy/strategySignals";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeStrategyConfidence(args: {
  signals: StrategySignalBundle;
  decision: DecisionIntelligenceMeta;
  reasoning: AdaptiveReasoningMeta;
  profile: StrategyProfile;
  governanceDampen: number;
}): number {
  const { signals, decision, reasoning, governanceDampen } = args;

  const signalConfidence = clamp(
    signals.conversionConfidence * 0.2 +
      signals.strategicTrust * 0.12 +
      signals.comparisonIntelligence * 0.1 +
      signals.rankingContinuity * 0.12 +
      signals.commerceStability * 0.1 +
      signals.recommendationHierarchy * 0.08,
    0,
    1
  );

  return round3(
    clamp(signalConfidence * 0.35 + decision.decisionConfidence * 0.35 + reasoning.reasoningConfidence * 0.2, 0, 1) *
      governanceDampen
  );
}
