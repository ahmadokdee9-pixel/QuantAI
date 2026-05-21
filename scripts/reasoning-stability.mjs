/**
 * P5.5 — Reasoning stability + emergency shutdown.
 * Usage: npm run test:reasoning-stability
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { REASONING_BOUNDED_ENV, runReasoningPartitions } from "./lib/reasoningRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runReasoningPartitions(REASONING_BOUNDED_ENV);

for (const { trayId, adaptiveReasoning: r } of rows) {
  const ok = r.reasoningScore >= 30 && r.reasoningConfidence >= 0.3 && r.monitoring.commerceReasoningValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${r.reasoningScore} confidence=${r.reasoningConfidence}`);
  } else {
    console.log(`OK ${trayId} score=${r.reasoningScore} confidence=${r.reasoningConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...REASONING_BOUNDED_ENV, ADAPTIVE_REASONING_EMERGENCY_SHUTDOWN: "true" };
const shutdownRow = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv);
if (shutdownRow.adaptiveReasoning.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "reasoning-stability", phase: "P5.5", pass: failed === 0 }, "reasoning-stability");

if (failed) process.exit(1);
console.log("\nAdaptive reasoning stability passed");
