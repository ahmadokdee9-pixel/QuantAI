/**
 * P6.3 — Shared adaptive strategic ranking validation runner.
 */
import { MULTI_OBJECTIVE_BOUNDED_ENV } from "./multiObjectiveRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV = {
  ...MULTI_OBJECTIVE_BOUNDED_ENV,
  ADAPTIVE_STRATEGIC_RANKING_ENABLED: "true",
  ADAPTIVE_STRATEGIC_RANKING_MODE: "bounded-strategic",
};

export const ADAPTIVE_STRATEGIC_RANKING_TELEMETRY_ENV = {
  ...MULTI_OBJECTIVE_BOUNDED_ENV,
  NODE_ENV: "production",
  ADAPTIVE_STRATEGIC_RANKING_ENABLED: "true",
  ADAPTIVE_STRATEGIC_RANKING_MODE: "telemetry-only",
};

export function runStrategicRankingPartitions(env = ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    adaptiveStrategicRanking: r.adaptiveStrategicRanking,
    multiObjectiveCommerce: r.multiObjectiveCommerce,
    row: r.row,
  }));
}
