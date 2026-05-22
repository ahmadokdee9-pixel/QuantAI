/**
 * P6.6 — Commerce decision intelligence evaluation runner.
 */
import { MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV } from "./marketRealityRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV = {
  ...MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV,
  COMMERCE_DECISION_INTELLIGENCE_ENABLED: "true",
  COMMERCE_DECISION_INTELLIGENCE_MODE: "bounded-decision",
};

export const COMMERCE_DECISION_INTELLIGENCE_TELEMETRY_ENV = {
  ...MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV,
  NODE_ENV: "production",
  COMMERCE_DECISION_INTELLIGENCE_ENABLED: "true",
  COMMERCE_DECISION_INTELLIGENCE_MODE: "telemetry-only",
};

export function runCommerceDecisionPartitions(env = COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    commerceDecisionIntelligence: r.commerceDecisionIntelligence,
    marketRealityIntelligence: r.marketRealityIntelligence,
    row: r.row,
  }));
}

export { MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV };
