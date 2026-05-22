/**
 * P6.2 — Conversion objective signal.
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type ConversionObjective = {
  conversionObjective: number;
  readinessObjective: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateConversionObjective(args: {
  behavioral: BehavioralCommerceMeta;
  cognition: CognitionEngineMeta;
  intent: IntentCognitionMeta;
  strategy: StrategyIntelligenceMeta;
}): ConversionObjective {
  const { behavioral, cognition, intent, strategy } = args;
  const readinessObjective = clamp(
    (intent.readinessIntent ?? 0) * 0.35 +
      (behavioral.conversionReadiness ?? 0) * 0.3 +
      (cognition.conversionProbability ?? 0) * 0.2 +
      (1 - (intent.hesitationIntent ?? 0)) * 0.15,
    0,
    1
  );
  const conversionObjective = clamp(
    readinessObjective * 0.45 +
      (strategy.conversionConfidence ?? 0) * 0.25 +
      (behavioral.analytics?.readinessAnalytics ?? 0) * 0.01 * 0.15 +
      (cognition.analytics?.conversionProbabilityAnalytics ?? 0) * 0.01 * 0.15,
    0,
    1
  );
  return {
    conversionObjective: Math.round(conversionObjective * 1000) / 1000,
    readinessObjective: Math.round(readinessObjective * 1000) / 1000,
  };
}
