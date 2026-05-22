/**
 * P6.2 — Shared multi-objective commerce validation runner.
 */
import { INTENT_COGNITION_BOUNDED_ENV } from "./intentRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const MULTI_OBJECTIVE_BOUNDED_ENV = {
  ...INTENT_COGNITION_BOUNDED_ENV,
  MULTI_OBJECTIVE_COMMERCE_ENABLED: "true",
  MULTI_OBJECTIVE_COMMERCE_MODE: "bounded-multi-objective",
};

export const MULTI_OBJECTIVE_TELEMETRY_ENV = {
  ...INTENT_COGNITION_BOUNDED_ENV,
  NODE_ENV: "production",
  MULTI_OBJECTIVE_COMMERCE_ENABLED: "true",
  MULTI_OBJECTIVE_COMMERCE_MODE: "telemetry-only",
};

export function runMultiObjectivePartitions(env = MULTI_OBJECTIVE_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    multiObjectiveCommerce: r.multiObjectiveCommerce,
    intentCognition: r.intentCognition,
    row: r.row,
  }));
}
