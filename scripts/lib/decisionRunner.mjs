/**
 * P5.6 — Shared decision validation runner.
 */

import { REASONING_BOUNDED_ENV } from "./reasoningRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const DECISION_BOUNDED_ENV = {
  ...REASONING_BOUNDED_ENV,
  DECISION_INTELLIGENCE_ENABLED: "true",
  DECISION_INTELLIGENCE_MODE: "bounded-decision",
};

export const DECISION_TELEMETRY_ENV = {
  ...REASONING_BOUNDED_ENV,
  NODE_ENV: "production",
  DECISION_INTELLIGENCE_ENABLED: "true",
  DECISION_INTELLIGENCE_MODE: "telemetry-only",
};

export function runDecisionPartitions(env = DECISION_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    decisionIntelligence: r.decisionIntelligence,
    adaptiveReasoning: r.adaptiveReasoning,
    row: r.row,
  }));
}
