/**
 * P5.9 — Shared behavioral validation runner.
 */

import { MARKET_BOUNDED_ENV } from "./marketRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const BEHAVIORAL_BOUNDED_ENV = {
  ...MARKET_BOUNDED_ENV,
  BEHAVIORAL_COMMERCE_ENABLED: "true",
  BEHAVIORAL_COMMERCE_MODE: "bounded-behavioral",
};

export const BEHAVIORAL_TELEMETRY_ENV = {
  ...MARKET_BOUNDED_ENV,
  NODE_ENV: "production",
  BEHAVIORAL_COMMERCE_ENABLED: "true",
  BEHAVIORAL_COMMERCE_MODE: "telemetry-only",
};

export function runBehavioralPartitions(env = BEHAVIORAL_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    behavioralCommerce: r.behavioralCommerce,
    marketIntelligence: r.marketIntelligence,
    row: r.row,
  }));
}
