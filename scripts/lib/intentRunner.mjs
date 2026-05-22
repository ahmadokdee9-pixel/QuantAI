/**
 * P6.1 — Shared intent cognition validation runner.
 */

import { COGNITION_BOUNDED_ENV } from "./cognitionRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const INTENT_COGNITION_BOUNDED_ENV = {
  ...COGNITION_BOUNDED_ENV,
  INTENT_COGNITION_ENABLED: "true",
  INTENT_COGNITION_MODE: "bounded-intent",
};

export const INTENT_COGNITION_TELEMETRY_ENV = {
  ...COGNITION_BOUNDED_ENV,
  NODE_ENV: "production",
  INTENT_COGNITION_ENABLED: "true",
  INTENT_COGNITION_MODE: "telemetry-only",
};

export function runIntentCognitionPartitions(env = INTENT_COGNITION_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    intentCognition: r.intentCognition,
    cognitionEngine: r.cognitionEngine,
    row: r.row,
  }));
}
