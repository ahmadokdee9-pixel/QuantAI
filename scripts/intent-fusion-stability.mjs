/**
 * P5.4 — Fusion stability + emergency shutdown.
 * Usage: npm run test:intent-fusion-stability
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { FUSION_BOUNDED_ENV, runFusionPartitions } from "./lib/intentFusionRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runFusionPartitions(FUSION_BOUNDED_ENV);

for (const { trayId, fusion: f } of rows) {
  const ok = f.fusionScore >= 30 && f.fusionConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${f.fusionScore} confidence=${f.fusionConfidence}`);
  } else {
    console.log(`OK ${trayId} score=${f.fusionScore} confidence=${f.fusionConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = {
  ...FUSION_BOUNDED_ENV,
  INTENT_FUSION_EMERGENCY_SHUTDOWN: "true",
};
const shutdownRow = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv);
if (shutdownRow.fusion.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "intent-fusion-stability", phase: "P5.4", pass: failed === 0 }, "intent-fusion-stability");

if (failed) process.exit(1);
console.log("\nIntent fusion stability passed");
