/**
 * P6.2 — Stability / continuity objective signal.
 */

import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";

export type StabilityObjective = {
  stabilityObjective: number;
  continuityStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateStabilityObjective(args: {
  cognition: CognitionEngineMeta;
  intent: IntentCognitionMeta;
  behavioral: BehavioralCommerceMeta;
}): StabilityObjective {
  const { cognition, intent, behavioral } = args;
  const continuityStrength = clamp(
    (intent.analytics?.continuityAnalytics ?? 0) * 0.01 * 0.35 +
      (cognition.cognitionStability ?? 0) * 0.35 +
      (cognition.analytics?.rankingContinuityAnalytics ?? 0) * 0.01 * 0.2 +
      (behavioral.analytics?.rankingContinuityAnalytics ?? 0) * 0.01 * 0.1,
    0,
    1
  );
  const stabilityObjective = clamp(
    continuityStrength * 0.5 +
      (1 - (intent.intentDelta ?? 0) * 0.5) * 0.25 +
      (cognition.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.25,
    0,
    1
  );
  return {
    stabilityObjective: Math.round(stabilityObjective * 1000) / 1000,
    continuityStrength: Math.round(continuityStrength * 1000) / 1000,
  };
}
