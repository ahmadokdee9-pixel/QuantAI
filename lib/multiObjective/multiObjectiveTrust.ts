/**
 * P6.2 — Trust objective signal.
 */

import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type TrustObjective = {
  trustObjective: number;
  trustSensitivity: "low" | "moderate" | "high";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateTrustObjective(args: {
  decision: DecisionIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  intent: IntentCognitionMeta;
}): TrustObjective {
  const { decision, strategy, intent } = args;
  const score = clamp(
    (intent.trustIntent ?? 0) * 0.3 +
      (decision.trustDecision ?? 0) * 0.25 +
      (strategy.strategicTrust ?? 0) * 0.2 +
      (decision.merchantDecision ?? 0) * 0.15 +
      (decision.analytics?.merchantReliabilityAnalytics ?? 0) * 0.01 * 0.1,
    0,
    1
  );

  let trustSensitivity: TrustObjective["trustSensitivity"] = "moderate";
  if (score >= 0.55) trustSensitivity = "high";
  else if (score < 0.25) trustSensitivity = "low";

  return {
    trustObjective: Math.round(score * 1000) / 1000,
    trustSensitivity,
  };
}
