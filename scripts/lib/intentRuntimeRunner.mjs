/**
 * P5.0 — Shared runtime validation runner.
 */

import {
  EVAL_CANARY_ENV,
  INTENT_LIVE_PARTITIONS,
  runIntentEvaluationPartition,
  runIntentEvaluationPartitions,
} from "./intentEvaluationRunner.mjs";

export { EVAL_CANARY_ENV, INTENT_LIVE_PARTITIONS, runIntentEvaluationPartition, runIntentEvaluationPartitions };

/** Non-production bounded runtime apply for validation. */
export const RUNTIME_BOUNDED_ENV = {
  ...EVAL_CANARY_ENV,
  NODE_ENV: "development",
  INTENT_RUNTIME_ENABLED: "true",
  INTENT_RUNTIME_MODE: "bounded-apply",
  INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
};

/** Telemetry-only mode (production-safe default behavior). */
export const RUNTIME_TELEMETRY_ENV = {
  ...EVAL_CANARY_ENV,
  NODE_ENV: "production",
  INTENT_RUNTIME_ENABLED: "true",
  INTENT_RUNTIME_MODE: "telemetry-only",
};

export function runRuntimePartitions(env = RUNTIME_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    runtime: r.runtime,
    row: r.row,
  }));
}

export function runRuntimePartition(part, env = RUNTIME_BOUNDED_ENV) {
  const row = runIntentEvaluationPartition(part, env);
  return { trayId: part.id, runtime: row.runtime, row };
}
