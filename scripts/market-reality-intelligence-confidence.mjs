/**
 * P6.5 — Market reality intelligence confidence validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV, runMarketRealityPartitions } from "./lib/marketRealityRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, marketRealityIntelligence: m } of runMarketRealityPartitions(MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV)) {
  const ok = m.realityConfidence >= 0.3 && m.realityConfidence <= 1;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${m.realityConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${m.realityConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "market-reality-intelligence-confidence", phase: "P6.5", pass: failed === 0 }, "market-reality-intelligence-confidence");
if (failed) process.exit(1);
console.log("\nMarket reality intelligence confidence passed");
