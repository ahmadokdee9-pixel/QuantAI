/**
 * P5.8 — Market routing lanes validation.
 * Usage: npm run test:market-routing
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_BOUNDED_ENV, runMarketPartitions } from "./lib/marketRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "compare",
  "strategic-balance",
  "conversion-check",
  "momentum-check",
  "replay-protect",
  "commerce-safe",
  "category-priority",
  "volatility-check",
  "trust-check",
]);

clearIntentMemoryStore();
let failed = 0;
const rows = runMarketPartitions(MARKET_BOUNDED_ENV);

for (const { trayId, marketIntelligence: m } of rows) {
  const replayOk = m.analytics.replayIntegrityAnalytics >= 60 && m.monitoring.replayIntegrityValid;
  const ok = VALID_LANES.has(m.routingLane) && replayOk;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${m.routingLane} replay=${m.analytics.replayIntegrityAnalytics}`);
  } else {
    console.log(`OK ${trayId} lane=${m.routingLane} replay=${m.analytics.replayIntegrityAnalytics} graph=${m.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "market-routing", phase: "P5.8", pass: failed === 0 }, "market-routing");

if (failed) process.exit(1);
console.log("\nMarket intelligence routing passed");
