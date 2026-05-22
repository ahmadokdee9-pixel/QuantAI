/**
 * P6.5 — Market reality intelligence evaluation runner.
 */
import { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV } from "./strategicRankingRunner.mjs";
import { MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV } from "./memorylessLearningRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV = {
  ...MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV,
  MARKET_REALITY_INTELLIGENCE_ENABLED: "true",
  MARKET_REALITY_INTELLIGENCE_MODE: "bounded-reality",
};

export const MARKET_REALITY_INTELLIGENCE_TELEMETRY_ENV = {
  ...MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV,
  NODE_ENV: "production",
  MARKET_REALITY_INTELLIGENCE_ENABLED: "true",
  MARKET_REALITY_INTELLIGENCE_MODE: "telemetry-only",
};

export function runMarketRealityPartitions(env = MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    marketRealityIntelligence: r.marketRealityIntelligence,
    memorylessCommerceLearning: r.memorylessCommerceLearning,
    row: r.row,
  }));
}

export { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV, MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV };
