/**
 * P6.5 — Market reality intelligence drift validation.
 */
import { MARKET_REALITY_MAX_DELTA, MARKET_REALITY_MAX_DRIFT } from "../lib/marketReality/marketRealityFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV, runMarketRealityPartitions } from "./lib/marketRealityRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, marketRealityIntelligence: m } of runMarketRealityPartitions(MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV)) {
  const pass = m.realityDelta <= MARKET_REALITY_MAX_DELTA && m.analytics.topDriftCount <= MARKET_REALITY_MAX_DRIFT;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: m.realityDelta, topDrift: m.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${m.realityDelta} topDrift=${m.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "market-reality-intelligence-drift", phase: "P6.5", pass: failed === 0 }, "market-reality-intelligence-drift");
if (failed) process.exit(1);
console.log("\nMarket reality intelligence drift passed");
