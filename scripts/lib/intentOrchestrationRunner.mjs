/**
 * P5.1 — Shared orchestration validation runner.
 */

import { RUNTIME_BOUNDED_ENV } from "./intentRuntimeRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const ORCHESTRATION_BOUNDED_ENV = {
  ...RUNTIME_BOUNDED_ENV,
  INTENT_ORCHESTRATION_ENABLED: "true",
  INTENT_ORCHESTRATION_MODE: "bounded-orchestration",
};

export const ORCHESTRATION_TELEMETRY_ENV = {
  ...RUNTIME_BOUNDED_ENV,
  NODE_ENV: "production",
  INTENT_ORCHESTRATION_ENABLED: "true",
  INTENT_ORCHESTRATION_MODE: "telemetry-only",
};

export function runOrchestrationPartitions(env = ORCHESTRATION_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    orchestration: r.orchestration,
    runtime: r.runtime,
    row: r.row,
  }));
}
