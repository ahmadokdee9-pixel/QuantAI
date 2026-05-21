/**
 * P5.5 — Reasoning confidence stability.
 * Usage: npm run test:reasoning-confidence
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { REASONING_BOUNDED_ENV, runReasoningPartitions } from "./lib/reasoningRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runReasoningPartitions(REASONING_BOUNDED_ENV);

for (const { trayId, adaptiveReasoning: r } of rows) {
  const ok =
    r.reasoningConfidence >= 0.3 &&
    r.reasoningConfidence <= 1 &&
    r.analytics.reasoningConfidenceAnalytics >= 30 &&
    !r.monitoring.confidenceInflation;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${r.reasoningConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${r.reasoningConfidence} analytics=${r.analytics.reasoningConfidenceAnalytics}`);
  }
}

saveLiveObservabilityRun({ suite: "reasoning-confidence", phase: "P5.5", pass: failed === 0 }, "reasoning-confidence");

if (failed) process.exit(1);
console.log("\nAdaptive reasoning confidence passed");
