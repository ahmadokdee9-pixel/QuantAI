/**
 * P5.5 — Reasoning drift ≤ 1.0.
 * Usage: npm run test:reasoning-drift
 */
import { REASONING_MAX_DELTA, REASONING_MAX_DRIFT } from "../lib/reasoning/reasoningFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { REASONING_BOUNDED_ENV, runReasoningPartitions } from "./lib/reasoningRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runReasoningPartitions(REASONING_BOUNDED_ENV);

for (const { trayId, adaptiveReasoning: r } of rows) {
  const ok =
    r.reasoningDelta <= REASONING_MAX_DELTA &&
    r.analytics.topDriftCount <= REASONING_MAX_DRIFT &&
    !r.monitoring.rankingDrift;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: r.reasoningDelta, topDrift: r.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${r.reasoningDelta} topDrift=${r.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "reasoning-drift", phase: "P5.5", pass: failed === 0 }, "reasoning-drift");

if (failed) process.exit(1);
console.log("\nAdaptive reasoning drift passed");
