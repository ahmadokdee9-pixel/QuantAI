/**
 * P5.2 — Memory stability and emergency shutdown.
 * Usage: npm run test:intent-memory-stability
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORY_BOUNDED_ENV, runMemoryPartitions } from "./lib/intentMemoryRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMemoryPartitions(MEMORY_BOUNDED_ENV);

for (const { trayId, memory: m } of rows) {
  const ok =
    m.stabilizationMemoryScore >= 45 &&
    m.monitoring.deterministicRebuildValid &&
    !m.monitoring.memoryInstability;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { stabilization: m.stabilizationMemoryScore, monitoring: m.monitoring });
  } else {
    console.log(`OK ${trayId} stabilization=${m.stabilizationMemoryScore}`);
  }
}

process.env.INTENT_MEMORY_EMERGENCY_SHUTDOWN = "true";
process.env.INTENT_MEMORY_ENABLED = "true";
process.env.INTENT_MEMORY_MODE = "bounded-memory";
const { applyControlledIntentMemory } = await import("../lib/intent/intentMemory.ts");
const { buildCanonicalQuery } = await import("../lib/search/canonicalQuery.ts");
const sample = rows[0];
const shutdown = applyControlledIntentMemory({
  products: sample.row.orchestrationProducts ?? sample.row.products,
  query: sample.row.query,
  canonicalQuery: buildCanonicalQuery(sample.row.query),
  governance: sample.row.governance,
  calibration: sample.row.calibration,
  runtime: sample.row.runtime,
  orchestration: sample.row.orchestration,
  trayId: sample.trayId,
});
delete process.env.INTENT_MEMORY_EMERGENCY_SHUTDOWN;

if (shutdown.meta.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown", shutdown.meta);
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "intent-memory-stability", phase: "P5.2", pass: failed === 0 }, "intent-memory-stability");

if (failed) process.exit(1);
console.log("\nIntent memory stability passed");
