/**
 * P5.8 — Market confidence stability.
 * Usage: npm run test:market-confidence
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_BOUNDED_ENV, runMarketPartitions } from "./lib/marketRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMarketPartitions(MARKET_BOUNDED_ENV);

for (const { trayId, marketIntelligence: m } of rows) {
  const ok =
    m.marketConfidence >= 0.3 &&
    m.marketConfidence <= 1 &&
    m.analytics.pricingAnalytics >= 0 &&
    !m.monitoring.momentumInflation;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${m.marketConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${m.marketConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "market-confidence", phase: "P5.8", pass: failed === 0 }, "market-confidence");

if (failed) process.exit(1);
console.log("\nMarket intelligence confidence passed");
