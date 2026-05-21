/**
 * P5.2 — Shared memory validation runner.
 */

import { ORCHESTRATION_BOUNDED_ENV } from "./intentOrchestrationRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const MEMORY_BOUNDED_ENV = {
  ...ORCHESTRATION_BOUNDED_ENV,
  INTENT_MEMORY_ENABLED: "true",
  INTENT_MEMORY_MODE: "bounded-memory",
};

export const MEMORY_TELEMETRY_ENV = {
  ...ORCHESTRATION_BOUNDED_ENV,
  NODE_ENV: "production",
  INTENT_MEMORY_ENABLED: "true",
  INTENT_MEMORY_MODE: "telemetry-only",
};

export function runMemoryPartitions(env = MEMORY_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    memory: r.memory,
    orchestration: r.orchestration,
    row: r.row,
  }));
}
