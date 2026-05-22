/**
 * P6.2 — Value objective signal.
 */

import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type ValueObjective = {
  valueObjective: number;
  premiumObjective: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateValueObjective(args: {
  decision: DecisionIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  intent: IntentCognitionMeta;
}): ValueObjective {
  const { decision, strategy, intent } = args;
  const valueScore = clamp(
    (intent.valueIntent ?? 0) * 0.35 +
      (decision.valueDecision ?? 0) * 0.3 +
      (strategy.strategicValue ?? 0) * 0.2 +
      (decision.analytics?.trustValueAnalytics ?? 0) * 0.01 * 0.15,
    0,
    1
  );
  const premiumObjective = clamp(
    (intent.premiumIntent ?? 0) * 0.4 + (decision.premiumDecision ?? 0) * 0.35 + (strategy.premiumPositioning ?? 0) * 0.25,
    0,
    1
  );
  return {
    valueObjective: Math.round(valueScore * 1000) / 1000,
    premiumObjective: Math.round(premiumObjective * 1000) / 1000,
  };
}
