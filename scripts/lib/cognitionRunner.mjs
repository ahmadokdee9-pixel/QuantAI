/**
 * P6.0 — Shared cognition validation runner.
 */

import { BEHAVIORAL_BOUNDED_ENV } from "./behavioralRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const COGNITION_BOUNDED_ENV = {
  ...BEHAVIORAL_BOUNDED_ENV,
  COGNITION_ENGINE_ENABLED: "true",
  COGNITION_ENGINE_MODE: "bounded-cognition",
};

export const COGNITION_TELEMETRY_ENV = {
  ...BEHAVIORAL_BOUNDED_ENV,
  NODE_ENV: "production",
  COGNITION_ENGINE_ENABLED: "true",
  COGNITION_ENGINE_MODE: "telemetry-only",
};

export function runCognitionPartitions(env = COGNITION_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    cognitionEngine: r.cognitionEngine,
    behavioralCommerce: r.behavioralCommerce,
    row: r.row,
  }));
}
