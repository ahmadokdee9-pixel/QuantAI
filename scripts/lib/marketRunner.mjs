/**
 * P5.8 — Shared market validation runner.
 */

import { STRATEGY_BOUNDED_ENV } from "./strategyRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const MARKET_BOUNDED_ENV = {
  ...STRATEGY_BOUNDED_ENV,
  MARKET_INTELLIGENCE_ENABLED: "true",
  MARKET_INTELLIGENCE_MODE: "bounded-market",
};

export const MARKET_TELEMETRY_ENV = {
  ...STRATEGY_BOUNDED_ENV,
  NODE_ENV: "production",
  MARKET_INTELLIGENCE_ENABLED: "true",
  MARKET_INTELLIGENCE_MODE: "telemetry-only",
};

export function runMarketPartitions(env = MARKET_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    marketIntelligence: r.marketIntelligence,
    strategyIntelligence: r.strategyIntelligence,
    row: r.row,
  }));
}
