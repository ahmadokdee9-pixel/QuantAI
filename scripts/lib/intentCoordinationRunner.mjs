/**
 * P5.3 — Shared coordination validation runner.
 */

import { MEMORY_BOUNDED_ENV } from "./intentMemoryRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const COORDINATION_BOUNDED_ENV = {
  ...MEMORY_BOUNDED_ENV,
  INTENT_COORDINATION_ENABLED: "true",
  INTENT_COORDINATION_MODE: "bounded-coordination",
};

export const COORDINATION_TELEMETRY_ENV = {
  ...MEMORY_BOUNDED_ENV,
  NODE_ENV: "production",
  INTENT_COORDINATION_ENABLED: "true",
  INTENT_COORDINATION_MODE: "telemetry-only",
};

export function runCoordinationPartitions(env = COORDINATION_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    coordination: r.coordination,
    memory: r.memory,
    orchestration: r.orchestration,
    row: r.row,
  }));
}
