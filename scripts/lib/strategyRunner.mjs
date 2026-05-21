/**
 * P5.7 — Shared strategy validation runner.
 */

import { DECISION_BOUNDED_ENV } from "./decisionRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const STRATEGY_BOUNDED_ENV = {
  ...DECISION_BOUNDED_ENV,
  STRATEGY_INTELLIGENCE_ENABLED: "true",
  STRATEGY_INTELLIGENCE_MODE: "bounded-strategy",
};

export const STRATEGY_TELEMETRY_ENV = {
  ...DECISION_BOUNDED_ENV,
  NODE_ENV: "production",
  STRATEGY_INTELLIGENCE_ENABLED: "true",
  STRATEGY_INTELLIGENCE_MODE: "telemetry-only",
};

export function runStrategyPartitions(env = STRATEGY_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    strategyIntelligence: r.strategyIntelligence,
    decisionIntelligence: r.decisionIntelligence,
    adaptiveReasoning: r.adaptiveReasoning,
    row: r.row,
  }));
}
