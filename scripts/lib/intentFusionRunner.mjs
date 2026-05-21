/**
 * P5.4 — Shared fusion validation runner.
 */

import { COORDINATION_BOUNDED_ENV } from "./intentCoordinationRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const FUSION_BOUNDED_ENV = {
  ...COORDINATION_BOUNDED_ENV,
  INTENT_FUSION_ENABLED: "true",
  INTENT_FUSION_MODE: "bounded-fusion",
};

export const FUSION_TELEMETRY_ENV = {
  ...COORDINATION_BOUNDED_ENV,
  NODE_ENV: "production",
  INTENT_FUSION_ENABLED: "true",
  INTENT_FUSION_MODE: "telemetry-only",
};

export function runFusionPartitions(env = FUSION_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    fusion: r.fusion,
    coordination: r.coordination,
    memory: r.memory,
    row: r.row,
  }));
}
