/**
 * P5.9 — Decision hesitation detection (deterministic).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type DecisionHesitation = {
  decisionHesitation: number;
  hesitationLane: "decisive" | "cautious" | "hesitant";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateDecisionHesitation(args: {
  canonicalQuery: CanonicalQueryContract;
  decision: DecisionIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
}): DecisionHesitation {
  const { canonicalQuery, decision, strategy } = args;
  const compareMode =
    canonicalQuery.intent.primary === "market_compare" || canonicalQuery.marketMode === "hybrid_compare";

  const decisionHesitation = clamp(
    (1 - decision.decisionConfidence) * 0.35 +
      strategy.comparisonIntelligence * 0.25 +
      (compareMode ? 0.25 : 0.1) +
      (decision.routingLane === "compare" ? 0.15 : 0),
    0,
    1
  );

  let hesitationLane: DecisionHesitation["hesitationLane"] = "decisive";
  if (decisionHesitation >= 0.55) hesitationLane = "hesitant";
  else if (decisionHesitation >= 0.35) hesitationLane = "cautious";

  return {
    decisionHesitation: Math.round(decisionHesitation * 1000) / 1000,
    hesitationLane,
  };
}
