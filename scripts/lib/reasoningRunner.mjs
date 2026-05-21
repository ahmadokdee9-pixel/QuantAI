/**
 * P5.5 — Shared reasoning validation runner.
 */

import { FUSION_BOUNDED_ENV } from "./intentFusionRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const REASONING_BOUNDED_ENV = {
  ...FUSION_BOUNDED_ENV,
  ADAPTIVE_REASONING_ENABLED: "true",
  ADAPTIVE_REASONING_MODE: "bounded-reasoning",
};

export const REASONING_TELEMETRY_ENV = {
  ...FUSION_BOUNDED_ENV,
  NODE_ENV: "production",
  ADAPTIVE_REASONING_ENABLED: "true",
  ADAPTIVE_REASONING_MODE: "telemetry-only",
};

export function runReasoningPartitions(env = REASONING_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    adaptiveReasoning: r.adaptiveReasoning,
    fusion: r.fusion,
    row: r.row,
  }));
}
