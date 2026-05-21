/**
 * P5.7 — Strategy routing lanes validation.
 * Usage: npm run test:strategy-routing
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { STRATEGY_BOUNDED_ENV, runStrategyPartitions } from "./lib/strategyRunner.mjs";

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
]);

clearIntentMemoryStore();
let failed = 0;
const rows = runStrategyPartitions(STRATEGY_BOUNDED_ENV);

for (const { trayId, strategyIntelligence: s } of rows) {
  const ok = VALID_LANES.has(s.routingLane) && s.replayIntegrity >= 60 && s.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${s.routingLane} replay=${s.replayIntegrity}`);
  } else {
    console.log(`OK ${trayId} lane=${s.routingLane} replay=${s.replayIntegrity} graph=${s.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "strategy-routing", phase: "P5.7", pass: failed === 0 }, "strategy-routing");

if (failed) process.exit(1);
console.log("\nStrategy intelligence routing passed");
