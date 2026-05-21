/**
 * P5.7 — Strategy balancing (trust/value, continuity, recommendation).
 * Usage: npm run test:strategy-balance
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { STRATEGY_BOUNDED_ENV, runStrategyPartitions } from "./lib/strategyRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runStrategyPartitions(STRATEGY_BOUNDED_ENV);

for (const { trayId, strategyIntelligence: s } of rows) {
  const ok =
    s.analytics.strategicTrustValueAnalytics >= 1 &&
    s.analytics.conversionAnalytics >= 0 &&
    !s.monitoring.categoryDrift &&
    s.monitoring.recommendationStability;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      trustValue: s.analytics.strategicTrustValueAnalytics,
      conversion: s.analytics.conversionAnalytics,
    });
  } else {
    console.log(`OK ${trayId} trustValue=${s.analytics.strategicTrustValueAnalytics} continuity=${s.continuityStrength}`);
  }
}

saveLiveObservabilityRun({ suite: "strategy-balance", phase: "P5.7", pass: failed === 0 }, "strategy-balance");

if (failed) process.exit(1);
console.log("\nStrategy intelligence balance passed");
