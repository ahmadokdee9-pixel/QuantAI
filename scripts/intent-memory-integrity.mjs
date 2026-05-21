/**
 * P5.2 — Trust, suppression, diversity integrity.
 * Usage: npm run test:intent-memory-integrity
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORY_BOUNDED_ENV, MEMORY_TELEMETRY_ENV, runMemoryPartitions } from "./lib/intentMemoryRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMemoryPartitions(MEMORY_BOUNDED_ENV);

for (const { trayId, memory: m } of rows) {
  const ok =
    m.analytics.trustStabilizationAnalytics >= 45 &&
    m.analytics.suppressionRecoveryAnalytics >= 55 &&
    m.analytics.rankingContinuityAnalytics >= 40 &&
    !m.monitoring.memoryInflation;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m.analytics);
  } else {
    console.log(`OK ${trayId} trust=${m.analytics.trustStabilizationAnalytics} suppression=${m.analytics.suppressionRecoveryAnalytics}`);
  }
}

clearIntentMemoryStore();
const prod = runMemoryPartitions(MEMORY_TELEMETRY_ENV);
const blockedOk =
  prod[0].memory.memoryWarnings.includes("production_memory_blocked") || !prod[0].memory.mutationApplied;
if (!blockedOk) {
  failed += 1;
  console.error("FAIL production memory blocked");
} else {
  console.log("OK production memory blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "intent-memory-integrity", phase: "P5.2", pass: failed === 0 }, "intent-memory-integrity");

if (failed) process.exit(1);
console.log("\nIntent memory integrity passed");
