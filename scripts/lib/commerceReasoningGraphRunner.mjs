/**
 * P6.7 — Autonomous commerce reasoning graph evaluation runner.
 */
import { COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV } from "./commerceDecisionRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV = {
  ...COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV,
  AUTONOMOUS_COMMERCE_REASONING_GRAPH_ENABLED: "true",
  AUTONOMOUS_COMMERCE_REASONING_GRAPH_MODE: "bounded-graph",
};

export const AUTONOMOUS_COMMERCE_REASONING_GRAPH_TELEMETRY_ENV = {
  ...COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV,
  NODE_ENV: "production",
  AUTONOMOUS_COMMERCE_REASONING_GRAPH_ENABLED: "true",
  AUTONOMOUS_COMMERCE_REASONING_GRAPH_MODE: "telemetry-only",
};

export function runCommerceReasoningGraphPartitions(env = AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    autonomousCommerceReasoningGraph: r.autonomousCommerceReasoningGraph,
    commerceDecisionIntelligence: r.commerceDecisionIntelligence,
    row: r.row,
  }));
}

export { COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV };
