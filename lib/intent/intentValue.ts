/**
 * P6.1 — Premium vs value orientation intent.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type IntentValue = {
  premiumIntent: number;
  valueIntent: number;
  orientation: "premium" | "value" | "balanced";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateIntentValue(args: {
  canonicalQuery: CanonicalQueryContract;
  strategy: StrategyIntelligenceMeta;
  decision: DecisionIntelligenceMeta;
}): IntentValue {
  const { canonicalQuery, strategy, decision } = args;

  const premiumIntent = clamp(
    canonicalQuery.intent.premium01 * 0.45 + strategy.premiumPositioning * 0.35 + decision.premiumDecision * 0.2,
    0,
    1
  );
  const valueIntent = clamp(
    canonicalQuery.budget.intent01 * 0.45 + strategy.strategicValue * 0.35 + decision.valueDecision * 0.2,
    0,
    1
  );

  let orientation: IntentValue["orientation"] = "balanced";
  if (premiumIntent - valueIntent > 0.2) orientation = "premium";
  else if (valueIntent - premiumIntent > 0.2) orientation = "value";

  return {
    premiumIntent: Math.round(premiumIntent * 1000) / 1000,
    valueIntent: Math.round(valueIntent * 1000) / 1000,
    orientation,
  };
}
