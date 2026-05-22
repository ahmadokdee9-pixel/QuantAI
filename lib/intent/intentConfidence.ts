/**
 * P6.1 — Intent cognition confidence + continuity stabilization score.
 */

import type { IntentContradictionResult } from "@/lib/intent/intentContradictions";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";

export type IntentSignalBundle = {
  recommendationIntent: number;
  comparisonIntent: number;
  premiumIntent: number;
  valueIntent: number;
  trustIntent: number;
  readinessIntent: number;
  hesitationIntent: number;
  emotionalIntent: number;
  aestheticIntent: number;
  explorationIntent: number;
  hiddenBuyingIntent: number;
  intentContinuity: number;
  signalHash: string;
  graphExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildIntentSignalBundle(args: {
  recommendationIntent: number;
  comparisonIntent: number;
  premiumIntent: number;
  valueIntent: number;
  trustIntent: number;
  readinessIntent: number;
  hesitationIntent: number;
  emotionalIntent: number;
  aestheticIntent: number;
  explorationIntent: number;
  hiddenBuyingIntent: number;
  cognition: CognitionEngineMeta;
}): IntentSignalBundle {
  const core = {
    recommendationIntent: args.recommendationIntent,
    comparisonIntent: args.comparisonIntent,
    premiumIntent: args.premiumIntent,
    valueIntent: args.valueIntent,
    trustIntent: args.trustIntent,
    readinessIntent: args.readinessIntent,
    hesitationIntent: args.hesitationIntent,
    emotionalIntent: args.emotionalIntent,
    aestheticIntent: args.aestheticIntent,
    explorationIntent: args.explorationIntent,
    hiddenBuyingIntent: args.hiddenBuyingIntent,
    intentContinuity: round3(clamp(args.cognition.analytics.rankingContinuityAnalytics * 0.01 + args.cognition.cognitionStability * 0.5, 0, 1)),
  };

  const signalHash = Object.entries(core)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");

  const graphExecutionHash = [
    `rec:${core.recommendationIntent}`,
    `cmp:${core.comparisonIntent}`,
    `prem:${core.premiumIntent}`,
    `val:${core.valueIntent}`,
    `trust:${core.trustIntent}`,
    `ready:${core.readinessIntent}`,
  ].join(",");

  return { ...core, signalHash, graphExecutionHash };
}

export function computeIntentConfidence(args: {
  signals: IntentSignalBundle;
  cognition: CognitionEngineMeta;
  contradictions: IntentContradictionResult;
  governanceDampen: number;
}): number {
  const { signals, cognition, contradictions, governanceDampen } = args;

  const signalConfidence = clamp(
    signals.readinessIntent * 0.18 +
      signals.trustIntent * 0.14 +
      signals.hiddenBuyingIntent * 0.12 +
      signals.recommendationIntent * 0.1 +
      signals.comparisonIntent * 0.08 +
      signals.intentContinuity * 0.12 +
      (1 - signals.hesitationIntent) * 0.1 +
      cognition.cognitionConfidence * 0.12,
    0,
    1
  );

  return round3(clamp((signalConfidence - contradictions.uncertaintyScore * 0.12) * governanceDampen, 0, 1));
}
