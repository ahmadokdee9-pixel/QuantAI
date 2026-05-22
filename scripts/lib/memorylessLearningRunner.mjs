/**
 * P6.4 — Shared memoryless commerce learning validation runner.
 */
import { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV } from "./strategicRankingRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV = {
  ...ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV,
  MEMORYLESS_COMMERCE_LEARNING_ENABLED: "true",
  MEMORYLESS_COMMERCE_LEARNING_MODE: "bounded-learning",
};

export const MEMORYLESS_COMMERCE_LEARNING_TELEMETRY_ENV = {
  ...ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV,
  NODE_ENV: "production",
  MEMORYLESS_COMMERCE_LEARNING_ENABLED: "true",
  MEMORYLESS_COMMERCE_LEARNING_MODE: "telemetry-only",
};

export function runMemorylessLearningPartitions(env = MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    memorylessCommerceLearning: r.memorylessCommerceLearning,
    adaptiveStrategicRanking: r.adaptiveStrategicRanking,
    row: r.row,
  }));
}
