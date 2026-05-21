/**
 * P5.7 — Strategy stability + emergency shutdown.
 * Usage: npm run test:strategy-stability
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { STRATEGY_BOUNDED_ENV, runStrategyPartitions } from "./lib/strategyRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runStrategyPartitions(STRATEGY_BOUNDED_ENV);

for (const { trayId, strategyIntelligence: s } of rows) {
  const ok = s.strategyScore >= 30 && s.strategyConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${s.strategyScore} confidence=${s.strategyConfidence}`);
  } else {
    console.log(`OK ${trayId} score=${s.strategyScore} confidence=${s.strategyConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...STRATEGY_BOUNDED_ENV, STRATEGY_INTELLIGENCE_EMERGENCY_SHUTDOWN: "true" };
const shutdownRow = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv);
if (shutdownRow.strategyIntelligence.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "strategy-stability", phase: "P5.7", pass: failed === 0 }, "strategy-stability");

if (failed) process.exit(1);
console.log("\nStrategy intelligence stability passed");
