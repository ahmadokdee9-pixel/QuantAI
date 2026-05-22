/**
 * P6.5 — Market reality intelligence routing validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV, runMarketRealityPartitions } from "./lib/marketRealityRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "discount-check",
  "retailer-check",
  "volatility-check",
  "listing-check",
  "marketplace-check",
  "trust-check",
  "inventory-check",
  "offer-check",
  "signal-check",
  "pricing-safe",
  "replay-protect",
]);

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, marketRealityIntelligence: m } of runMarketRealityPartitions(MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV)) {
  const ok = VALID_LANES.has(m.routingLane) && m.analytics.replayIntegrityAnalytics >= 60 && m.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${m.routingLane}`);
  } else {
    console.log(`OK ${trayId} lane=${m.routingLane} graph=${m.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "market-reality-intelligence-routing", phase: "P6.5", pass: failed === 0 }, "market-reality-intelligence-routing");
if (failed) process.exit(1);
console.log("\nMarket reality intelligence routing passed");
