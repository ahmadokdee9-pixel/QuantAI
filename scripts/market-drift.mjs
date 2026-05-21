/**
 * P5.8 — Market drift ≤ 1.0.
 * Usage: npm run test:market-drift
 */
import { MARKET_MAX_DELTA, MARKET_MAX_DRIFT } from "../lib/market/marketFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_BOUNDED_ENV, runMarketPartitions } from "./lib/marketRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMarketPartitions(MARKET_BOUNDED_ENV);

for (const { trayId, marketIntelligence: m } of rows) {
  const ok =
    m.marketDelta <= MARKET_MAX_DELTA &&
    m.analytics.topDriftCount <= MARKET_MAX_DRIFT &&
    !m.monitoring.categoryDrift;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: m.marketDelta, topDrift: m.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${m.marketDelta} topDrift=${m.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "market-drift", phase: "P5.8", pass: failed === 0 }, "market-drift");

if (failed) process.exit(1);
console.log("\nMarket intelligence drift passed");
