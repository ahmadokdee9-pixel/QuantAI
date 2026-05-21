/**
 * P5.3 — Coordination stability + emergency shutdown.
 * Usage: npm run test:intent-coordination-stability
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COORDINATION_BOUNDED_ENV, runCoordinationPartitions } from "./lib/intentCoordinationRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCoordinationPartitions(COORDINATION_BOUNDED_ENV);

for (const { trayId, coordination: c } of rows) {
  const ok = c.reasoningStability >= 40 && c.graphIntegrity >= 50;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} stability=${c.reasoningStability} graph=${c.graphIntegrity}`);
  } else {
    console.log(`OK ${trayId} stability=${c.reasoningStability} graph=${c.graphIntegrity}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = {
  ...COORDINATION_BOUNDED_ENV,
  INTENT_COORDINATION_EMERGENCY_SHUTDOWN: "true",
};
const shutdownRow = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv);
if (shutdownRow.coordination.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "intent-coordination-stability", phase: "P5.3", pass: failed === 0 }, "intent-coordination-stability");

if (failed) process.exit(1);
console.log("\nIntent coordination stability passed");
