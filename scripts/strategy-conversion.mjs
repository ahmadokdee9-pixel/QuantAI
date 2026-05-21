/**
 * P5.7 — Conversion-quality stability under strategy layer.
 * Usage: npm run test:strategy-conversion
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { STRATEGY_BOUNDED_ENV, runStrategyPartitions } from "./lib/strategyRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runStrategyPartitions(STRATEGY_BOUNDED_ENV);

for (const { trayId, strategyIntelligence: s } of rows) {
  const ok =
    s.conversionConfidence >= 0.2 &&
    s.conversionConfidence <= 1 &&
    s.analytics.conversionAnalytics >= 0 &&
    !s.monitoring.conversionInflation;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} conversion=${s.conversionConfidence}`);
  } else {
    console.log(`OK ${trayId} conversion=${s.conversionConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "strategy-conversion", phase: "P5.7", pass: failed === 0 }, "strategy-conversion");

if (failed) process.exit(1);
console.log("\nStrategy intelligence conversion passed");
