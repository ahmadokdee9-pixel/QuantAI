/**
 * P5.2 — Memory drift ≤ 1.5.
 * Usage: npm run test:intent-memory-drift
 */
import { INTENT_MEMORY_MAX_DELTA, INTENT_MEMORY_MAX_DRIFT } from "../lib/intent/intentMemoryFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORY_BOUNDED_ENV, runMemoryPartitions } from "./lib/intentMemoryRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMemoryPartitions(MEMORY_BOUNDED_ENV);

for (const { trayId, memory: m } of rows) {
  const ok =
    m.memoryDelta <= INTENT_MEMORY_MAX_DELTA &&
    m.analytics.topDriftCount <= INTENT_MEMORY_MAX_DRIFT &&
    !m.monitoring.continuityDrift;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: m.memoryDelta, topDrift: m.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${m.memoryDelta} topDrift=${m.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-memory-drift", phase: "P5.2", pass: failed === 0 }, "intent-memory-drift");

if (failed) process.exit(1);
console.log("\nIntent memory drift passed");
