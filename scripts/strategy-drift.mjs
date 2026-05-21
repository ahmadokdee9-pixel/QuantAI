/**
 * P5.7 — Strategy drift ≤ 1.0.
 * Usage: npm run test:strategy-drift
 */
import { STRATEGY_MAX_DELTA, STRATEGY_MAX_DRIFT } from "../lib/strategy/strategyFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { STRATEGY_BOUNDED_ENV, runStrategyPartitions } from "./lib/strategyRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runStrategyPartitions(STRATEGY_BOUNDED_ENV);

for (const { trayId, strategyIntelligence: s } of rows) {
  const ok =
    s.strategyDelta <= STRATEGY_MAX_DELTA &&
    s.analytics.topDriftCount <= STRATEGY_MAX_DRIFT &&
    !s.monitoring.categoryDrift;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: s.strategyDelta, topDrift: s.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${s.strategyDelta} topDrift=${s.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "strategy-drift", phase: "P5.7", pass: failed === 0 }, "strategy-drift");

if (failed) process.exit(1);
console.log("\nStrategy intelligence drift passed");
